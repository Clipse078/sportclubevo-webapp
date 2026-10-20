import { mapParticipantsToTemplateSlots } from "./participant-slot-mapping";
import { getProgrammeTemplateById } from "./template-registry";
import { validateProgrammeTemplateIntegrity } from "./template-integrity";
import { formatTemplateSideRef } from "./template-side-ref";
import type {
  InstantiatedTemplateFixturePlan,
  InstantiatedTemplateProgrammePlan,
  ParticipantSlotMapping,
  ResolvedTemplateSide,
  TournamentProgrammeTemplate,
} from "./types";
import type { TournamentParticipantOrderingRow } from "./participant-slot-mapping";

export class ProgrammeTemplateInstantiationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProgrammeTemplateInstantiationError";
    this.code = code;
  }
}

function resolveSideRef(
  ref: { slot: string; subunitIndex?: number },
  slotMapping: ParticipantSlotMapping,
): Omit<ResolvedTemplateSide, "participantUnitId"> {
  const slot = ref.slot as keyof ParticipantSlotMapping;
  const participantId = slotMapping[slot];
  if (!participantId) {
    throw new ProgrammeTemplateInstantiationError(
      "SLOT_UNMAPPED",
      `No participant mapped to template slot ${String(ref.slot)}`,
    );
  }
  return {
    participantId,
    slot: ref.slot as ResolvedTemplateSide["slot"],
    subunitIndex: ref.subunitIndex ?? null,
  };
}

export function buildInstantiatedProgrammePlan(input: {
  template: TournamentProgrammeTemplate;
  slotMapping: ParticipantSlotMapping;
}): InstantiatedTemplateProgrammePlan {
  const integrity = validateProgrammeTemplateIntegrity(input.template);
  if (integrity.length > 0) {
    throw new ProgrammeTemplateInstantiationError(
      "TEMPLATE_INTEGRITY",
      integrity.map((i) => i.message).join("; "),
    );
  }

  const fixtures: InstantiatedTemplateFixturePlan[] = [];
  for (const round of input.template.rounds) {
    let slotIndexInRound = 0;
    for (const assignment of round.assignments) {
      const field = input.template.fields.find((f) => f.fieldKey === assignment.fieldKey);
      if (!field) continue;
      const homePartial = resolveSideRef(assignment.home, input.slotMapping);
      const awayPartial = resolveSideRef(assignment.away, input.slotMapping);
      const generatorKey = JSON.stringify({
        tp02d: true,
        templateId: input.template.id,
        templateVersion: input.template.version,
        roundNumber: round.roundNumber,
        fieldKey: assignment.fieldKey,
        home: formatTemplateSideRef(assignment.home),
        away: formatTemplateSideRef(assignment.away),
      });
      fixtures.push({
        templateId: input.template.id,
        templateVersion: input.template.version,
        slotMapping: input.slotMapping,
        roundIndex: round.roundNumber - 1,
        slotIndexInRound,
        fieldKey: assignment.fieldKey,
        fieldDisplayOrder: field.displayOrder,
        playersPerSide: field.playingFormat.playersPerSide,
        home: {
          ...homePartial,
          participantUnitId: `pending:${homePartial.participantId}:${formatTemplateSideRef(assignment.home)}`,
        },
        away: {
          ...awayPartial,
          participantUnitId: `pending:${awayPartial.participantId}:${formatTemplateSideRef(assignment.away)}`,
        },
        generatorKey,
      });
      slotIndexInRound += 1;
    }
  }

  return {
    template: input.template,
    slotMapping: input.slotMapping,
    fixtures,
    fieldCount: input.template.fields.length,
    roundCount: input.template.rounds.length,
  };
}

export function instantiateProgrammeTemplate(input: {
  templateId: string;
  templateVersion?: number;
  participants: readonly TournamentParticipantOrderingRow[];
}): InstantiatedTemplateProgrammePlan {
  const template = getProgrammeTemplateById(input.templateId, input.templateVersion);
  if (!template) {
    throw new ProgrammeTemplateInstantiationError(
      "TEMPLATE_NOT_FOUND",
      `Unknown programme template: ${input.templateId}`,
    );
  }
  const slotMapping = mapParticipantsToTemplateSlots({
    participants: input.participants,
    participantCount: template.participantCount,
  });
  return buildInstantiatedProgrammePlan({ template, slotMapping });
}

import { doParticipantUnitsOverlapCapacity, toParticipantUnitCapacityRef } from "../participant-unit-capacity";
import { isPlayersPerSideInValidationBand } from "../tournament-programme-architecture";
import { formatTemplateSideRef, parseTemplateSideToken } from "./template-side-ref";
import type { TournamentProgrammeTemplate, TemplateSideRef } from "./types";

export type TemplateIntegrityIssue = {
  code: string;
  message: string;
};

function slotSet(template: TournamentProgrammeTemplate): Set<string> {
  return new Set(template.participantSlots);
}

function collectSideRefs(template: TournamentProgrammeTemplate): TemplateSideRef[] {
  const refs: TemplateSideRef[] = [];
  for (const round of template.rounds) {
    for (const assignment of round.assignments) {
      refs.push(assignment.home, assignment.away);
    }
  }
  return refs;
}

export function validateProgrammeTemplateIntegrity(
  template: TournamentProgrammeTemplate,
): TemplateIntegrityIssue[] {
  const issues: TemplateIntegrityIssue[] = [];
  const slots = slotSet(template);

  if (template.participantSlots.length !== template.participantCount) {
    issues.push({
      code: "SLOT_COUNT",
      message: "participantSlots length must equal participantCount",
    });
  }

  const fieldKeys = new Set(template.fields.map((f) => f.fieldKey));
  if (fieldKeys.size !== template.fields.length) {
    issues.push({ code: "FIELD_DUPLICATE", message: "Duplicate fieldKey in fields" });
  }

  for (const field of template.fields) {
    if (!isPlayersPerSideInValidationBand(field.playingFormat.playersPerSide)) {
      issues.push({
        code: "FIELD_FORMAT",
        message: `Invalid playersPerSide on ${field.fieldKey}`,
      });
    }
  }

  for (const ref of collectSideRefs(template)) {
    if (!slots.has(ref.slot)) {
      issues.push({
        code: "UNKNOWN_SLOT",
        message: `Unknown slot ${ref.slot} in assignment`,
      });
    }
    try {
      parseTemplateSideToken(formatTemplateSideRef(ref));
    } catch {
      issues.push({ code: "SIDE_PARSE", message: "Side ref failed round-trip parse" });
    }
  }

  for (const round of template.rounds) {
    if (round.roundNumber < 1) {
      issues.push({ code: "ROUND_NUMBER", message: "roundNumber must be >= 1" });
    }
    const usedFields = new Set<string>();
    for (const assignment of round.assignments) {
      if (!fieldKeys.has(assignment.fieldKey)) {
        issues.push({
          code: "UNKNOWN_FIELD",
          message: `Unknown field ${assignment.fieldKey} in round ${round.roundNumber}`,
        });
      }
      if (usedFields.has(assignment.fieldKey)) {
        issues.push({
          code: "DUPLICATE_FIELD_IN_ROUND",
          message: `Duplicate field assignment in round ${round.roundNumber}`,
        });
      }
      usedFields.add(assignment.fieldKey);

      const homeKey = formatTemplateSideRef(assignment.home);
      const awayKey = formatTemplateSideRef(assignment.away);
      if (homeKey === awayKey) {
        issues.push({
          code: "SELF_MATCH",
          message: `Self match in round ${round.roundNumber} on ${assignment.fieldKey}`,
        });
      }

      const homeFull = assignment.home.subunitIndex === undefined;
      const awayFull = assignment.away.subunitIndex === undefined;
      if (
        assignment.home.slot === assignment.away.slot &&
        (homeFull ||
          awayFull ||
          assignment.home.subunitIndex === assignment.away.subunitIndex)
      ) {
        issues.push({
          code: "CAPACITY_OVERLAP",
          message: `Invalid simultaneous capacity on ${assignment.fieldKey} round ${round.roundNumber}`,
        });
      }
    }
  }

  // Cross-assignment capacity in same round (same parent slot).
  for (const round of template.rounds) {
    const unitRefs = round.assignments.flatMap((a) => [a.home, a.away]);
    for (let i = 0; i < unitRefs.length; i += 1) {
      for (let j = i + 1; j < unitRefs.length; j += 1) {
        const a = unitRefs[i]!;
        const b = unitRefs[j]!;
        if (a.slot !== b.slot) continue;
        const refA = toParticipantUnitCapacityRef({
          id: formatTemplateSideRef(a),
          tournamentParticipantId: a.slot,
          mode: a.subunitIndex === undefined ? "FULL" : "SUBUNIT",
          capacityPartitionKey: a.subunitIndex === undefined ? null : formatTemplateSideRef(a),
        });
        const refB = toParticipantUnitCapacityRef({
          id: formatTemplateSideRef(b),
          tournamentParticipantId: b.slot,
          mode: b.subunitIndex === undefined ? "FULL" : "SUBUNIT",
          capacityPartitionKey: b.subunitIndex === undefined ? null : formatTemplateSideRef(b),
        });
        if (doParticipantUnitsOverlapCapacity(refA, refB)) {
          issues.push({
            code: "ROUND_CAPACITY_OVERLAP",
            message: `Capacity overlap in round ${round.roundNumber} for slot ${a.slot}`,
          });
        }
      }
    }
  }

  return issues;
}

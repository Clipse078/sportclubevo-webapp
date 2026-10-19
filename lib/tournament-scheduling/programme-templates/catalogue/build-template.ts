import { parseTemplateSideToken, participantSlotsForCount } from "../template-side-ref";
import type {
  ProgrammeTemplateCategoryContext,
  TemplateFieldDefinition,
  TemplateRoundAssignment,
  TemplateRoundDefinition,
  TournamentProgrammeTemplate,
} from "../types";

type RawAssignment = readonly [fieldNumber: number, home: string, away: string];

type RawRound = readonly [roundNumber: number, ...assignments: RawAssignment[]];

function fieldDefs(
  spec: readonly (readonly [number, number])[],
): TemplateFieldDefinition[] {
  return spec.map(([displayOrder, playersPerSide]) => ({
    fieldKey: `FIELD_${displayOrder}`,
    label: `Feld ${displayOrder}`,
    displayOrder,
    playingFormat: { playersPerSide },
  }));
}

function buildRounds(raw: readonly RawRound[]): TemplateRoundDefinition[] {
  return raw.map(([roundNumber, ...assignments]) => ({
    roundNumber,
    assignments: assignments.map(([fieldNumber, home, away]) => {
      const fieldKey = `FIELD_${fieldNumber}`;
      return {
        fieldKey,
        home: parseTemplateSideToken(home),
        away: parseTemplateSideToken(away),
      } satisfies TemplateRoundAssignment;
    }),
  }));
}

export function buildRotationTemplate(input: {
  id: string;
  version: number;
  participantCount: number;
  smallFieldCount: number;
  playersPerSideSmall: number;
  playersPerSideLarge: number;
  rounds: readonly RawRound[];
  breakAfterRoundNumber: number;
  referenceDocumentId: string;
  categoryContext?: ProgrammeTemplateCategoryContext;
}): TournamentProgrammeTemplate {
  const fields: TemplateFieldDefinition[] = [];
  for (let i = 1; i <= input.smallFieldCount; i += 1) {
    fields.push({
      fieldKey: `FIELD_${i}`,
      label: `Feld ${i}`,
      displayOrder: i,
      playingFormat: { playersPerSide: input.playersPerSideSmall },
    });
  }
  for (let i = input.smallFieldCount + 1; i <= input.smallFieldCount + 2; i += 1) {
    fields.push({
      fieldKey: `FIELD_${i}`,
      label: `Feld ${i}`,
      displayOrder: i,
      playingFormat: { playersPerSide: input.playersPerSideLarge },
    });
  }

  return {
    id: input.id,
    version: input.version,
    status: "ACTIVE",
    displayName: `Rotation (${input.participantCount} Teams)`,
    programmeFamily: "YOUTH_ROTATION_MULTI_PITCH",
    categoryContext: input.categoryContext ?? "E_FF12",
    participantCount: input.participantCount,
    participantSlots: participantSlotsForCount(input.participantCount),
    fields,
    rounds: buildRounds(input.rounds),
    breakHints: [{ afterRoundNumber: input.breakAfterRoundNumber, label: "Pause" }],
    operationalHints: [
      {
        kind: "SMALL_FIELD_SUBTEAM_SWITCH",
        switchAfterMinutes: 5,
      },
    ],
    referenceDocumentId: input.referenceDocumentId,
  };
}

export function buildThreeFieldRotationTemplate(input: {
  id: string;
  version: number;
  participantCount: number;
  rounds: readonly RawRound[];
  breakAfterRoundNumber: number;
  referenceDocumentId: string;
  categoryContext?: ProgrammeTemplateCategoryContext;
}): TournamentProgrammeTemplate {
  return {
    id: input.id,
    version: input.version,
    status: "ACTIVE",
    displayName: `Rotation (${input.participantCount} Teams)`,
    programmeFamily: "YOUTH_ROTATION_MULTI_PITCH",
    categoryContext: input.categoryContext ?? "E_FF12",
    participantCount: input.participantCount,
    participantSlots: participantSlotsForCount(input.participantCount),
    fields: fieldDefs([
      [1, 3],
      [2, 3],
      [3, 6],
    ]),
    rounds: buildRounds(input.rounds),
    breakHints: [{ afterRoundNumber: input.breakAfterRoundNumber, label: "Pause" }],
    operationalHints: [
      {
        kind: "SMALL_FIELD_SUBTEAM_SWITCH",
        switchAfterMinutes: 5,
      },
    ],
    referenceDocumentId: input.referenceDocumentId,
  };
}

export function buildFiveFieldRotationTemplate(input: {
  id: string;
  version: number;
  participantCount: number;
  rounds: readonly RawRound[];
  breakAfterRoundNumber: number;
  referenceDocumentId: string;
  categoryContext?: ProgrammeTemplateCategoryContext;
}): TournamentProgrammeTemplate {
  return {
    id: input.id,
    version: input.version,
    status: "ACTIVE",
    displayName: `Rotation (${input.participantCount} Teams)`,
    programmeFamily: "YOUTH_ROTATION_MULTI_PITCH",
    categoryContext: input.categoryContext ?? "E_FF12",
    participantCount: input.participantCount,
    participantSlots: participantSlotsForCount(input.participantCount),
    fields: fieldDefs([
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 6],
      [5, 6],
    ]),
    rounds: buildRounds(input.rounds),
    breakHints: [{ afterRoundNumber: input.breakAfterRoundNumber, label: "Pause" }],
    operationalHints: [
      {
        kind: "SMALL_FIELD_SUBTEAM_SWITCH",
        switchAfterMinutes: 5,
      },
    ],
    referenceDocumentId: input.referenceDocumentId,
  };
}

export function buildSixFieldRotationTemplate(input: {
  id: string;
  version: number;
  participantCount: number;
  rounds: readonly RawRound[];
  breakAfterRoundNumber: number;
  referenceDocumentId: string;
  categoryContext?: ProgrammeTemplateCategoryContext;
}): TournamentProgrammeTemplate {
  return buildRotationTemplate({
    ...input,
    smallFieldCount: 4,
    playersPerSideSmall: 3,
    playersPerSideLarge: 6,
  });
}

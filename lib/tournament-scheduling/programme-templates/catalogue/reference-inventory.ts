import { E_FF12_ROTATION_TEMPLATES } from "./e-ff12-rotation";
import {
  F_CURATED_FIELD_PROPOSAL_PARTICIPANT_COUNTS,
  listFFieldProposalStructures,
} from "./f-field-proposals";
import type { ProgrammeTemplateCategoryContext, TournamentProgrammeTemplate } from "../types";

export type ProgrammeReferenceInventoryRow = {
  category: ProgrammeTemplateCategoryContext;
  participantCount: number;
  fieldCount: number;
  fieldFormats: readonly number[];
  roundCount: number | null;
  breakStructure: string | null;
  playingUnitRequirements: string;
  referenceAvailable: boolean;
  roundsEncoded: boolean;
};

function summarizeFieldFormats(template: TournamentProgrammeTemplate): number[] {
  return [...template.fields]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((f) => f.playingFormat.playersPerSide);
}

function breakLabel(template: TournamentProgrammeTemplate): string {
  if (template.breakHints.length === 0) return "none";
  return template.breakHints
    .map((hint) => `after round ${hint.afterRoundNumber}`)
    .join("; ");
}

export function buildProgrammeReferenceInventory(): readonly ProgrammeReferenceInventoryRow[] {
  const eRows: ProgrammeReferenceInventoryRow[] = E_FF12_ROTATION_TEMPLATES.map((template) => ({
    category: template.categoryContext,
    participantCount: template.participantCount,
    fieldCount: template.fields.length,
    fieldFormats: summarizeFieldFormats(template),
    roundCount: template.rounds.length,
    breakStructure: breakLabel(template),
    playingUnitRequirements: "subunits on small fields where encoded (E/FF12 rotation)",
    referenceAvailable: true,
    roundsEncoded: true,
  }));

  const fRows: ProgrammeReferenceInventoryRow[] = listFFieldProposalStructures().map((row) => ({
    category: "F",
    participantCount: row.participantCount,
    fieldCount: row.fieldCount,
    fieldFormats: row.playingFormats.map((f) => f.playersPerSide),
    roundCount: null,
    breakStructure: null,
    playingUnitRequirements: "per approved F reference (round matrix pending catalogue encode)",
    referenceAvailable: row.referenceAvailable,
    roundsEncoded: row.roundsEncoded,
  }));

  return [...eRows, ...fRows];
}

export const G_CURATED_PARTICIPANT_COUNTS: readonly number[] = [];

export const MISSING_CURATED_COUNTS = {
  E_FF12: [] as number[],
  F: F_CURATED_FIELD_PROPOSAL_PARTICIPANT_COUNTS.filter(
    (count) => !E_FF12_ROTATION_TEMPLATES.some((t) => t.participantCount === count && t.categoryContext === "F"),
  ),
  G: G_CURATED_PARTICIPANT_COUNTS,
} as const;

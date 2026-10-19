import { E_FF12_ROTATION_TEMPLATES } from "./catalogue/e-ff12-rotation";
import type { ProgrammeTemplateFamily, TournamentProgrammeTemplate } from "./types";

const ALL_ACTIVE_TEMPLATES: readonly TournamentProgrammeTemplate[] = [
  ...E_FF12_ROTATION_TEMPLATES,
].filter((t) => t.status === "ACTIVE");

export function listProgrammeTemplates(input?: {
  participantCount?: number;
  programmeFamily?: ProgrammeTemplateFamily;
}): TournamentProgrammeTemplate[] {
  let rows = [...ALL_ACTIVE_TEMPLATES];
  if (input?.participantCount !== undefined) {
    rows = rows.filter((t) => t.participantCount === input.participantCount);
  }
  if (input?.programmeFamily !== undefined) {
    rows = rows.filter((t) => t.programmeFamily === input.programmeFamily);
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export function getProgrammeTemplateById(
  templateId: string,
  version?: number,
): TournamentProgrammeTemplate | null {
  const matches = ALL_ACTIVE_TEMPLATES.filter((t) => t.id === templateId);
  if (matches.length === 0) return null;
  if (version === undefined) {
    return matches.sort((a, b) => b.version - a.version)[0] ?? null;
  }
  return matches.find((t) => t.version === version) ?? null;
}

export function getRecommendedProgrammeTemplate(input: {
  participantCount: number;
  programmeFamily?: ProgrammeTemplateFamily;
}): TournamentProgrammeTemplate | null {
  const candidates = listProgrammeTemplates(input);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;
  // Deterministic: same participant count + family → lexicographically first stable id.
  return candidates[0]!;
}

export function curatedTemplateParticipantCounts(): number[] {
  return [...new Set(ALL_ACTIVE_TEMPLATES.map((t) => t.participantCount))].sort(
    (a, b) => a - b,
  );
}

export const PROGRAMME_TEMPLATE_CATALOGUE = ALL_ACTIVE_TEMPLATES;

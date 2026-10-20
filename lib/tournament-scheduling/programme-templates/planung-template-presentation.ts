import { getRecommendedProgrammeTemplate, listProgrammeTemplates } from "./template-registry";
import type { ProgrammeTemplateCategoryContext, TournamentProgrammeTemplate } from "./types";

export type PlanungProgrammeTemplatePresentation = {
  available: boolean;
  recommended: {
    templateId: string;
    version: number;
    displayName: string;
    programmeFamily: string;
    participantCount: number;
    fieldCount: number;
    roundCount: number;
    fieldCountLabel: string;
    /** Sport-neutral schedule structure — not players-per-side. */
    scheduleRecommendationSummary: string;
  } | null;
  alternatives: readonly {
    templateId: string;
    version: number;
    displayName: string;
  }[];
  fallbackRequired: boolean;
};

export function buildPlanungProgrammeTemplatePresentation(input: {
  participantCount: number;
  categoryContext?: ProgrammeTemplateCategoryContext | null;
}): PlanungProgrammeTemplatePresentation {
  if (input.categoryContext == null) {
    return {
      available: false,
      recommended: null,
      alternatives: [],
      fallbackRequired: true,
    };
  }
  const candidates = listProgrammeTemplates({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (candidates.length === 0) {
    return {
      available: false,
      recommended: null,
      alternatives: [],
      fallbackRequired: true,
    };
  }
  const recommended = getRecommendedProgrammeTemplate({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (!recommended) {
    return {
      available: false,
      recommended: null,
      alternatives: [],
      fallbackRequired: true,
    };
  }
  return {
    available: true,
    recommended: {
      templateId: recommended.id,
      version: recommended.version,
      displayName: recommended.displayName,
      programmeFamily: recommended.programmeFamily,
      participantCount: recommended.participantCount,
      fieldCount: recommended.fields.length,
      roundCount: recommended.rounds.length,
      fieldCountLabel: `Vorschlag: ${recommended.fields.length} Spielfelder · ${recommended.rounds.length} Runden`,
      scheduleRecommendationSummary: `${recommended.fields.length} Spielfelder · ${recommended.rounds.length} Runden`,
    },
    alternatives: candidates
      .filter((c) => c.id !== recommended.id)
      .map((c) => ({
        templateId: c.id,
        version: c.version,
        displayName: c.displayName,
      })),
    fallbackRequired: false,
  };
}

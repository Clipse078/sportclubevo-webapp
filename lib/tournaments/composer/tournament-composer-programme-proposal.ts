import { resolveFFieldProposalStructure } from "@/lib/tournament-scheduling/programme-templates/catalogue/f-field-proposals";
import { getRecommendedProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/template-registry";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentComposerPitchDraft } from "./tournament-composer-planner-types";

export type ComposerProgrammeProposalKind = "FULL_TEMPLATE" | "FIELD_PROPOSAL_ONLY" | "NONE";

export type ComposerProgrammeProposal = {
  kind: ComposerProgrammeProposalKind;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  template: TournamentProgrammeTemplate | null;
  /** When kind === FIELD_PROPOSAL_ONLY — players per side per proposed field (no encoded Spielplan). */
  fieldProposalPlayersPerSide: readonly number[] | null;
};

export function buildComposerProposalFingerprint(input: {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  participantCount: number;
  templateId: string | null;
  templateVersion: number | null;
}): string {
  return [
    input.categoryContext ?? "unknown",
    String(input.participantCount),
    input.templateId ?? "none",
    input.templateVersion != null ? String(input.templateVersion) : "none",
  ].join(":");
}

export function resolveComposerProgrammeProposal(input: {
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): ComposerProgrammeProposal {
  if (input.participantCount < 2) {
    return {
      kind: "NONE",
      categoryContext: input.categoryContext,
      template: null,
      fieldProposalPlayersPerSide: null,
    };
  }

  const template = getRecommendedProgrammeTemplate({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (template) {
    return {
      kind: "FULL_TEMPLATE",
      categoryContext: input.categoryContext,
      template,
      fieldProposalPlayersPerSide: null,
    };
  }

  if (input.categoryContext === "F") {
    const fProposal = resolveFFieldProposalStructure(input.participantCount);
    if (fProposal) {
      return {
        kind: "FIELD_PROPOSAL_ONLY",
        categoryContext: "F",
        template: null,
        fieldProposalPlayersPerSide: fProposal.playingFormats.map((f) => f.playersPerSide),
      };
    }
  }

  return {
    kind: "NONE",
    categoryContext: input.categoryContext,
    template: null,
    fieldProposalPlayersPerSide: null,
  };
}

export function materializeComposerPitchesFromFieldProposal(input: {
  playersPerSide: readonly number[];
  previous?: readonly TournamentComposerPitchDraft[];
}): TournamentComposerPitchDraft[] {
  return input.playersPerSide.map((playersPerSide, index) => {
    const displayOrder = index + 1;
    const prev = input.previous?.[index];
    return {
      localId: prev?.localId ?? `pitch-proposal-${displayOrder}-${Date.now()}`,
      label: prev?.userLabelCustomized && prev.label.trim() ? prev.label : `Feld ${displayOrder}`,
      playersPerSide,
      userLabelCustomized: prev?.userLabelCustomized ?? false,
    };
  });
}

export type ComposerTemplateApplicability = "EXACT" | "CUSTOM_COMPATIBLE" | "INCOMPATIBLE";

export function evaluateComposerTemplateApplicability(input: {
  template: TournamentProgrammeTemplate;
  pitches: readonly TournamentComposerPitchDraft[];
}): ComposerTemplateApplicability {
  const sortedFields = [...input.template.fields].sort((a, b) => a.displayOrder - b.displayOrder);
  if (input.pitches.length !== sortedFields.length) {
    return "INCOMPATIBLE";
  }
  const keys = input.pitches.map((p) => p.templateFieldKey ?? null);
  if (keys.every((key, i) => key === sortedFields[i]!.fieldKey)) {
    return "EXACT";
  }
  const keySet = new Set(input.pitches.map((p) => p.templateFieldKey).filter(Boolean));
  if (keySet.size === sortedFields.length && sortedFields.every((f) => keySet.has(f.fieldKey))) {
    return "CUSTOM_COMPATIBLE";
  }
  return "INCOMPATIBLE";
}

export function summarizeComposerPitchAllocation(pitches: readonly TournamentComposerPitchDraft[]): {
  fieldCount: number;
  formatLines: string[];
} {
  const counts = new Map<number, number>();
  for (const pitch of pitches) {
    if (pitch.playersPerSide == null) continue;
    counts.set(pitch.playersPerSide, (counts.get(pitch.playersPerSide) ?? 0) + 1);
  }
  const formatLines = [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([side, count]) => `${count} × ${side} gegen ${side}`);
  return { fieldCount: pitches.length, formatLines };
}

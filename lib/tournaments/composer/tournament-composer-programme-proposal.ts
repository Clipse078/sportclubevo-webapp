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

export function buildFieldProposalSignature(playersPerSide: readonly number[]): string {
  return playersPerSide.join("-");
}

export function buildComposerProposalFingerprint(input: {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  participantCount: number;
  templateId: string | null;
  templateVersion: number | null;
  fieldProposalSignature?: string | null;
}): string {
  return [
    input.categoryContext ?? "unknown",
    String(input.participantCount),
    input.templateId ?? "none",
    input.templateVersion != null ? String(input.templateVersion) : "none",
    input.fieldProposalSignature ?? "none",
  ].join(":");
}

export function expectedPitchCountForProposal(proposal: ComposerProgrammeProposal): number {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return proposal.template.fields.length;
  }
  if (proposal.kind === "FIELD_PROPOSAL_ONLY" && proposal.fieldProposalPlayersPerSide) {
    return proposal.fieldProposalPlayersPerSide.length;
  }
  return 0;
}

export function expectedPlayersPerSideForProposal(
  proposal: ComposerProgrammeProposal,
): readonly number[] {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return [...proposal.template.fields]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((f) => f.playingFormat.playersPerSide);
  }
  if (proposal.kind === "FIELD_PROPOSAL_ONLY" && proposal.fieldProposalPlayersPerSide) {
    return proposal.fieldProposalPlayersPerSide;
  }
  return [];
}

/** Default planner bootstrap before SCE proposal materialisation. */
export function isGenericDefaultComposerPitchDraft(
  pitches: readonly TournamentComposerPitchDraft[],
): boolean {
  if (pitches.length !== 1) return false;
  const only = pitches[0];
  if (!only) return false;
  return (
    only.playersPerSide == null &&
    !only.templateFieldKey &&
    only.userLabelCustomized !== true &&
    /^Feld 1$/i.test(only.label.trim())
  );
}

export function composerPitchDraftNeedsProposalMaterialisation(input: {
  proposal: ComposerProgrammeProposal;
  pitches: readonly TournamentComposerPitchDraft[];
}): boolean {
  const expectedCount = expectedPitchCountForProposal(input.proposal);
  if (expectedCount < 1) return false;
  if (isGenericDefaultComposerPitchDraft(input.pitches)) return true;
  if (input.pitches.length !== expectedCount) return true;
  if (input.pitches.some((pitch) => pitch.playersPerSide == null)) return true;

  if (input.proposal.kind === "FULL_TEMPLATE" && input.proposal.template) {
    const sortedFields = [...input.proposal.template.fields].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    for (let i = 0; i < sortedFields.length; i += 1) {
      if (input.pitches[i]?.templateFieldKey !== sortedFields[i]!.fieldKey) return true;
    }
  }
  return false;
}

export function fieldProposalSignatureForProposal(
  proposal: ComposerProgrammeProposal,
): string | null {
  if (proposal.kind !== "FIELD_PROPOSAL_ONLY" || !proposal.fieldProposalPlayersPerSide) {
    return null;
  }
  return buildFieldProposalSignature(proposal.fieldProposalPlayersPerSide);
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

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
  /** When kind === FIELD_PROPOSAL_ONLY — logical pitch count only (no encoded Spielplan). */
  fieldProposalPitchCount: number | null;
};

export function buildFieldProposalSignature(pitchCount: number): string {
  return String(pitchCount);
}

/** Sport-neutral schedule structure label for recommendation surfaces. */
export function buildScheduleRecommendationSummary(input: {
  fieldCount: number;
  roundCount: number | null;
}): string {
  const fields = `${input.fieldCount} Spielfelder`;
  if (input.roundCount != null && input.roundCount > 0) {
    return `${fields} · ${input.roundCount} Runden`;
  }
  return fields;
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
  if (proposal.kind === "FIELD_PROPOSAL_ONLY" && proposal.fieldProposalPitchCount != null) {
    return proposal.fieldProposalPitchCount;
  }
  return 0;
}

export function expectedRoundCountForProposal(proposal: ComposerProgrammeProposal): number | null {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return proposal.template.rounds.length;
  }
  return null;
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
  if (proposal.kind !== "FIELD_PROPOSAL_ONLY" || proposal.fieldProposalPitchCount == null) {
    return null;
  }
  return buildFieldProposalSignature(proposal.fieldProposalPitchCount);
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
      fieldProposalPitchCount: null,
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
      fieldProposalPitchCount: null,
    };
  }

  if (input.categoryContext === "F") {
    const fProposal = resolveFFieldProposalStructure(input.participantCount);
    if (fProposal) {
      return {
        kind: "FIELD_PROPOSAL_ONLY",
        categoryContext: "F",
        template: null,
        fieldProposalPitchCount: fProposal.fieldCount,
      };
    }
  }

  return {
    kind: "NONE",
    categoryContext: input.categoryContext,
    template: null,
    fieldProposalPitchCount: null,
  };
}

export function materializeComposerPitchesFromPitchCount(input: {
  pitchCount: number;
  previous?: readonly TournamentComposerPitchDraft[];
}): TournamentComposerPitchDraft[] {
  return Array.from({ length: input.pitchCount }, (_, index) => {
    const displayOrder = index + 1;
    const prev = input.previous?.[index];
    return {
      localId: prev?.localId ?? `pitch-proposal-${displayOrder}-${Date.now()}`,
      label: prev?.userLabelCustomized && prev.label.trim() ? prev.label : `Feld ${displayOrder}`,
      playersPerSide: prev?.playersPerSide ?? null,
      userLabelCustomized: prev?.userLabelCustomized ?? false,
    };
  });
}

/** @deprecated Use materializeComposerPitchesFromPitchCount — pitch count only; no format inference. */
export function materializeComposerPitchesFromFieldProposal(input: {
  playersPerSide: readonly number[];
  previous?: readonly TournamentComposerPitchDraft[];
}): TournamentComposerPitchDraft[] {
  return materializeComposerPitchesFromPitchCount({
    pitchCount: input.playersPerSide.length,
    previous: input.previous,
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
} {
  return { fieldCount: pitches.length };
}

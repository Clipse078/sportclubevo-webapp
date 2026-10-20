/**
 * SCE-TOURNAMENT-PLANNER-02D — category-aware programme proposals for HOME creator.
 * SCE proposes; user-adjusted pitch configuration is preserved across hydrate/navigation.
 */

import {
  computeProgrammeRequiredMinutesFromTimeline,
  computeRoundParallelScheduleTimeline,
} from "@/lib/tournament-scheduling/programme-templates/fixed-pause-round-scheduling";
import { computeRoundParallelScheduleWithBreaks } from "@/lib/tournament-scheduling/programme-templates/round-scheduled-breaks";
import type { TournamentProgrammeTemplate } from "@/lib/tournament-scheduling/programme-templates/types";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import {
  defaultComposerScheduleRoundBreaksForTemplate,
  normalizeComposerScheduleRoundBreaks,
} from "./tournament-composer-schedule-round-breaks";
import type {
  TournamentComposerPitchDraft,
  TournamentComposerPlannerDraft,
} from "./tournament-composer-planner-types";
import {
  buildComposerProposalFingerprint,
  buildScheduleRecommendationSummary,
  composerPitchDraftNeedsProposalMaterialisation,
  expectedRoundCountForProposal,
  fieldProposalSignatureForProposal,
  isGenericDefaultComposerPitchDraft,
  materializeComposerPitchesFromPitchCount,
  resolveComposerProgrammeProposal,
  type ComposerProgrammeProposal,
} from "./tournament-composer-programme-proposal";

export type ComposerResolvedProgrammeTemplate = {
  proposal: ComposerProgrammeProposal;
  proposedFieldCount: number;
  proposedRoundCount: number | null;
  fieldCountLabel: string;
  /** Sport-neutral schedule structure (fields + rounds when known). */
  scheduleRecommendationSummary: string;
  statusHeadline: string;
  statusDetail: string;
};

/** Curated templates key off tournament participants — never playing-unit splits. */
export function countComposerCuratedTemplateParticipants(
  participants: readonly unknown[],
): number {
  return participants.length;
}

export function resolveComposerProgrammeTemplate(input: {
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): ComposerResolvedProgrammeTemplate | null {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (proposal.kind === "NONE") return null;

  const fieldCount =
    proposal.kind === "FULL_TEMPLATE" && proposal.template
      ? proposal.template.fields.length
      : proposal.fieldProposalPitchCount ?? 0;
  const roundCount = expectedRoundCountForProposal(proposal);
  const scheduleRecommendationSummary = buildScheduleRecommendationSummary({
    fieldCount,
    roundCount,
  });

  return {
    proposal,
    fieldCountLabel: `Vorschlag: ${scheduleRecommendationSummary}`,
    scheduleRecommendationSummary,
    statusHeadline: "Empfohlene Aufteilung",
    statusDetail:
      proposal.kind === "FULL_TEMPLATE"
        ? "SCE empfiehlt Spielplan-Struktur (Felder und Runden) — Spielform legst du pro Feld optional selbst fest."
        : "SCE empfiehlt eine Feldaufteilung — Spielform legst du pro Feld optional selbst fest.",
    proposedFieldCount: fieldCount,
    proposedRoundCount: roundCount,
  };
}


export function materializeComposerPitchesFromTemplate(
  template: TournamentProgrammeTemplate,
  previous?: readonly TournamentComposerPitchDraft[],
): TournamentComposerPitchDraft[] {
  const sorted = [...template.fields].sort((a, b) => a.displayOrder - b.displayOrder);
  const previousByKey = new Map(
    (previous ?? [])
      .filter((p) => p.templateFieldKey)
      .map((p) => [p.templateFieldKey!, p] as const),
  );
  return sorted.map((field) => {
    const prev = previousByKey.get(field.fieldKey);
    return {
      localId: prev?.localId ?? `pitch-template-${field.fieldKey}`,
      templateFieldKey: field.fieldKey,
      label: prev?.userLabelCustomized && prev.label.trim() ? prev.label : field.label,
      playersPerSide: prev?.playersPerSide ?? null,
      userLabelCustomized: prev?.userLabelCustomized ?? false,
    };
  });
}

function materializePitchesFromProposal(
  proposal: ComposerProgrammeProposal,
  previous?: readonly TournamentComposerPitchDraft[],
): TournamentComposerPitchDraft[] {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return materializeComposerPitchesFromTemplate(proposal.template, previous);
  }
  if (proposal.kind === "FIELD_PROPOSAL_ONLY" && proposal.fieldProposalPitchCount != null) {
    return materializeComposerPitchesFromPitchCount({
      pitchCount: proposal.fieldProposalPitchCount,
      previous,
    });
  }
  return previous ? [...previous] : [];
}

function proposalTemplateIdentity(proposal: ComposerProgrammeProposal): {
  programmeTemplateId: string | null;
  programmeTemplateVersion: number | null;
  fieldProposalSignature: string | null;
} {
  if (proposal.kind === "FULL_TEMPLATE" && proposal.template) {
    return {
      programmeTemplateId: proposal.template.id,
      programmeTemplateVersion: proposal.template.version,
      fieldProposalSignature: null,
    };
  }
  return {
    programmeTemplateId: null,
    programmeTemplateVersion: null,
    fieldProposalSignature: fieldProposalSignatureForProposal(proposal),
  };
}

function buildFingerprintForProposal(
  proposal: ComposerProgrammeProposal,
  participantCount: number,
  categoryContext: ProgrammeTemplateCategoryContext | null,
): string {
  const identity = proposalTemplateIdentity(proposal);
  return buildComposerProposalFingerprint({
    categoryContext,
    participantCount,
    templateId: identity.programmeTemplateId,
    templateVersion: identity.programmeTemplateVersion,
    fieldProposalSignature: identity.fieldProposalSignature,
  });
}

export function restoreComposerProgrammeProposal(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): TournamentComposerPlannerDraft {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (proposal.kind === "NONE") {
    return {
      ...input.planner,
      pitchesUserCustomized: false,
      pendingProposalRefresh: null,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: null,
      programmeTemplateId: null,
      programmeTemplateVersion: null,
    };
  }
  const identity = proposalTemplateIdentity(proposal);
  const fingerprint = buildFingerprintForProposal(
    proposal,
    input.participantCount,
    input.categoryContext,
  );
  const scheduleRoundBreaks =
    proposal.kind === "FULL_TEMPLATE" && proposal.template
      ? defaultComposerScheduleRoundBreaksForTemplate(proposal.template)
      : normalizeComposerScheduleRoundBreaks(input.planner);
  return {
    ...input.planner,
    ...identity,
    programmeProposalCategoryContext: input.categoryContext,
    programmeProposalFingerprint: fingerprint,
    pitchesUserCustomized: false,
    pendingProposalRefresh: null,
    scheduleRoundBreaks,
    mainPause: undefined,
    pitches: materializePitchesFromProposal(proposal),
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    groupCount: 1,
  };
}

export function reconcileComposerPlannerForParticipants(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  /** When true, never overwrite user-customised pitches (draft hydrate/resume). */
  preserveUserPitchEdits?: boolean;
}): TournamentComposerPlannerDraft {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  const identity = proposalTemplateIdentity(proposal);
  const nextFingerprint = buildFingerprintForProposal(
    proposal,
    input.participantCount,
    input.categoryContext,
  );

  const needsProposalMaterialisation = composerPitchDraftNeedsProposalMaterialisation({
    proposal,
    pitches: input.planner.pitches,
  });
  const staleGenericMarkedCustomised =
    input.planner.pitchesUserCustomized === true &&
    isGenericDefaultComposerPitchDraft(input.planner.pitches);
  const userCustomisedPitches =
    input.planner.pitchesUserCustomized === true && !staleGenericMarkedCustomised;

  if (proposal.kind === "NONE") {
    return {
      ...input.planner,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: null,
      pendingProposalRefresh: null,
      programmeTemplateId: null,
      programmeTemplateVersion: null,
    };
  }

  const fingerprintChanged =
    input.planner.programmeProposalFingerprint != null &&
    input.planner.programmeProposalFingerprint !== nextFingerprint;

  if (userCustomisedPitches) {
    if (fingerprintChanged) {
      return {
        ...input.planner,
        programmeProposalCategoryContext: input.categoryContext,
        pendingProposalRefresh: {
          message:
            "Die Teams haben sich geändert. SCE hat eine neue Feldaufteilung vorbereitet.",
          nextFingerprint,
          nextTemplateId: identity.programmeTemplateId,
          nextTemplateVersion: identity.programmeTemplateVersion,
        },
      };
    }
    return {
      ...input.planner,
      programmeProposalCategoryContext: input.categoryContext,
      programmeProposalFingerprint: nextFingerprint,
      pendingProposalRefresh: null,
      ...identity,
    };
  }

  const templateChanged =
    input.planner.programmeTemplateId !== identity.programmeTemplateId ||
    input.planner.programmeTemplateVersion !== identity.programmeTemplateVersion;

  const scheduleRoundBreaks =
    proposal.kind === "FULL_TEMPLATE" && proposal.template && !templateChanged
      ? input.planner.scheduleRoundBreaks !== undefined
        ? normalizeComposerScheduleRoundBreaks(input.planner)
        : defaultComposerScheduleRoundBreaksForTemplate(proposal.template)
      : proposal.kind === "FULL_TEMPLATE" && proposal.template
        ? defaultComposerScheduleRoundBreaksForTemplate(proposal.template)
        : normalizeComposerScheduleRoundBreaks(input.planner);

  const preservePitches = input.preserveUserPitchEdits === true && userCustomisedPitches;
  const pitches = preservePitches
    ? input.planner.pitches
    : needsProposalMaterialisation || staleGenericMarkedCustomised
      ? materializePitchesFromProposal(
          proposal,
          templateChanged || needsProposalMaterialisation ? undefined : input.planner.pitches,
        )
      : input.planner.pitches;

  return {
    ...input.planner,
    ...identity,
    programmeProposalCategoryContext: input.categoryContext,
    programmeProposalFingerprint: nextFingerprint,
    pendingProposalRefresh: null,
    competitionFormat: "GROUP_MIX_ONLY",
    groupMixStrategy: "ROUND_ROBIN",
    groupCount: 1,
    scheduleRoundBreaks,
    mainPause: undefined,
    pitches,
    pitchesUserCustomized: preservePitches ? true : false,
  };
}

export function computeTemplateScheduleRequiredMinutes(input: {
  roundCount: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
  tournamentStartUtcMs: number;
  roundBreaks?: readonly { afterRoundNumber: number; durationMinutes: number }[];
  fixedPause?: { startUtcMs: number; endUtcMs: number } | null;
}): number {
  const timeline = input.fixedPause
    ? computeRoundParallelScheduleTimeline({
        tournamentStartUtcMs: input.tournamentStartUtcMs,
        roundCount: input.roundCount,
        matchDurationMinutes: input.matchDurationMinutes,
        transitionMinutes: input.transitionMinutes,
        fixedPause: input.fixedPause,
      })
    : computeRoundParallelScheduleWithBreaks({
        tournamentStartUtcMs: input.tournamentStartUtcMs,
        roundCount: input.roundCount,
        matchDurationMinutes: input.matchDurationMinutes,
        transitionMinutes: input.transitionMinutes,
        roundBreaks: input.roundBreaks ?? [],
      });
  return computeProgrammeRequiredMinutesFromTimeline({
    tournamentStartUtcMs: input.tournamentStartUtcMs,
    programmeEndUtcMs: timeline.programmeEndUtcMs,
  });
}


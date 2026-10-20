/**
 * DS-06-R2 — idempotent recommended TournamentPitch draft preparation for existing HOME setup.
 * Uses the canonical composer programme proposal source (TP01/02); no parallel field-count logic.
 */
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type {
  TournamentComposerPitchDraft,
  TournamentComposerPlannerDraft,
} from "@/lib/tournaments/composer/tournament-composer-planner-types";
import { defaultTournamentComposerPitchLabels } from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import {
  expectedPitchCountForProposal,
  isGenericDefaultComposerPitchDraft,
  materializeComposerPitchesFromPitchCount,
  resolveComposerProgrammeProposal,
} from "@/lib/tournaments/composer/tournament-composer-programme-proposal";
import {
  materializeComposerPitchesFromTemplate,
  reconcileComposerPlannerForParticipants,
} from "@/lib/tournaments/composer/tournament-composer-programme-template";

function materializeProposalPitchDrafts(
  proposal: ReturnType<typeof resolveComposerProgrammeProposal>,
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

function mergePitchDraftsUpToRecommendation(input: {
  existing: readonly TournamentComposerPitchDraft[];
  expectedCount: number;
  proposal: ReturnType<typeof resolveComposerProgrammeProposal>;
}): TournamentComposerPitchDraft[] {
  if (input.existing.length >= input.expectedCount) {
    return [...input.existing];
  }

  const materialized = materializeProposalPitchDrafts(input.proposal, input.existing);
  const labels = defaultTournamentComposerPitchLabels(input.expectedCount);
  const merged: TournamentComposerPitchDraft[] = input.existing.map((pitch) => ({ ...pitch }));

  for (let index = merged.length; index < input.expectedCount; index += 1) {
    const fromProposal = materialized[index];
    merged.push(
      fromProposal ?? {
        localId: `pitch-prepared-${index + 1}`,
        label: labels[index] ?? `Feld ${index + 1}`,
        playersPerSide: null,
        userLabelCustomized: false,
      },
    );
  }

  return merged;
}

function syncPlannerProposalMetadata(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  preserveUserPitchEdits: boolean;
}): TournamentComposerPlannerDraft {
  return reconcileComposerPlannerForParticipants({
    planner: input.planner,
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
    preserveUserPitchEdits: input.preserveUserPitchEdits,
  });
}

export function applyRecommendedPlannerPitchDraftPreparation(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  /** Count of logical TournamentPitch rows persisted for this tournament at hydrate time. */
  persistedPitchCount: number;
}): TournamentComposerPlannerDraft {
  if (input.participantCount < 2) {
    return input.planner;
  }

  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  const expectedCount = expectedPitchCountForProposal(proposal);
  if (expectedCount < 1) {
    return input.planner;
  }

  const existingPitches = input.planner.pitches;

  if (existingPitches.length > expectedCount) {
    return input.planner;
  }

  if (
    input.persistedPitchCount === 0 &&
    (existingPitches.length === 0 || isGenericDefaultComposerPitchDraft(existingPitches))
  ) {
    return syncPlannerProposalMetadata({
      planner: input.planner,
      participantCount: input.participantCount,
      categoryContext: input.categoryContext,
      preserveUserPitchEdits: false,
    });
  }

  if (existingPitches.length === expectedCount) {
    const withMeta = syncPlannerProposalMetadata({
      planner: input.planner,
      participantCount: input.participantCount,
      categoryContext: input.categoryContext,
      preserveUserPitchEdits: input.persistedPitchCount > 0,
    });
    return { ...withMeta, pitches: existingPitches };
  }

  const mergedPitches = mergePitchDraftsUpToRecommendation({
    existing: existingPitches,
    expectedCount,
    proposal,
  });

  const withMeta = syncPlannerProposalMetadata({
    planner: { ...input.planner, pitches: mergedPitches },
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
    preserveUserPitchEdits: true,
  });

  return {
    ...withMeta,
    pitches: mergedPitches,
    pitchesUserCustomized: input.persistedPitchCount > 0 ? true : withMeta.pitchesUserCustomized,
  };
}

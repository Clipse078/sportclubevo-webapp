import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import {
  composerPitchDraftNeedsProposalMaterialisation,
  resolveComposerProgrammeProposal,
} from "./tournament-composer-programme-proposal";
import { reconcileComposerPlannerForParticipants } from "./tournament-composer-programme-template";

/**
 * Authoritative planner boundary: reconciles SCE proposals into editable pitch rows
 * before any composer step renders or validates.
 */
export function resolveEffectiveComposerPlanner(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
  preserveUserPitchEdits?: boolean;
}): TournamentComposerPlannerDraft {
  return reconcileComposerPlannerForParticipants(input);
}

/** Integration invariant — proposal fields must be visible in planner.pitches before Spielfelder. */
export function assertComposerPitchProposalInvariant(input: {
  planner: TournamentComposerPlannerDraft;
  participantCount: number;
  categoryContext: ProgrammeTemplateCategoryContext | null;
}): void {
  const proposal = resolveComposerProgrammeProposal({
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
  });
  if (proposal.kind === "NONE") return;
  if (input.planner.pitchesUserCustomized === true) return;
  if (
    !composerPitchDraftNeedsProposalMaterialisation({
      proposal,
      pitches: input.planner.pitches,
    })
  ) {
    return;
  }
  throw new Error(
    "Composer pitch proposal invariant violated: supported proposal exists but pitches were not materialised.",
  );
}

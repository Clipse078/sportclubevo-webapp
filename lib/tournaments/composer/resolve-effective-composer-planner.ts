import type { JuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import { prepareTournamentComposerProposal } from "./prepare-tournament-composer-proposal";
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
  participants?: TournamentComposerDraftPayload["participants"];
  teamAgeGroupById?: ReadonlyMap<string, string | null | undefined>;
  teamJuniorCategoryById?: ReadonlyMap<string, JuniorCategoryCode | null | undefined>;
}): TournamentComposerPlannerDraft {
  if (input.participants) {
    return prepareTournamentComposerProposal({
      participants: input.participants,
      planner: input.planner,
      teamAgeGroupById: input.teamAgeGroupById,
      teamJuniorCategoryById: input.teamJuniorCategoryById,
      preserveUserPitchEdits: input.preserveUserPitchEdits,
    }).planner;
  }
  return reconcileComposerPlannerForParticipants({
    planner: input.planner,
    participantCount: input.participantCount,
    categoryContext: input.categoryContext,
    preserveUserPitchEdits: input.preserveUserPitchEdits,
  });
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

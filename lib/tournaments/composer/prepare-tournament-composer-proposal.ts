/**
 * SCE-TOURNAMENT-PLANNER-02D — single authoritative boundary for SCE proposal → planner state.
 */

import type { ProgrammeTemplateCategoryContext } from "@/lib/tournament-scheduling/programme-templates/types";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentComposerPlannerDraft } from "./tournament-composer-planner-types";
import {
  buildTeamAgeGroupLookup,
  resolveComposerProgrammeCategoryContext,
} from "./resolve-composer-programme-category-context";
import {
  countComposerCuratedTemplateParticipants,
  reconcileComposerPlannerForParticipants,
} from "./tournament-composer-programme-template";
import {
  resolveComposerProgrammeProposal,
  type ComposerProgrammeProposal,
} from "./tournament-composer-programme-proposal";
import type { ProgrammeCategoryResolutionSource } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";

export type PreparedTournamentComposerProposal = {
  categoryContext: ProgrammeTemplateCategoryContext | null;
  categorySource: ProgrammeCategoryResolutionSource;
  participantCount: number;
  proposal: ComposerProgrammeProposal;
  planner: TournamentComposerPlannerDraft;
};

export function buildComposerTeamAgeGroupLookup(input: {
  participants: TournamentComposerDraftPayload["participants"];
  teamAgeGroupById?: ReadonlyMap<string, string | null | undefined>;
}): Map<string, string | null> {
  const merged = new Map<string, string | null>();
  if (input.teamAgeGroupById) {
    for (const [teamId, ageGroup] of input.teamAgeGroupById.entries()) {
      merged.set(teamId, ageGroup ?? null);
    }
  }
  for (const participant of input.participants) {
    if (participant.kind !== "TEAM" || !participant.teamId) continue;
    if (participant.teamAgeGroup !== undefined && participant.teamAgeGroup !== null) {
      merged.set(participant.teamId, participant.teamAgeGroup);
    }
  }
  return merged;
}

export function prepareTournamentComposerProposal(input: {
  participants: TournamentComposerDraftPayload["participants"];
  planner: TournamentComposerPlannerDraft;
  teamAgeGroupById?: ReadonlyMap<string, string | null | undefined>;
  preserveUserPitchEdits?: boolean;
}): PreparedTournamentComposerProposal {
  const teamAgeGroupById = buildComposerTeamAgeGroupLookup({
    participants: input.participants,
    teamAgeGroupById: input.teamAgeGroupById,
  });
  const { categoryContext, source: categorySource } = resolveComposerProgrammeCategoryContext({
    participants: input.participants,
    teamAgeGroupById,
  });
  const participantCount = countComposerCuratedTemplateParticipants(input.participants);
  const proposal = resolveComposerProgrammeProposal({
    participantCount,
    categoryContext,
  });
  const planner = reconcileComposerPlannerForParticipants({
    planner: input.planner,
    participantCount,
    categoryContext,
    preserveUserPitchEdits: input.preserveUserPitchEdits === true,
  });
  return {
    categoryContext,
    categorySource,
    participantCount,
    proposal,
    planner,
  };
}

export function prepareTournamentComposerProposalFromDraft(
  draft: TournamentComposerDraftPayload,
  options?: {
    teamAgeGroupById?: ReadonlyMap<string, string | null | undefined>;
    preserveUserPitchEdits?: boolean;
  },
): PreparedTournamentComposerProposal | null {
  if (draft.homeAway !== "HOME" || !draft.planner) return null;
  return prepareTournamentComposerProposal({
    participants: draft.participants,
    planner: draft.planner,
    teamAgeGroupById: options?.teamAgeGroupById,
    preserveUserPitchEdits:
      options?.preserveUserPitchEdits ?? draft.planner.pitchesUserCustomized === true,
  });
}

export function buildTeamAgeGroupLookupFromTeamOptions(
  teamOptions: readonly { id: string; ageGroup: string | null }[],
): Map<string, string | null> {
  return buildTeamAgeGroupLookup(teamOptions);
}

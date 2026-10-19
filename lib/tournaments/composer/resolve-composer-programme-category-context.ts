import { resolveProgrammeCategoryFromComposerParticipants } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

export function resolveComposerProgrammeCategoryContext(input: {
  participants: TournamentComposerDraftPayload["participants"];
  teamAgeGroupById: ReadonlyMap<string, string | null | undefined>;
}) {
  return resolveProgrammeCategoryFromComposerParticipants({
    participants: input.participants,
    teamAgeGroupById: input.teamAgeGroupById,
  });
}

export function buildTeamAgeGroupLookup(
  teamOptions: readonly { id: string; ageGroup: string | null }[],
): Map<string, string | null> {
  return new Map(teamOptions.map((team) => [team.id, team.ageGroup]));
}

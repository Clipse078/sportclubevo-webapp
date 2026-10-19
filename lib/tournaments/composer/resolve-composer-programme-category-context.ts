import { resolveProgrammeCategoryFromComposerParticipants } from "@/lib/tournament-scheduling/programme-templates/programme-template-category";
import type { JuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import { resolveAuthoritativeTeamJuniorCategoryCode } from "@/lib/teams/jahrgang-rules";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import type { TournamentTeamOption } from "./load-tournament-composer-create-surface-props.server";

export function resolveComposerProgrammeCategoryContext(input: {
  participants: TournamentComposerDraftPayload["participants"];
  teamAgeGroupById: ReadonlyMap<string, string | null | undefined>;
  teamJuniorCategoryById?: ReadonlyMap<string, JuniorCategoryCode | null | undefined>;
}) {
  return resolveProgrammeCategoryFromComposerParticipants({
    participants: input.participants,
    teamAgeGroupById: input.teamAgeGroupById,
    teamJuniorCategoryById: input.teamJuniorCategoryById,
  });
}

export function buildTeamAgeGroupLookup(
  teamOptions: readonly { id: string; ageGroup: string | null }[],
): Map<string, string | null> {
  return new Map(teamOptions.map((team) => [team.id, team.ageGroup]));
}

export function buildTeamJuniorCategoryLookup(
  teamOptions: readonly Pick<TournamentTeamOption, "id" | "ageGroup" | "shortName" | "juniorCategoryCode">[],
): Map<string, JuniorCategoryCode | null> {
  return new Map(
    teamOptions.map((team) => [
      team.id,
      team.juniorCategoryCode ??
        resolveAuthoritativeTeamJuniorCategoryCode({
          ageGroup: team.ageGroup,
          shortName: team.shortName,
        }),
    ]),
  );
}

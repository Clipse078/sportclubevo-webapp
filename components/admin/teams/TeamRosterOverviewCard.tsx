import TeamSquadManagementCard from "@/components/admin/teams/TeamSquadManagementCard";
import TeamTrainerRosterSection from "@/components/admin/teams/TeamTrainerRosterSection";
import {
  TeamHistoricalSeasonRosters,
  type TeamRosterSeasonEntry,
} from "@/components/admin/teams/TeamRosterSeasonSection";
import { listTrainerAssignmentOnlySuggestions } from "@/lib/teams/roster-onboarding-queries";

type RosterMode = "all" | "squad" | "trainer";

type Props = {
  tenantId: string;
  teamId: string;
  teamAgeGroup: string | null;
  canManage: boolean;
  canManagePeople: boolean;
  teamSeasons: TeamRosterSeasonEntry[];
  currentTeamSeasonId: string | null;
  mode?: RosterMode;
};

function sortTeamSeasonsDesc(entries: TeamRosterSeasonEntry[]) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.season.startDate).getTime();
    const bTime = new Date(b.season.startDate).getTime();
    return bTime - aTime;
  });
}

export default async function TeamRosterOverviewCard({
  tenantId,
  teamId,
  teamAgeGroup,
  canManage,
  canManagePeople,
  teamSeasons,
  currentTeamSeasonId,
  mode = "all",
}: Props) {
  const showSquad = mode === "all" || mode === "squad";
  const showTrainer = mode === "all" || mode === "trainer";
  const sortedSeasons = sortTeamSeasonsDesc(teamSeasons);
  const currentSeason = currentTeamSeasonId
    ? (sortedSeasons.find((entry) => entry.id === currentTeamSeasonId) ?? null)
    : null;
  const historicalSeasons = currentSeason
    ? sortedSeasons.filter((entry) => entry.id !== currentSeason.id)
    : sortedSeasons;

  const assignmentOnlySuggestions =
    currentSeason && showTrainer
      ? await listTrainerAssignmentOnlySuggestions({
          tenantId,
          teamId,
          teamSeasonId: currentSeason.id,
        })
      : [];

  return (
    <div className="space-y-6" data-testid="team-roster-overview">
      {currentSeason ? (
        <div
          className={
            showSquad && showTrainer ? "grid gap-8 xl:grid-cols-2" : "grid gap-8"
          }
        >
          {showSquad ? (
            <TeamSquadManagementCard
              teamId={teamId}
              canManage={canManage}
              canManagePeople={canManagePeople}
              sectionId="spielerkader"
              teamSeason={{
                id: currentSeason.id,
                displayName: currentSeason.displayName,
                shortName: currentSeason.shortName,
                status: currentSeason.status,
                squadWebsiteVisible: currentSeason.squadWebsiteVisible ?? true,
                season: currentSeason.season,
                teamAgeGroup,
                playerSquadMembers: currentSeason.playerSquadMembers ?? [],
              }}
            />
          ) : null}

          {showTrainer ? (
            <TeamTrainerRosterSection
              teamId={teamId}
              canManage={canManage}
              canManagePeople={canManagePeople}
              teamSeason={{
                id: currentSeason.id,
                displayName: currentSeason.displayName,
                status: currentSeason.status,
                trainerTeamWebsiteVisible: currentSeason.trainerTeamWebsiteVisible ?? true,
                season: currentSeason.season,
                trainerTeamMembers: currentSeason.trainerTeamMembers ?? [],
              }}
              assignmentOnlySuggestions={assignmentOnlySuggestions}
            />
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-5 text-sm text-[var(--muted)]">
          {teamSeasons.length > 0
            ? mode === "trainer"
              ? "Für die aktuelle Geschäftsjahr-Saison ist kein Trainerteam hinterlegt. Historische Saisons sind unten verfügbar."
              : mode === "squad"
                ? "Für die aktuelle Geschäftsjahr-Saison ist kein Kader hinterlegt. Historische Saisons sind unten verfügbar."
                : "Für die aktuelle Geschäftsjahr-Saison ist kein Kader hinterlegt. Historische Saisons sind unten verfügbar."
            : "Noch keine Team-Saison vorhanden. Für Kader und Trainerteam wird mindestens eine Team-Saison benötigt."}
        </div>
      )}

      {historicalSeasons.length > 0 ? (
        <TeamHistoricalSeasonRosters
          teamId={teamId}
          teamAgeGroup={teamAgeGroup}
          canManage={canManage}
          canManagePeople={canManagePeople}
          seasons={historicalSeasons}
          mode={mode}
        />
      ) : null}
    </div>
  );
}

import TeamSportingSnapshot from "@/components/admin/teams/overview/TeamSportingSnapshot";
import {
  createTeamCockpitMatchFixture,
  createTeamCockpitResultFixture,
} from "@/lib/teams/team-cockpit-match-fixtures";

export const metadata = {
  title: "SCE Preview — Team Übersicht Match tiles",
  robots: { index: false, follow: false },
};

const FORMAT_CONFIG = { locale: "de-CH", timezone: "Europe/Zurich" };

export default function SceTeamOverviewMatchesPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl p-6" data-testid="sce-preview-team-overview-matches">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Integration preview — Team → Übersicht Nächstes Spiel / Letztes Resultat (COMPACT).
      </p>
      <TeamSportingSnapshot
        teamId="team-preview"
        nextMatch={createTeamCockpitMatchFixture({
          eventId: "preview-next",
          startAt: new Date("2026-10-13T16:00:00.000Z"),
        })}
        latestResult={createTeamCockpitResultFixture({
          eventId: "preview-last",
          scoreHome: 1,
          scoreAway: 2,
          side: "AWAY",
          resultPerspective: "WON",
        })}
        standings={null}
        formatConfig={FORMAT_CONFIG}
      />
    </div>
  );
}

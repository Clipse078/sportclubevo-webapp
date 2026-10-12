import TeamResultsView from "@/components/admin/teams/results/TeamResultsView";
import { createTeamCockpitResultFixture } from "@/lib/teams/team-cockpit-match-fixtures";

export const metadata = {
  title: "SCE Preview — Team Resultate",
  robots: { index: false, follow: false },
};

const FORMAT_CONFIG = { locale: "de-CH", timezone: "Europe/Zurich" };

export default function SceTeamResultsPreviewPage() {
  const results = [
    createTeamCockpitResultFixture({
      eventId: "preview-home-win",
      side: "HOME",
      scoreHome: 3,
      scoreAway: 1,
      resultPerspective: "WON",
    }),
    createTeamCockpitResultFixture({
      eventId: "preview-away-draw",
      side: "AWAY",
      scoreHome: 2,
      scoreAway: 2,
      resultPerspective: "DRAW",
      startAt: new Date("2026-08-10T16:00:00.000Z"),
    }),
  ];

  return (
    <div className="mx-auto max-w-3xl p-6" data-testid="sce-preview-team-results">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Integration preview — Team → Resultate (COMPACT `SceMatchCard` per row).
      </p>
      <TeamResultsView
        results={results}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />
    </div>
  );
}

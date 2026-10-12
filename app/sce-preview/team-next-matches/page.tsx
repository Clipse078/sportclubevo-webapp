import TeamUpcomingMatchesView from "@/components/admin/teams/upcoming-matches/TeamUpcomingMatchesView";
import { buildTeamUpcomingMatchesPreviewFixtures } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-preview-fixtures";

export const metadata = {
  title: "SCE Preview — Team Nächste Spiele",
  robots: { index: false, follow: false },
};

const FORMAT_CONFIG = { locale: "de-CH", timezone: "Europe/Zurich" };

/**
 * Dev/preview mirror of Team → Nächste Spiele (`TeamUpcomingMatchesView`).
 * PO visual UAT on deployed environments uses `/dashboard/teams/[teamId]/spiele`.
 */
export default function SceTeamNextMatchesPreviewPage() {
  return (
    <div className="mx-auto max-w-3xl p-6" data-testid="sce-preview-team-next-matches">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Integration preview — same view as Team → Nächste Spiele (authenticated team cockpit).
      </p>
      <TeamUpcomingMatchesView
        matches={buildTeamUpcomingMatchesPreviewFixtures()}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />
    </div>
  );
}

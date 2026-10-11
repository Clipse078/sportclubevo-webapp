import TeamRosterOverviewCard from "@/components/admin/teams/TeamRosterOverviewCard";
import { requireTeamCockpitAccess } from "@/lib/teams/team-cockpit-layout";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ freigegebeneSpieler?: string }>;
};

export default async function TeamKaderPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const query = await searchParams;
  const { tenantId, team, canManage, canManagePeople } =
    await requireTeamCockpitAccess(teamId);

  return (
    <TeamRosterOverviewCard
      tenantId={tenantId}
      teamId={team.id}
      teamAgeGroup={team.ageGroup}
      canManage={canManage}
      canManagePeople={canManagePeople}
      teamSeasons={team.teamSeasons}
      currentTeamSeasonId={team.currentTeamSeasonId ?? null}
      mode="squad"
      highlightInboundPlayerReleases={query.freigegebeneSpieler === "1"}
    />
  );
}

import TeamParticipationSection from "@/components/admin/teams/TeamParticipationSection";
import { requireTeamCockpitAccess } from "@/lib/teams/team-cockpit-layout";
import { getUpcomingParticipationForTeam } from "@/lib/participation/queries";
import { SectionCard } from "@/components/ui/page";
import { auth } from "@/auth";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";
import { resolvePlayerReleaseAccess } from "@/lib/match-squad/player-release-auth";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamTeilnahmenPage({ params }: Props) {
  const { teamId } = await params;
  const { tenantId, tenantKey, team } = await requireTeamCockpitAccess(teamId);
  const session = await auth();
  const commAuth =
    session?.user?.id != null
      ? await resolveTeamCommunicationAuthorization({
          tenantId,
          tenantKey,
          userId: session.user.id,
          teamId: team.id,
        })
      : null;

  const upcomingParticipation = team.currentTeamSeasonId
    ? await getUpcomingParticipationForTeam(
        tenantId,
        team.currentTeamSeasonId,
        teamId,
      )
    : null;

  if (!upcomingParticipation) {
    return (
      <SectionCard title="Teilnahmen">
        <p className="text-sm text-[var(--muted)]">
          {team.teamSeasons.length > 0
            ? "Für die aktuelle Geschäftsjahr-Saison sind keine Teilnahmen verfügbar."
            : "Noch keine Team-Saison vorhanden. Teilnahmen erfordern mindestens eine Team-Saison."}
        </p>
      </SectionCard>
    );
  }

  const releaseAccess =
    session?.user?.id != null && team.currentTeamSeasonId
      ? await resolvePlayerReleaseAccess({
          userId: session.user.id,
          tenantId,
          tenantKey,
          teamId: team.id,
          teamSeasonId: team.currentTeamSeasonId,
        })
      : null;

  return (
    <TeamParticipationSection
      teamId={team.id}
      teamSeasonId={upcomingParticipation.teamSeasonId}
      initialUpcoming={upcomingParticipation}
      canSendEventCommunication={commAuth?.canSend === true}
      canManagePlayerRelease={releaseAccess?.canManageSource === true}
    />
  );
}

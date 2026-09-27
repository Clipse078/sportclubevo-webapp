import TeamCommunicationFoundationView from "@/components/admin/teams/communication/TeamCommunicationFoundationView";
import { listTeamCommunications } from "@/lib/communication/team/team-communication-service";
import { requireTeamCommunicationPageAccess } from "@/lib/communication/team/require-team-communication-access";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamKommunikationPage({ params }: Props) {
  const { teamId } = await params;
  const access = await requireTeamCommunicationPageAccess(teamId);
  const items = await listTeamCommunications({
    tenantId: access.tenantId,
    teamId,
  });

  return (
    <TeamCommunicationFoundationView
      teamId={teamId}
      items={items}
      canSend={access.canSend}
    />
  );
}

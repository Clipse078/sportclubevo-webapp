import TeamChatView from "@/components/admin/teams/communication/TeamChatView";
import {
  getTeamChatUnreadCount,
  listTeamChatMessages,
} from "@/lib/communication/team/team-chat-service";
import { requireTeamCommunicationPageAccess } from "@/lib/communication/team/require-team-communication-access";
import { resolvePersonIdForUser } from "@/lib/teams/team-document-auth";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ communicationId?: string }>;
};

export default async function TeamKommunikationPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const { communicationId } = await searchParams;
  const access = await requireTeamCommunicationPageAccess(teamId);

  const [page, unreadCount, viewerPersonId] = await Promise.all([
    listTeamChatMessages({
      tenantId: access.tenantId,
      teamId,
      viewerUserId: access.userId,
      focusCommunicationId: communicationId ?? null,
    }),
    getTeamChatUnreadCount({
      tenantId: access.tenantId,
      teamId,
      viewerUserId: access.userId,
    }),
    resolvePersonIdForUser(access.userId, access.tenantId).catch(() => null),
  ]);

  return (
    <TeamChatView
      teamId={teamId}
      initialMessages={page.messages}
      initialOlderCursor={page.nextOlderCursor}
      initialHasMoreOlder={page.hasMoreOlder}
      canSend={access.canSend}
      viewerPersonId={viewerPersonId}
      focusCommunicationId={communicationId ?? null}
      initialUnreadCount={unreadCount}
    />
  );
}

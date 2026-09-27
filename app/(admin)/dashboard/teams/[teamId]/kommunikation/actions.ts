"use server";

import { revalidatePath } from "next/cache";
import {
  listTeamChatMessages,
  markTeamChatConversationRead,
  sendTeamChatMessage,
  setTeamChatReaction,
} from "@/lib/communication/team/team-chat-service";
import { listTeamChatMentionCandidates } from "@/lib/communication/team/team-chat-mention-candidates";
import {
  requireTeamCommunicationPageAccess,
  requireTeamCommunicationSendAccess,
} from "@/lib/communication/team/require-team-communication-access";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function sendTeamChatMessageAction(
  teamId: string,
  payload: {
    bodyText: string;
    replyToCommunicationId?: string | null;
    mentionedPersonIds: string[];
    attachmentIds: string[];
  },
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await sendTeamChatMessage({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      bodyText: payload.bodyText,
      replyToCommunicationId: payload.replyToCommunicationId,
      mentionedPersonIds: payload.mentionedPersonIds,
      attachmentIds: payload.attachmentIds,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung zum Senden." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Senden fehlgeschlagen.",
    };
  }
}

export async function loadOlderTeamChatMessagesAction(
  teamId: string,
  olderThanCursor: string | null,
): Promise<
  | {
      ok: true;
      messages: Awaited<ReturnType<typeof listTeamChatMessages>>["messages"];
      nextOlderCursor: string | null;
      hasMoreOlder: boolean;
    }
  | { ok: false; message: string }
> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    const page = await listTeamChatMessages({
      tenantId: access.tenantId,
      teamId,
      viewerUserId: access.userId,
      olderThanCursor,
    });
    return {
      ok: true,
      messages: page.messages,
      nextOlderCursor: page.nextOlderCursor,
      hasMoreOlder: page.hasMoreOlder,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Laden fehlgeschlagen.",
    };
  }
}

export async function markTeamChatReadAction(teamId: string): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await markTeamChatConversationRead({
      tenantId: access.tenantId,
      teamId,
      viewerUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Lesen markieren fehlgeschlagen.",
    };
  }
}

export async function toggleTeamChatReactionAction(
  teamId: string,
  communicationId: string,
  reactionKey: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await setTeamChatReaction({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
      reactionKey,
      active,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Reaktion fehlgeschlagen.",
    };
  }
}

export async function searchTeamChatMentionCandidatesAction(
  teamId: string,
  query: string,
): Promise<
  | { ok: true; options: Awaited<ReturnType<typeof listTeamChatMentionCandidates>> }
  | { ok: false; message: string }
> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    const options = await listTeamChatMentionCandidates({
      tenantId: access.tenantId,
      teamId,
      query,
    });
    return { ok: true, options };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Suche fehlgeschlagen.",
    };
  }
}

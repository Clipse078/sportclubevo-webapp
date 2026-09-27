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
import {
  acknowledgeTeamCommunication,
  sendTeamFormalCommunication,
} from "@/lib/communication/team/team-formal-communication-service";
import {
  closeTeamPoll,
  createEventFromDatePollCommunication,
  selectDatePollWinner,
  sendTeamPollCommunication,
  submitTeamPollResponse,
} from "@/lib/communication/team/team-poll-communication-service";
import {
  claimTeamRequestSlot,
  closeTeamRequest,
  sendTeamRequestCommunication,
  unclaimTeamRequestSlot,
} from "@/lib/communication/team/team-request-communication-service";
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

export async function sendTeamAnnouncementAction(
  teamId: string,
  payload: {
    subject: string;
    bodyText: string;
    audiencePreset: string;
    acknowledgementRequired: boolean;
    attachmentIds: string[];
  },
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await sendTeamFormalCommunication({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      kind: "ANNOUNCEMENT",
      subject: payload.subject,
      bodyText: payload.bodyText,
      audiencePreset: payload.audiencePreset,
      acknowledgementRequired: payload.acknowledgementRequired,
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

export async function sendTeamAlertAction(
  teamId: string,
  payload: {
    subject: string;
    bodyText: string;
    audiencePreset: string;
    acknowledgementRequired: boolean;
    attachmentIds: string[];
  },
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await sendTeamFormalCommunication({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      kind: "ALERT",
      subject: payload.subject,
      bodyText: payload.bodyText,
      audiencePreset: payload.audiencePreset,
      acknowledgementRequired: payload.acknowledgementRequired,
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

export async function acknowledgeTeamCommunicationAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await acknowledgeTeamCommunication({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Bestätigung fehlgeschlagen.",
    };
  }
}

export async function sendTeamPollAction(
  teamId: string,
  payload: {
    kind: "POLL" | "DATE_POLL";
    question: string;
    description: string;
    options: Array<{ label: string } | { startAt: string; endAt?: string | null }>;
    mode: string;
    deadlineAt: string | null;
    resultsVisibility: string;
    audiencePreset: string;
  },
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await sendTeamPollCommunication({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      kind: payload.kind,
      question: payload.question,
      description: payload.description,
      options: payload.options,
      mode: payload.mode,
      deadlineAt: payload.deadlineAt,
      resultsVisibility: payload.resultsVisibility,
      audiencePreset: payload.audiencePreset,
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

export async function submitTeamPollResponseAction(
  teamId: string,
  communicationId: string,
  optionIds: string[],
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await submitTeamPollResponse({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
      optionIds,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Antwort fehlgeschlagen.",
    };
  }
}

export async function closeTeamPollAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await closeTeamPoll({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
      viewerCanSend: access.canSend,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Schliessen fehlgeschlagen.",
    };
  }
}

export async function selectDatePollWinnerAction(
  teamId: string,
  communicationId: string,
  optionId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await selectDatePollWinner({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      optionId,
      actorUserId: access.userId,
      viewerCanSend: access.canSend,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Auswahl fehlgeschlagen.",
    };
  }
}

export async function sendTeamRequestAction(
  teamId: string,
  payload: {
    title: string;
    description: string;
    slots: Array<{
      label: string;
      description?: string | null;
      requiredCapacity?: number;
      startAt?: string | null;
      endAt?: string | null;
    }>;
    deadlineAt: string | null;
    audiencePreset: string;
    eventId: string | null;
  },
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await sendTeamRequestCommunication({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      title: payload.title,
      description: payload.description,
      slots: payload.slots,
      deadlineAt: payload.deadlineAt,
      audiencePreset: payload.audiencePreset,
      eventId: payload.eventId,
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

export async function claimTeamRequestSlotAction(
  teamId: string,
  communicationId: string,
  slotId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await claimTeamRequestSlot({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      slotId,
      actorUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Übernehmen fehlgeschlagen.",
    };
  }
}

export async function unclaimTeamRequestSlotAction(
  teamId: string,
  communicationId: string,
  slotId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationPageAccess(teamId);
    await unclaimTeamRequestSlot({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      slotId,
      actorUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Abmelden fehlgeschlagen.",
    };
  }
}

export async function closeTeamRequestAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await closeTeamRequest({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
      viewerCanSend: access.canSend,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Schliessen fehlgeschlagen.",
    };
  }
}

export async function createEventFromDatePollAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult & { eventId?: string }> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    const result = await createEventFromDatePollCommunication({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      actorUserId: access.userId,
      viewerCanSend: access.canSend,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true, eventId: result.eventId };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung für Event-Erstellung." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Event-Erstellung fehlgeschlagen.",
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

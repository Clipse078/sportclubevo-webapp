import type { ClubMeldungHistoryEventType } from "@prisma/client";
import {
  formatClubMeldungHistoryEvent,
  type ClubMeldungHistoryPresentation,
} from "@/lib/club-meldungen/history-copy";

export type ClubMeldungTimelineMention = {
  userId: string;
  displayName: string;
};

export type ClubMeldungTimelineMessage = {
  id: string;
  body: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  createdAt: string;
  author: { firstName: string; lastName: string };
  mentions?: ClubMeldungTimelineMention[];
};

export type ClubMeldungTimelineHistory = {
  id: string;
  eventType: ClubMeldungHistoryEventType;
  createdAt: string;
  actor: { firstName: string; lastName: string };
  payloadJson: unknown;
};

export type ClubMeldungHandlerTimelineEntry =
  | {
      kind: "message";
      id: string;
      at: string;
      message: ClubMeldungTimelineMessage;
      linkedHistoryId?: string;
    }
  | {
      kind: "history";
      id: string;
      at: string;
      presentation: ClubMeldungHistoryPresentation;
    };

const MESSAGE_LINKED_EVENT_TYPES = new Set<ClubMeldungHistoryEventType>([
  "REPORTER_MESSAGE",
  "HANDLER_MESSAGE_TO_REPORTER",
  "FIELD_UPDATED",
]);

function historyLinksToMessage(event: ClubMeldungTimelineHistory): string | null {
  const payload =
    event.payloadJson && typeof event.payloadJson === "object"
      ? (event.payloadJson as Record<string, unknown>)
      : null;
  const messageId = payload && typeof payload.messageId === "string" ? payload.messageId : null;
  if (!messageId || !MESSAGE_LINKED_EVENT_TYPES.has(event.eventType)) {
    return null;
  }
  if (event.eventType === "FIELD_UPDATED") {
    const audience = payload?.audience;
    if (audience !== "INTERNAL_NOTE") {
      return null;
    }
  }
  return messageId;
}

/**
 * Builds handler Verlauf entries. Messages stay primary; audit rows that
 * reference a message via `payloadJson.messageId` are merged into that message.
 */
export function buildClubMeldungHandlerTimeline(
  messages: ClubMeldungTimelineMessage[],
  history: ClubMeldungTimelineHistory[],
): ClubMeldungHandlerTimelineEntry[] {
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const historyForMessageId = new Map<string, ClubMeldungTimelineHistory>();

  for (const event of history) {
    const messageId = historyLinksToMessage(event);
    if (messageId && messagesById.has(messageId) && !historyForMessageId.has(messageId)) {
      historyForMessageId.set(messageId, event);
    }
  }

  const consumedHistoryIds = new Set<string>();
  const entries: ClubMeldungHandlerTimelineEntry[] = [];

  for (const message of messages) {
    const linked = historyForMessageId.get(message.id);
    if (linked) {
      consumedHistoryIds.add(linked.id);
    }
    entries.push({
      kind: "message",
      id: message.id,
      at: message.createdAt,
      message,
      linkedHistoryId: linked?.id,
    });
  }

  for (const event of history) {
    if (consumedHistoryIds.has(event.id)) {
      continue;
    }
    const presentation = formatClubMeldungHistoryEvent({
      ...event,
      createdAt: new Date(event.createdAt),
    });
    entries.push({
      kind: "history",
      id: event.id,
      at: presentation.createdAt,
      presentation,
    });
  }

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}
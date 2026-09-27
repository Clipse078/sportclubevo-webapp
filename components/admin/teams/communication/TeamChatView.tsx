"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { TeamChatMessageDto, TeamChatReplyPreviewDto } from "@/lib/communication/team/team-chat-service";
import type { TeamCommunicationEngagementSummary } from "@/lib/communication/team/team-formal-communication-service";
import { TeamChatComposer } from "@/components/admin/teams/communication/TeamChatComposer";
import { TeamFormalCommunicationComposer } from "@/components/admin/teams/communication/TeamFormalCommunicationComposer";
import { TeamCommunicationTimelineItem } from "@/components/admin/teams/communication/TeamCommunicationTimelineItem";
import { TeamAcknowledgementSummary } from "@/components/admin/teams/communication/TeamAcknowledgementSummary";
import {
  acknowledgeTeamCommunicationAction,
  loadOlderTeamChatMessagesAction,
  markTeamChatReadAction,
  sendTeamAlertAction,
  sendTeamAnnouncementAction,
  sendTeamChatMessageAction,
  toggleTeamChatReactionAction,
} from "@/app/(admin)/dashboard/teams/[teamId]/kommunikation/actions";

type ComposerMode = "MESSAGE" | "ANNOUNCEMENT" | "ALERT";

type Props = {
  teamId: string;
  initialMessages: TeamChatMessageDto[];
  initialOlderCursor: string | null;
  initialHasMoreOlder: boolean;
  canSend: boolean;
  viewerPersonId: string | null;
  focusCommunicationId?: string | null;
  initialUnreadCount: number;
  focusEngagementSummary?: TeamCommunicationEngagementSummary | null;
};

function senderLabel(message: TeamChatMessageDto): string {
  if (!message.senderPerson) return "Unbekannt";
  return `${message.senderPerson.firstName} ${message.senderPerson.lastName}`.trim();
}

function formatTime(iso: string | null, fallback: string): string {
  return new Date(iso ?? fallback).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TeamChatView({
  teamId,
  initialMessages,
  initialOlderCursor,
  initialHasMoreOlder,
  canSend,
  viewerPersonId,
  focusCommunicationId,
  initialUnreadCount,
  focusEngagementSummary,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [olderCursor, setOlderCursor] = useState(initialOlderCursor);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMoreOlder);
  const [replyTo, setReplyTo] = useState<TeamChatReplyPreviewDto | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [composerMode, setComposerMode] = useState<ComposerMode>("MESSAGE");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    void markTeamChatReadAction(teamId).then((result) => {
      if (result.ok) setUnreadCount(0);
    });
  }, [teamId]);

  useEffect(() => {
    if (focusCommunicationId) {
      const el = document.querySelector(`[data-communication-id="${focusCommunicationId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("ring-2", "ring-[var(--accent)]");
    } else {
      scrollToEnd();
    }
  }, [focusCommunicationId, scrollToEnd]);

  const refreshAfterSend = useCallback(() => {
    setReplyTo(null);
    window.location.reload();
  }, []);

  const focusedMessage = focusCommunicationId
    ? messages.find((m) => m.id === focusCommunicationId)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col" data-testid="team-chat-view">
      <div className="flex flex-col gap-3 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Team-Kommunikation</h2>
          <p className="text-sm text-[var(--text-2)]">Chat, Mitteilungen und Alarme im Team</p>
        </div>
        {unreadCount > 0 ? (
          <span
            className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-white"
            data-testid="team-chat-unread-badge"
          >
            {unreadCount} ungelesen
          </span>
        ) : null}
      </div>

      {canSend ? (
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Kommunikationstyp"
          data-testid="team-communication-type-selector"
        >
          {(
            [
              ["MESSAGE", "Nachricht"],
              ["ANNOUNCEMENT", "Mitteilung"],
              ["ALERT", "Alarm"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={composerMode === mode ? "primary" : "secondary"}
              data-testid={`team-comm-mode-${mode.toLowerCase()}`}
              onClick={() => setComposerMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      {focusEngagementSummary ? (
        <div className="mb-3">
          <TeamAcknowledgementSummary summary={focusEngagementSummary} />
        </div>
      ) : null}

      {focusedMessage && (focusedMessage.kind === "ANNOUNCEMENT" || focusedMessage.kind === "ALERT") ? (
        <div
          className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          data-testid="team-formal-detail-panel"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--text-2)]">Detail</p>
          {focusedMessage.subject ? (
            <p className="mt-1 font-semibold">{focusedMessage.subject}</p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-[var(--foreground)]">{focusedMessage.bodyText}</p>
        </div>
      ) : null}

      <div
        className="flex max-h-[min(70vh,640px)] min-h-[280px] flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
        data-testid="team-chat-stream"
      >
        {hasMoreOlder ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              data-testid="team-chat-load-older"
              onClick={() =>
                startTransition(async () => {
                  const result = await loadOlderTeamChatMessagesAction(teamId, olderCursor);
                  if (result.ok) {
                    setMessages((prev) => [...result.messages, ...prev]);
                    setOlderCursor(result.nextOlderCursor);
                    setHasMoreOlder(result.hasMoreOlder);
                  }
                })
              }
            >
              Ältere Nachrichten
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <p
            className="py-12 text-center text-sm text-[var(--text-2)]"
            data-testid="team-chat-empty-state"
          >
            Noch keine Kommunikation. {canSend ? "Starten Sie mit einer Nachricht oder Mitteilung." : ""}
          </p>
        ) : (
          messages.map((message) => {
            const isOwn =
              viewerPersonId !== null && message.senderPerson?.id === viewerPersonId;
            return (
              <TeamCommunicationTimelineItem
                key={message.id}
                message={message}
                teamId={teamId}
                isOwn={isOwn}
                canSend={canSend}
                pending={pending}
                senderLabel={senderLabel(message)}
                formatTime={formatTime}
                onReply={setReplyTo}
                onToggleReaction={(communicationId, reactionKey, active) =>
                  startTransition(async () => {
                    await toggleTeamChatReactionAction(teamId, communicationId, reactionKey, active);
                    window.location.reload();
                  })
                }
                onAcknowledge={(communicationId) =>
                  startTransition(async () => {
                    const result = await acknowledgeTeamCommunicationAction(teamId, communicationId);
                    if (result.ok) window.location.reload();
                  })
                }
              />
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {canSend && composerMode === "MESSAGE" ? (
        <TeamChatComposer
          teamId={teamId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onSent={() => void refreshAfterSend()}
          onSend={async (payload) => sendTeamChatMessageAction(teamId, payload)}
        />
      ) : null}

      {canSend && composerMode === "ANNOUNCEMENT" ? (
        <TeamFormalCommunicationComposer
          teamId={teamId}
          mode="ANNOUNCEMENT"
          onSent={() => void refreshAfterSend()}
          onSend={async (payload) => sendTeamAnnouncementAction(teamId, payload)}
        />
      ) : null}

      {canSend && composerMode === "ALERT" ? (
        <TeamFormalCommunicationComposer
          teamId={teamId}
          mode="ALERT"
          onSent={() => void refreshAfterSend()}
          onSend={async (payload) => sendTeamAlertAction(teamId, payload)}
        />
      ) : null}
    </div>
  );
}

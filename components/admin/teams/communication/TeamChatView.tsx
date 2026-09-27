"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import { Button } from "@/components/ui";
import { TEAM_CHAT_REACTION_EMOJI, TEAM_CHAT_REACTION_KEYS } from "@/lib/communication/team/team-chat-reactions";
import type { TeamChatMessageDto, TeamChatReplyPreviewDto } from "@/lib/communication/team/team-chat-service";
import { TeamChatComposer } from "@/components/admin/teams/communication/TeamChatComposer";
import { TeamChatMessageBody } from "@/components/admin/teams/communication/TeamChatMessageBody";
import {
  loadOlderTeamChatMessagesAction,
  markTeamChatReadAction,
  sendTeamChatMessageAction,
  toggleTeamChatReactionAction,
} from "@/app/(admin)/dashboard/teams/[teamId]/kommunikation/actions";

type Props = {
  teamId: string;
  initialMessages: TeamChatMessageDto[];
  initialOlderCursor: string | null;
  initialHasMoreOlder: boolean;
  canSend: boolean;
  viewerPersonId: string | null;
  focusCommunicationId?: string | null;
  initialUnreadCount: number;
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
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [olderCursor, setOlderCursor] = useState(initialOlderCursor);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMoreOlder);
  const [replyTo, setReplyTo] = useState<TeamChatReplyPreviewDto | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const streamRef = useRef<HTMLDivElement>(null);
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

  const refreshAfterSend = useCallback(async () => {
    setReplyTo(null);
    window.location.reload();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col" data-testid="team-chat-view">
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Team-Chat</h2>
          <p className="text-sm text-[var(--text-2)]">Nachrichten an die operative Team-Zielgruppe</p>
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

      <div
        ref={streamRef}
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
            Noch keine Nachrichten. {canSend ? "Schreiben Sie die erste Nachricht." : ""}
          </p>
        ) : (
          messages.map((message) => {
            const isOwn =
              viewerPersonId !== null && message.senderPerson?.id === viewerPersonId;
            return (
              <article
                key={message.id}
                data-communication-id={message.id}
                data-testid={`team-chat-message-${message.id}`}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <CoordinatorAvatar name={senderLabel(message)} compact />
                <div
                  className={`max-w-[85%] rounded-2xl border px-3 py-2 ${
                    isOwn
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/10"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  } ${message.unreadForViewer ? "border-l-4 border-l-[var(--accent)]" : ""}`}
                >
                  <header className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-2)]">
                    <span className="font-medium text-[var(--foreground)]">{senderLabel(message)}</span>
                    <time dateTime={message.publishedAt ?? message.createdAt}>
                      {formatTime(message.publishedAt, message.createdAt)}
                    </time>
                    {message.unreadForViewer ? (
                      <span className="text-[var(--accent)]">Neu</span>
                    ) : null}
                  </header>

                  {message.replyTo ? (
                    <div
                      className="mb-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-2)]"
                      data-testid="team-chat-message-reply-context"
                    >
                      <span className="font-medium">
                        {message.replyTo.senderPerson
                          ? `${message.replyTo.senderPerson.firstName} ${message.replyTo.senderPerson.lastName}`.trim()
                          : "Nachricht"}
                      </span>
                      <p className="line-clamp-2">{message.replyTo.bodyText}</p>
                    </div>
                  ) : null}

                  <TeamChatMessageBody bodyText={message.bodyText} mentions={message.mentions} />

                  {message.attachments.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs" data-testid="team-chat-message-attachments">
                      {message.attachments.map((att) => (
                        <li key={att.id} className="truncate text-[var(--text-2)]">
                          📎 {att.originalFilename}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {message.reactions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1" data-testid="team-chat-message-reactions">
                      {message.reactions.map((reaction) => (
                        <span
                          key={reaction.reactionKey}
                          className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs"
                        >
                          {TEAM_CHAT_REACTION_EMOJI[reaction.reactionKey]} {reaction.count}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {canSend ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        data-testid="team-chat-reply-button"
                        onClick={() =>
                          setReplyTo({
                            communicationId: message.id,
                            bodyText: message.bodyText.slice(0, 280),
                            senderPerson: message.senderPerson,
                          })
                        }
                      >
                        Antworten
                      </Button>
                    ) : null}
                    {TEAM_CHAT_REACTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="rounded-full px-2 py-1 text-sm hover:bg-[var(--surface)]"
                        aria-label={`Reaktion ${key}`}
                        data-testid={`team-chat-react-${message.id}-${key}`}
                        onClick={() =>
                          startTransition(async () => {
                            const active = !message.reactions.some(
                              (r) => r.reactionKey === key && r.reactedBySelf,
                            );
                            await toggleTeamChatReactionAction(teamId, message.id, key, active);
                            window.location.reload();
                          })
                        }
                      >
                        {TEAM_CHAT_REACTION_EMOJI[key]}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {canSend ? (
        <TeamChatComposer
          teamId={teamId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onSent={() => void refreshAfterSend()}
          onSend={async (payload) => sendTeamChatMessageAction(teamId, payload)}
        />
      ) : null}
    </div>
  );
}

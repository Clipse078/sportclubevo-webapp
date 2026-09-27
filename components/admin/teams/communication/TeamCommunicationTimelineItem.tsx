"use client";

import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import { Button } from "@/components/ui";
import { TEAM_CHAT_REACTION_EMOJI, TEAM_CHAT_REACTION_KEYS } from "@/lib/communication/team/team-chat-reactions";
import type { TeamChatMessageDto, TeamChatReplyPreviewDto } from "@/lib/communication/team/team-chat-service";
import { TeamChatMessageBody } from "@/components/admin/teams/communication/TeamChatMessageBody";

type Props = {
  message: TeamChatMessageDto;
  teamId: string;
  isOwn: boolean;
  canSend: boolean;
  onReply: (reply: TeamChatReplyPreviewDto) => void;
  onToggleReaction: (communicationId: string, reactionKey: string, active: boolean) => void;
  onAcknowledge: (communicationId: string) => void;
  pending: boolean;
  senderLabel: string;
  formatTime: (iso: string | null, fallback: string) => string;
};

export function TeamCommunicationTimelineItem({
  message,
  isOwn,
  canSend,
  onReply,
  onToggleReaction,
  onAcknowledge,
  pending,
  senderLabel,
  formatTime,
}: Props) {
  if (message.kind === "ANNOUNCEMENT" || message.kind === "ALERT") {
    const isAlert = message.kind === "ALERT";
    return (
      <article
        data-communication-id={message.id}
        data-testid={`team-formal-card-${message.id}`}
        className={`rounded-xl border px-4 py-3 ${
          isAlert
            ? "border-red-500/40 bg-red-500/10 shadow-sm"
            : "border-[var(--accent)]/30 bg-[var(--surface-2)]"
        } ${message.unreadForViewer ? "ring-2 ring-[var(--accent)]/40" : ""}`}
      >
        <header className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isAlert ? "bg-red-600 text-white" : "bg-[var(--accent)]/15 text-[var(--accent)]"
            }`}
            data-testid="team-formal-kind-badge"
          >
            {isAlert ? "Alarm" : "Mitteilung"}
          </span>
          {message.unreadForViewer ? (
            <span className="text-xs font-medium text-[var(--accent)]">Neu</span>
          ) : null}
        </header>

        {message.subject ? (
          <h3 className="text-base font-semibold text-[var(--foreground)]" data-testid="team-formal-title">
            {message.subject}
          </h3>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <CoordinatorAvatar name={senderLabel} compact />
          <span className="font-medium text-[var(--foreground)]">{senderLabel}</span>
          <time dateTime={message.publishedAt ?? message.createdAt}>
            {formatTime(message.publishedAt, message.createdAt)}
          </time>
        </div>

        <div className="mt-2 text-sm text-[var(--foreground)]">
          <TeamChatMessageBody bodyText={message.bodyText} mentions={message.mentions} />
        </div>

        {message.attachments.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs" data-testid="team-formal-attachments">
            {message.attachments.map((att) => (
              <li key={att.id} className="truncate text-[var(--text-2)]">
                📎 {att.originalFilename}
              </li>
            ))}
          </ul>
        ) : null}

        {message.canAcknowledge ? (
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              data-testid="team-formal-ack-button"
              onClick={() => onAcknowledge(message.id)}
            >
              Bestätigen
            </Button>
          </div>
        ) : message.viewerAcknowledged ? (
          <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="team-formal-ack-done">
            Bestätigt
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article
      data-communication-id={message.id}
      data-testid={`team-chat-message-${message.id}`}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      <CoordinatorAvatar name={senderLabel} compact />
      <div
        className={`max-w-[85%] rounded-2xl border px-3 py-2 ${
          isOwn
            ? "border-[var(--accent)]/30 bg-[var(--accent)]/10"
            : "border-[var(--border)] bg-[var(--surface-2)]"
        } ${message.unreadForViewer ? "border-l-4 border-l-[var(--accent)]" : ""}`}
      >
        <header className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-2)]">
          <span className="font-medium text-[var(--foreground)]">{senderLabel}</span>
          <time dateTime={message.publishedAt ?? message.createdAt}>
            {formatTime(message.publishedAt, message.createdAt)}
          </time>
          {message.unreadForViewer ? <span className="text-[var(--accent)]">Neu</span> : null}
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
                onReply({
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
                onToggleReaction(
                  message.id,
                  key,
                  !message.reactions.some((r) => r.reactionKey === key && r.reactedBySelf),
                )
              }
            >
              {TEAM_CHAT_REACTION_EMOJI[key]}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

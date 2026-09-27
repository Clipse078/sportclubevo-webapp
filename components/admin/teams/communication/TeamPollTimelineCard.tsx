"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { TeamChatMessageDto } from "@/lib/communication/team/team-chat-service";
import { formatPollOptionLabel } from "@/lib/communication/team/team-poll-presentation";

type Props = {
  message: TeamChatMessageDto;
  pending: boolean;
  onSubmitResponse: (communicationId: string, optionIds: string[]) => Promise<void>;
  onClosePoll?: (communicationId: string) => Promise<void>;
  onSelectWinner?: (communicationId: string, optionId: string) => Promise<void>;
  onCreateEvent?: (communicationId: string) => Promise<void>;
};

export function TeamPollTimelineCard({
  message,
  pending,
  onSubmitResponse,
  onClosePoll,
  onSelectWinner,
  onCreateEvent,
}: Props) {
  const poll = message.poll;
  const [selection, setSelection] = useState<string[]>(poll?.viewerSelectedOptionIds ?? []);
  const [localPending, startTransition] = useTransition();

  const isDatePoll = message.kind === "DATE_POLL";
  const badge = isDatePoll ? "Terminumfrage" : "Umfrage";

  const displayOptions = useMemo(() => poll?.options ?? [], [poll?.options]);

  if (!poll) return null;

  const toggleOption = (optionId: string) => {
    if (poll.mode === "SINGLE") {
      setSelection([optionId]);
      return;
    }
    setSelection((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  };

  const closedLabel = poll.isExpired
    ? "Abgelaufen"
    : poll.lifecycle === "CLOSED"
      ? "Geschlossen"
      : null;

  return (
    <article
      data-communication-id={message.id}
      data-testid={`team-poll-card-${message.id}`}
      className={`rounded-xl border border-[var(--accent)]/25 bg-[var(--surface-2)] px-4 py-3 ${
        message.unreadForViewer ? "ring-2 ring-[var(--accent)]/40" : ""
      }`}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]"
          data-testid="team-poll-kind-badge"
        >
          {badge}
        </span>
        {closedLabel ? (
          <span className="text-xs text-[var(--text-2)]" data-testid="team-poll-closed-state">
            {closedLabel}
          </span>
        ) : null}
        {poll.deadlineAt ? (
          <span className="text-xs text-[var(--text-2)]" data-testid="team-poll-deadline">
            Frist: {new Date(poll.deadlineAt).toLocaleString("de-CH")}
          </span>
        ) : null}
      </header>

      {message.subject ? (
        <h3 className="text-base font-semibold text-[var(--foreground)]">{message.subject}</h3>
      ) : null}

      {message.bodyText.trim() && message.bodyText.trim() !== "—" ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">{message.bodyText}</p>
      ) : null}

      <div className="mt-3 space-y-2" data-testid="team-poll-voting">
        {(poll.canViewResults ? displayOptions : displayOptions).map((opt) => {
          const label = formatPollOptionLabel(opt);
          const selected = selection.includes(opt.id);
          const showCounts = poll.canViewResults && poll.results;
          return (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                selected ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"
              } ${!poll.canRespond ? "cursor-default opacity-90" : ""}`}
            >
              <input
                type={poll.mode === "SINGLE" ? "radio" : "checkbox"}
                name={`poll-${message.id}`}
                checked={selected}
                disabled={!poll.canRespond || pending || localPending}
                onChange={() => toggleOption(opt.id)}
                data-testid={`team-poll-vote-${opt.id}`}
              />
              <span className="flex-1">{label}</span>
              {showCounts ? (
                <span className="text-xs text-[var(--text-2)]" data-testid="team-poll-option-count">
                  {opt.responseCount}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {poll.canRespond ? (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            disabled={pending || localPending || selection.length === 0}
            data-testid="team-poll-submit-response"
            onClick={() =>
              startTransition(async () => {
                await onSubmitResponse(message.id, selection);
              })
            }
          >
            Antwort senden
          </Button>
        </div>
      ) : poll.viewerSelectedOptionIds.length > 0 ? (
        <p className="mt-2 text-xs text-[var(--text-2)]">Ihre Antwort wurde gespeichert.</p>
      ) : null}

      {poll.canViewResults && poll.results ? (
        <div className="mt-3 text-xs text-[var(--text-2)]" data-testid="team-poll-results-summary">
          {poll.results.respondedRecipientCount} / {poll.results.eligibleRecipientCount} haben
          geantwortet
        </div>
      ) : null}

      {poll.canManage && poll.isOpen ? (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-testid="team-poll-close-button"
            disabled={pending || localPending}
            onClick={() =>
              startTransition(async () => {
                if (onClosePoll) await onClosePoll(message.id);
              })
            }
          >
            Umfrage schliessen
          </Button>
        </div>
      ) : null}

      {poll.canSelectWinner && onSelectWinner ? (
        <div className="mt-3 space-y-2" data-testid="team-date-poll-winner-actions">
          <p className="text-xs font-medium text-[var(--text-2)]">Gewinner-Termin wählen</p>
          {displayOptions.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={poll.selectedOptionId === opt.id ? "primary" : "secondary"}
              data-testid={`team-date-poll-select-winner-${opt.id}`}
              disabled={pending || localPending}
              onClick={() =>
                startTransition(async () => {
                  await onSelectWinner(message.id, opt.id);
                })
              }
            >
              {formatPollOptionLabel(opt)}
            </Button>
          ))}
        </div>
      ) : null}

      {poll.createdEventId ? (
        <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="team-date-poll-event-link">
          Event: {poll.createdEventId}
        </p>
      ) : poll.canCreateEvent && onCreateEvent ? (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            data-testid="team-date-poll-create-event"
            disabled={pending || localPending}
            onClick={() =>
              startTransition(async () => {
                await onCreateEvent(message.id);
              })
            }
          >
            Termin erstellen
          </Button>
        </div>
      ) : null}
    </article>
  );
}

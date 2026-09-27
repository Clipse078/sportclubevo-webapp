"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { TeamChatMessageDto } from "@/lib/communication/team/team-chat-service";
import { formatRequestSlotTime } from "@/lib/communication/team/team-request-presentation";

type Props = {
  message: TeamChatMessageDto;
  pending: boolean;
  onClaim: (communicationId: string, slotId: string) => Promise<void>;
  onUnclaim: (communicationId: string, slotId: string) => Promise<void>;
  onCloseRequest?: (communicationId: string) => Promise<void>;
};

export function TeamRequestTimelineCard({
  message,
  pending,
  onClaim,
  onUnclaim,
  onCloseRequest,
}: Props) {
  const request = message.request;
  const [localPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = pending || localPending;

  if (!request) return null;

  const closedLabel = request.isExpired
    ? "Abgelaufen"
    : request.lifecycle === "CLOSED"
      ? "Geschlossen"
      : request.aggregate.isFull
        ? "Vollständig besetzt"
        : null;

  return (
    <article
      data-communication-id={message.id}
      data-testid={`team-request-card-${message.id}`}
      className={`rounded-xl border border-[var(--accent)]/25 bg-[var(--surface-2)] px-4 py-3 ${
        message.unreadForViewer ? "ring-2 ring-[var(--accent)]/40" : ""
      }`}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]"
          data-testid="team-request-kind-badge"
        >
          Helfereinsatz
        </span>
        {closedLabel ? (
          <span className="text-xs text-[var(--text-2)]" data-testid="team-request-state-label">
            {closedLabel}
          </span>
        ) : null}
        {request.deadlineAt ? (
          <span className="text-xs text-[var(--text-2)]" data-testid="team-request-deadline">
            Frist: {new Date(request.deadlineAt).toLocaleString("de-CH")}
          </span>
        ) : null}
      </header>

      {message.subject ? (
        <h3 className="text-base font-semibold text-[var(--foreground)]">{message.subject}</h3>
      ) : null}

      {message.bodyText.trim() && message.bodyText.trim() !== " " ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">{message.bodyText}</p>
      ) : null}

      <p
        className="mt-2 text-xs text-[var(--text-2)]"
        data-testid="team-request-capacity-summary"
      >
        {request.aggregate.totalClaimed} / {request.aggregate.totalRequired} Plätze besetzt
        {request.canManage
          ? ` · ${request.aggregate.openSlotCount} offene Slots`
          : null}
      </p>

      <div className="mt-3 space-y-2" data-testid="team-request-slots">
        {request.slots.map((slot) => {
          const timeLabel = formatRequestSlotTime(slot);
          return (
            <div
              key={slot.id}
              className="rounded-lg border border-[var(--border)] px-3 py-2"
              data-testid={`team-request-slot-${slot.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{slot.label}</p>
                  {timeLabel ? (
                    <p className="text-xs text-[var(--text-2)]">{timeLabel}</p>
                  ) : null}
                  <p className="text-xs text-[var(--text-2)]" data-testid="team-request-slot-capacity">
                    {slot.claimedCapacity}/{slot.requiredCapacity} besetzt
                    {slot.isFull ? " · voll" : ` · ${slot.remainingCapacity} frei`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {slot.viewerHasClaim ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!request.canClaim || busy}
                      data-testid={`team-request-unclaim-${slot.id}`}
                      onClick={() =>
                        startTransition(async () => {
                          setActionError(null);
                          try {
                            await onUnclaim(message.id, slot.id);
                          } catch (e) {
                            setActionError(e instanceof Error ? e.message : "Fehler");
                          }
                        })
                      }
                    >
                      Abmelden
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!request.canClaim || slot.isFull || busy}
                      data-testid={`team-request-claim-${slot.id}`}
                      onClick={() =>
                        startTransition(async () => {
                          setActionError(null);
                          try {
                            await onClaim(message.id, slot.id);
                          } catch (e) {
                            setActionError(e instanceof Error ? e.message : "Fehler");
                          }
                        })
                      }
                    >
                      Übernehmen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {request.canManage && request.isOpen && onCloseRequest ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            data-testid="team-request-close-button"
            onClick={() =>
              startTransition(async () => {
                await onCloseRequest(message.id);
              })
            }
          >
            Anfrage schliessen
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-2 text-sm text-red-600" data-testid="team-request-action-error">
          {actionError}
        </p>
      ) : null}
    </article>
  );
}

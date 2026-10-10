"use client";

import { useState, useTransition } from "react";
import type { ParticipationResponseStatus } from "@prisma/client";
import MatchAvailabilityStatusBadge from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import { getMatchParticipationStatusPresentation } from "@/lib/match-squad/match-availability-presentation";

type Props = {
  matchId: string;
  personId: string;
  displayName: string;
  disabled: boolean;
  /** True when a ParticipationResponse row exists (including OPEN reset state). */
  hasParticipationResponse: boolean;
  onRecorded: () => void;
};

const RECORD_OPTIONS: ParticipationResponseStatus[] = ["YES", "NO", "MAYBE"];

export default function MatchAvailabilityTrainerRecordMenu({
  matchId,
  personId,
  displayName,
  disabled,
  hasParticipationResponse,
  onRecorded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actionLabel = hasParticipationResponse ? "Rückmeldung verwalten" : "Rückmeldung eintragen";

  function record(status: ParticipationResponseStatus) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/matchcenter/${matchId}/participation-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, status }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setOpen(false);
      onRecorded();
    });
  }

  return (
    <div className="relative shrink-0" data-testid={`match-availability-trainer-${personId}`}>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-8 max-w-[9.5rem] items-center rounded-md border border-[var(--border)]/80 bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid={`match-availability-manage-${personId}`}
      >
        <span className="truncate">{actionLabel}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[13rem] rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
          data-testid={`match-availability-menu-${personId}`}
        >
          <p className="px-2 py-1 text-[10px] font-medium text-[var(--muted)]">{displayName}</p>
          <p className="px-2 pb-1 text-[10px] text-[var(--muted)]">
            Externe Rückmeldung eintragen (z. B. telefonisch). Wird als «Vom Trainer eingetragen»
            gespeichert.
          </p>
          {RECORD_OPTIONS.map((status) => {
            const presentation = getMatchParticipationStatusPresentation(status);
            return (
              <button
                key={status}
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => record(status)}
                className="flex w-full items-center rounded px-2 py-1.5 hover:bg-[var(--surface-2)]"
                data-testid={`match-availability-record-${status.toLowerCase()}-${personId}`}
              >
                <MatchAvailabilityStatusBadge
                  label={presentation.label}
                  tone={presentation.tone}
                  icon={presentation.icon}
                />
              </button>
            );
          })}
          <div className="my-1 border-t border-[var(--border)]/60" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={() => record("OPEN")}
            className="flex w-full rounded px-2 py-1.5 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]"
            data-testid={`match-availability-reset-${personId}`}
          >
            Rückmeldung zurücksetzen
          </button>
          {error ? (
            <p className="px-2 py-1 text-[10px] text-[var(--destructive)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

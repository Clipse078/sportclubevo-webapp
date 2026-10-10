"use client";

import { useState, useTransition } from "react";
import type { ParticipationResponseStatus } from "@prisma/client";

type Props = {
  matchId: string;
  personId: string;
  displayName: string;
  disabled: boolean;
  onRecorded: () => void;
};

const OPTIONS: { status: ParticipationResponseStatus; label: string }[] = [
  { status: "YES", label: "Verfügbar" },
  { status: "NO", label: "Nicht verfügbar" },
  { status: "MAYBE", label: "Unsicher" },
  { status: "OPEN", label: "Offen (zurücksetzen)" },
];

export default function MatchAvailabilityTrainerRecordMenu({
  matchId,
  personId,
  displayName,
  disabled,
  onRecorded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        className="inline-flex min-h-8 items-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface-4)] disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid={`match-availability-manage-${personId}`}
      >
        Verfügbarkeit
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
          data-testid={`match-availability-menu-${personId}`}
        >
          <p className="px-2 py-1 text-[10px] font-medium text-[var(--muted)]">{displayName}</p>
          {OPTIONS.map((option) => (
            <button
              key={option.status}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => record(option.status)}
              className="flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]"
            >
              {option.label}
            </button>
          ))}
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

"use client";

import { useState, useTransition } from "react";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import type { MatchAvailabilityCollectionMetaView } from "@/lib/match-squad/types";

type Props = {
  matchId: string;
  timeZone: string;
  meta: MatchAvailabilityCollectionMetaView;
  canManage: boolean;
  onChanged: () => void;
};

export default function MatchAvailabilityCollectionPanel({
  matchId,
  timeZone,
  meta,
  canManage,
  onChanged,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendReminder() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(`/api/matchcenter/${matchId}/participation-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        recipientCount?: number;
        duplicate?: boolean;
        outstandingPlayerCount?: number;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Erinnerung konnte nicht gesendet werden.");
        return;
      }
      if (data?.message) {
        setSuccess(data.message);
        return;
      }
      if (data?.duplicate) {
        setSuccess("Erinnerung wurde bereits kürzlich gesendet.");
        return;
      }
      setSuccess(
        `Erinnerung gesendet an ${data?.recipientCount ?? 0} Empfänger (${data?.outstandingPlayerCount ?? meta.outstandingPlayerCount} Spieler offen).`,
      );
      onChanged();
    });
  }

  const disabled = !canManage || Boolean(meta.readOnlyReason) || pending;

  return (
    <div
      className="mb-4 space-y-3 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-2)] p-3"
      data-testid="match-availability-collection-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Verfügbarkeit</h3>
          <p className="text-xs text-[var(--muted)]">
            Rückmeldungen der Spieler — getrennt vom Aufgebot.
          </p>
        </div>
        {meta.requestActive ? (
          <span
            className="inline-flex rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]"
            data-testid="match-availability-request-active"
          >
            Anfrage aktiv
          </span>
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Keine Anfrage
          </span>
        )}
      </div>

      {meta.readOnlyReason ? (
        <p className="text-xs text-[var(--muted)]" data-testid="match-availability-readonly">
          {meta.readOnlyReason}
        </p>
      ) : null}

      {meta.canConfigureRequest ? (
        <ParticipationRequestConfigEditor
          apiPath={`/api/matchcenter/${matchId}/participation-request`}
          timeZone={timeZone}
          disabled={disabled}
          values={{
            participationResponseDueAt: meta.participationResponseDueAt,
            participationReminder1At: meta.participationReminder1At,
            participationReminder2At: meta.participationReminder2At,
            participationReminder1PresetKey: meta.participationReminder1PresetKey,
            participationReminder2PresetKey: meta.participationReminder2PresetKey,
          }}
          onSaved={() => {
            setSuccess(null);
            onChanged();
          }}
          onError={(message) => setError(message)}
        />
      ) : null}

      {meta.requestActive && meta.canSendReminder && !meta.readOnlyReason ? (
        <div className="space-y-2 border-t border-[var(--border)]/40 pt-3">
          <p className="text-xs text-[var(--text-2)]" data-testid="match-availability-reminder-preview">
            {meta.outstandingPlayerCount} Spieler ohne Rückmeldung (Offen)
            {meta.reminderDeliveryTargetCount != null ? (
              <>
                {" "}
                · ca. {meta.reminderDeliveryTargetCount} Benachrichtigungsempfänger
              </>
            ) : null}
            . Unsicher (MAYBE) wird nicht erinnert.
          </p>
          <button
            type="button"
            disabled={disabled || meta.outstandingPlayerCount === 0}
            onClick={sendReminder}
            className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-4)] disabled:opacity-50"
            data-testid="match-availability-send-reminder"
          >
            {pending ? "Sendet…" : "Erinnerung senden (nur Offen)"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-xs text-[var(--foreground)]" data-testid="match-availability-success">
          {success}
        </p>
      ) : null}
    </div>
  );
}

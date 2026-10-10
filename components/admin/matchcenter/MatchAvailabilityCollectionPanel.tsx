"use client";

import { useState, useTransition } from "react";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import { Dialog } from "@/components/ui/Dialog";
import type { MatchAvailabilityCollectionMetaView } from "@/lib/match-squad/types";
import { formatDateTimeCompact } from "@/lib/tenant-runtime/formatters";

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
  const [manageOpen, setManageOpen] = useState(false);

  const formatCfg = { locale: "de-CH", timezone: timeZone };
  const disabled = !canManage || Boolean(meta.readOnlyReason) || pending;

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

  const deadlineSummary =
    meta.requestActive && meta.participationResponseDueAt
      ? formatDateTimeCompact(meta.participationResponseDueAt, formatCfg)
      : null;

  const manageDialogTitle = meta.requestActive
    ? "Verfügbarkeit verwalten"
    : "Rückmeldung anfragen";

  return (
    <>
      <div
        className="mb-5 flex flex-col gap-3 border-b border-[var(--border)]/50 pb-4 sm:flex-row sm:items-start sm:justify-between"
        data-testid="match-availability-collection-panel"
      >
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Verfügbarkeit</h3>
          {!meta.requestActive ? (
            <p className="text-sm text-[var(--muted)]" data-testid="match-availability-no-request">
              Noch keine Rückmeldung angefragt.
            </p>
          ) : (
            <div className="space-y-0.5 text-sm text-[var(--foreground)]">
              {deadlineSummary ? (
                <p data-testid="match-availability-deadline-summary">
                  Rückmeldung bis {deadlineSummary}
                </p>
              ) : null}
              <p className="text-[var(--muted)]" data-testid="match-availability-outstanding-summary">
                {meta.outstandingPlayerCount}{" "}
                {meta.outstandingPlayerCount === 1 ? "Spieler offen" : "Spieler offen"}
              </p>
            </div>
          )}

          {meta.readOnlyReason ? (
            <p className="text-xs text-[var(--muted)]" data-testid="match-availability-readonly">
              {meta.readOnlyReason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {meta.canConfigureRequest && canManage && !meta.readOnlyReason ? (
            <>
              {!meta.requestActive ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setManageOpen(true)}
                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/15 disabled:opacity-50"
                  data-testid="match-availability-request-cta"
                >
                  Rückmeldung anfragen
                </button>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setManageOpen(true)}
                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-4)] disabled:opacity-50"
                  data-testid="match-availability-manage-cta"
                >
                  Verwalten
                </button>
              )}
            </>
          ) : null}

          {meta.requestActive && meta.canSendReminder && canManage && !meta.readOnlyReason ? (
            <button
              type="button"
              disabled={disabled || meta.outstandingPlayerCount === 0}
              onClick={sendReminder}
              className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
              data-testid="match-availability-send-reminder"
            >
              {pending ? "Sendet…" : "Offene erinnern"}
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="w-full text-xs text-[var(--destructive)] sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="w-full text-xs text-[var(--foreground)]"
            data-testid="match-availability-success"
          >
            {success}
          </p>
        ) : null}
      </div>

      <Dialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title={manageDialogTitle}
        description="Deadline und Erinnerungen für Spieler-Rückmeldungen."
        size="lg"
      >
        {meta.canConfigureRequest ? (
          <ParticipationRequestConfigEditor
            apiPath={`/api/matchcenter/${matchId}/participation-request`}
            timeZone={timeZone}
            disabled={disabled}
            layout="sessionEdit"
            values={{
              participationResponseDueAt: meta.participationResponseDueAt,
              participationReminder1At: meta.participationReminder1At,
              participationReminder2At: meta.participationReminder2At,
              participationReminder1PresetKey: meta.participationReminder1PresetKey,
              participationReminder2PresetKey: meta.participationReminder2PresetKey,
            }}
            onSaved={() => {
              setSuccess(null);
              setManageOpen(false);
              onChanged();
            }}
            onError={(message) => setError(message)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatBillingDate } from "@/lib/billing/format-billing-date";
import {
  presentDunningBadgeTone,
  presentDunningStatusLabel,
} from "@/lib/billing/dunning-presentation";
import type { PlatformBillingDunningInfo } from "@/lib/billing/platform-billing-detail-service";

type Props = {
  tenantKey: string;
  dunning: PlatformBillingDunningInfo;
  canManage: boolean;
};

async function postDunning(
  path: string,
  body?: Record<string, unknown>,
  method: "POST" | "DELETE" = "POST",
) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: typeof data?.error === "string" ? data.error : "Aktion fehlgeschlagen." };
  }
  return {};
}

export default function PlatformBillingDunningPanel({
  tenantKey,
  dunning,
  canManage,
}: Props) {
  const router = useRouter();
  const base = `/api/platform/billing/tenants/${encodeURIComponent(tenantKey)}/dunning`;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exemptOpen, setExemptOpen] = useState(false);
  const [exemptUntil, setExemptUntil] = useState("");
  const [exemptNote, setExemptNote] = useState("");

  const label = presentDunningStatusLabel(dunning.dunningStatus);
  const tone = presentDunningBadgeTone(dunning.dunningStatus);

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Zahlungsstatus &amp; Mahnwesen
          </h2>
          <p className="text-sm text-[var(--text-2)]">
            SCE-Kulanzfrist und automatische Zugangssperre bei ausbleibender Zahlung.
          </p>
        </div>
        <BillingStatusBadge label={label} tone={tone} />
      </div>

      {dunning.reconciliationRequired ? (
        <div className="rounded-md border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-3 py-2 text-sm text-[var(--sce-warning)]">
          Abgleich erforderlich: Stripe und SCE-Lifecycle können voneinander abweichen. Bitte
          Zahlungsstatus prüfen, bevor Sie manuelle Lifecycle-Aktionen ausführen.
        </div>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {dunning.firstPaymentFailureAt ? (
          <div>
            <dt className="text-[var(--muted)]">Erste fehlgeschlagene Zahlung</dt>
            <dd>{formatBillingDate(dunning.firstPaymentFailureAt)}</dd>
          </div>
        ) : null}
        {dunning.gracePeriodEndsAt ? (
          <div>
            <dt className="text-[var(--muted)]">Zahlungsfrist</dt>
            <dd>
              {formatBillingDate(dunning.gracePeriodEndsAt)}
              {dunning.dunningStatus === "GRACE_PERIOD" ? (
                <p className="mt-1 text-[var(--text-2)]">
                  Automatische Sperrung am {formatBillingDate(dunning.gracePeriodEndsAt)}, falls
                  die Zahlung bis dahin nicht geklärt ist.
                </p>
              ) : null}
            </dd>
          </div>
        ) : null}
        {dunning.automaticallySuspendedAt ? (
          <div>
            <dt className="text-[var(--muted)]">Automatisch gesperrt am</dt>
            <dd>{formatBillingDate(dunning.automaticallySuspendedAt)}</dd>
          </div>
        ) : null}
        {dunning.resolvedAt ? (
          <div>
            <dt className="text-[var(--muted)]">Zahlung geklärt am</dt>
            <dd>{formatBillingDate(dunning.resolvedAt)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--muted)]">Automatische Sperrung</dt>
          <dd>{dunning.automaticDunningEnabled ? "Aktiv" : "Deaktiviert"}</dd>
        </div>
        {dunning.dunningExemptUntil ? (
          <div>
            <dt className="text-[var(--muted)]">Ausnahme bis</dt>
            <dd>
              {formatBillingDate(dunning.dunningExemptUntil)}
              {dunning.dunningExemptNote ? (
                <span className="block text-[var(--text-2)]">{dunning.dunningExemptNote}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {error ? <p className="text-sm text-[var(--sce-danger)]">{error}</p> : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => postDunning(`${base}/recheck`))}
          >
            Zahlungsstatus jetzt prüfen
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(() =>
                postDunning(`${base}/automation`, {
                  enabled: !dunning.automaticDunningEnabled,
                }),
              )
            }
          >
            {dunning.automaticDunningEnabled
              ? "Automatische Sperrung deaktivieren"
              : "Automatische Sperrung aktivieren"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => setExemptOpen(true)}
          >
            Ausnahme setzen
          </Button>
          {dunning.dunningExemptUntil ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => postDunning(`${base}/exemption`, undefined, "DELETE"))}
            >
              Ausnahme aufheben
            </Button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={exemptOpen} onClose={() => setExemptOpen(false)} title="Ausnahme setzen">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-[var(--text-2)]">Ausnahme bis</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1"
              value={exemptUntil}
              onChange={(e) => setExemptUntil(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--text-2)]">Notiz (optional)</span>
            <textarea
              className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1"
              rows={3}
              value={exemptNote}
              onChange={(e) => setExemptNote(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setExemptOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              disabled={busy || !exemptUntil}
              onClick={() =>
                run(async () => {
                  const result = await postDunning(`${base}/exemption`, {
                    exemptUntil: new Date(exemptUntil).toISOString(),
                    note: exemptNote,
                  });
                  if (!result.error) {
                    setExemptOpen(false);
                  }
                  return result;
                })
              }
            >
              Speichern
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import {
  presentRecurringBillingOutcomeDe,
  recurringBillingOutcomeTone,
} from "@/lib/billing/recurring/recurring-billing-outcome-labels";
import type {
  RecurringBillingAutomationStatus,
  RecurringBillingRunSummary,
} from "@/lib/billing/recurring/recurring-billing-types";
import { BILLING_WORKSPACE_BASE } from "@/lib/nav/billing-workspace-nav";

type Props = {
  initialAutomation: RecurringBillingAutomationStatus;
};

type RunResponse = {
  runKey: string | null;
  summary: RecurringBillingRunSummary;
};

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--border)_50%,transparent)] px-4 py-3">
      <p className="text-xs text-[var(--text-2)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export default function BillingRecurringAutomationPanel({ initialAutomation }: Props) {
  const [automation, setAutomation] = useState(initialAutomation);
  const [lastSummary, setLastSummary] = useState<RecurringBillingRunSummary | null>(
    initialAutomation.lastRun?.summary ?? null,
  );
  const [loading, setLoading] = useState<"preview" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAutomation = useCallback(async () => {
    const res = await fetch("/api/platform/billing/recurring-runs");
    if (!res.ok) return;
    const data = (await res.json()) as { automation: RecurringBillingAutomationStatus };
    setAutomation(data.automation);
    if (data.automation.lastRun?.summary) {
      setLastSummary(data.automation.lastRun.summary);
    }
  }, []);

  const runPreview = async () => {
    setError(null);
    setLoading("preview");
    try {
      const res = await fetch("/api/platform/billing/recurring-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DRY_RUN" }),
      });
      const payload = (await res.json()) as RunResponse & { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Vorschau fehlgeschlagen.");
        return;
      }
      setLastSummary(payload.summary);
      await refreshAutomation();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  };

  const last = automation.lastRun;
  const previewMode = lastSummary?.mode === "DRY_RUN";

  return (
    <BillingPanel
      title="Automatische Abrechnung"
      description="Wiederkehrende Vertragsabrechnung — nur Vorschau erzeugt keine Rechnungen, keinen Versand und keine Zahlungen."
    >
      <div className="space-y-6">
        <div
          className="rounded-lg border border-[color-mix(in_srgb,var(--sce-primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-primary)_6%,transparent)] px-4 py-3 text-sm text-[var(--foreground)]"
          role="status"
        >
          <p className="font-medium">Nur-Lese-Vorschau (DRY RUN)</p>
          <p className="mt-1 text-[var(--text-2)]">
            «Vorschau ausführen» wertet aktive Verträge aus, ohne Rechnungen zu erstellen, zu
            finalisieren oder E-Mails zu senden. Ergebnisse dienen der PO-Abnahme.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-[var(--text-2)]">Scheduler</dt>
            <dd>
              <BillingStatusBadge
                label={automation.scheduler.enabled ? "Geschützt (Cron)" : "Cron-Secret fehlt"}
                tone={automation.scheduler.enabled ? "success" : "warning"}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-[var(--text-2)]">Nächste Auswertung</dt>
            <dd className="text-[var(--foreground)]">{automation.scheduler.nextEvaluationHint}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm sm:col-span-2">
            <dt className="text-[var(--text-2)]">Letzter Lauf</dt>
            <dd className="text-right text-[var(--foreground)]">
              {last
                ? `${last.startedAt.slice(0, 16).replace("T", " ")} · ${last.mode} · ${last.trigger}`
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void runPreview()}
            className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] disabled:opacity-50"
          >
            {loading === "preview" ? "Vorschau läuft…" : "Vorschau ausführen"}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Stichtag: heute (UTC). Keine Ausführung / kein Versand in dieser Ansicht.
          </span>
        </div>

        {lastSummary ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <BillingStatusBadge
                label={previewMode ? "Modus: Vorschau" : "Modus: Ausführung"}
                tone={previewMode ? "default" : "warning"}
              />
              <span className="text-[var(--text-2)]">
                Stichtag {lastSummary.asOfDate} · {lastSummary.contractsEvaluated} Vertrag
                {lastSummary.contractsEvaluated === 1 ? "" : "e"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Verträge" value={lastSummary.contractsEvaluated} />
              <Metric label="Erstellt" value={lastSummary.invoicesCreated} />
              <Metric label="Versendet" value={lastSummary.invoicesSent} />
              <Metric label="Übersprungen" value={lastSummary.skipped} />
              <Metric label="Blockiert" value={lastSummary.blocked} />
              <Metric label="Fehler" value={lastSummary.failed} />
            </div>
          </>
        ) : null}

        {lastSummary && lastSummary.results.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[color-mix(in_srgb,var(--border)_45%,transparent)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] text-[var(--text-2)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Vertrag</th>
                  <th className="px-3 py-2 font-medium">Kunde</th>
                  <th className="px-3 py-2 font-medium">Periode</th>
                  <th className="px-3 py-2 font-medium">Ergebnis</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {lastSummary.results.map((row) => (
                  <tr
                    key={`${row.contractKey}-${row.periodStart ?? "na"}`}
                    className="border-t border-[color-mix(in_srgb,var(--border)_35%,transparent)]"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{row.contractNumber}</td>
                    <td className="px-3 py-2 text-xs text-[var(--text-2)]">
                      {row.customerName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-2)]">
                      {row.periodStart && row.periodEnd
                        ? `${row.periodStart} – ${row.periodEnd}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <BillingStatusBadge
                        label={presentRecurringBillingOutcomeDe(row.outcome)}
                        tone={recurringBillingOutcomeTone(row.outcome)}
                      />
                    </td>
                    <td className="max-w-md px-3 py-2 text-xs text-[var(--text-2)]">
                      {row.reason}
                      {row.invoiceNumber ? (
                        <>
                          {" "}
                          · Rechnung{" "}
                          <Link
                            href={`${BILLING_WORKSPACE_BASE}/invoices/${row.invoiceKey ?? ""}`}
                            className="font-mono underline-offset-2 hover:underline"
                          >
                            {row.invoiceNumber}
                          </Link>
                        </>
                      ) : null}
                      {row.grossTotalMinor != null && row.outcome === "PREVIEW_WOULD_CREATE" ? (
                        <> · Brutto CHF {(row.grossTotalMinor / 100).toFixed(2)}</>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

        <p className="text-xs text-[var(--muted)]">
          Echte Ausführung («Abrechnung ausführen») ist bewusst nicht in dieser Abnahme-Oberfläche
          enthalten. Nach PO-Freigabe erfolgt Ausführung über gesicherte API/Cron — nie über
          Vorschau.
        </p>
      </div>
    </BillingPanel>
  );
}

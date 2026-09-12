"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CAMT054_MAX_UPLOAD_BYTES } from "@/lib/billing/camt054-reconciliation/camt054-upload-limits";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";

type LegalEntityOption = { key: string; displayName: string };

type ImportRow = {
  key: string;
  filename: string;
  uploadedAt: string;
  transactionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  status: string;
};

type DryRunEntry = {
  bankTransactionId: string;
  outcome: string;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  paymentKey: string | null;
  message: string | null;
  matchStatus: string;
  matchStatusLabel: string;
  matchMethod: string | null;
  matchMethodLabel: string | null;
  transaction: {
    amountMinor: number;
    currency: string;
    paymentDate: string;
    creditorReferenceFormatted: string | null;
    debtorName: string | null;
  };
};

type DryRunReport = {
  dryRun: boolean;
  matchedCount: number;
  unmatchedCount: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  errorCount: number;
  appliedCount: number;
  entries: DryRunEntry[];
  importKey: string | null;
};

type Props = {
  legalEntities: LegalEntityOption[];
  initialLegalEntityKey: string | null;
  initialImports: ImportRow[];
  canManage: boolean;
};

function importStatusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Abgeschlossen";
    case "PARTIAL":
      return "Teilweise";
    case "FAILED":
      return "Fehler";
    default:
      return status;
  }
}

export default function NativeBillingReconciliationWorkspace({
  legalEntities,
  initialLegalEntityKey,
  initialImports,
  canManage,
}: Props) {
  const router = useRouter();
  const [legalEntityKey, setLegalEntityKey] = useState(
    initialLegalEntityKey ?? legalEntities[0]?.key ?? "",
  );
  const [imports, setImports] = useState(initialImports);
  const [file, setFile] = useState<File | null>(null);
  const [fileXml, setFileXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [executeSuccess, setExecuteSuccess] = useState<{
    importKey: string | null;
    invoiceKey: string | null;
    invoiceNumber: string | null;
  } | null>(null);

  const refreshImports = useCallback(async () => {
    if (!legalEntityKey) return;
    const res = await fetch(
      `/api/platform/billing/legal-entities/${legalEntityKey}/camt054-reconciliation`,
    );
    const data = (await res.json()) as {
      reconciliation?: { imports: ImportRow[] };
      error?: string;
    };
    if (res.ok && data.reconciliation) {
      setImports(data.reconciliation.imports);
    }
  }, [legalEntityKey]);

  async function onLegalEntityChange(nextKey: string) {
    setLegalEntityKey(nextKey);
    setDryRunReport(null);
    setExecuteSuccess(null);
    setFile(null);
    setFileXml(null);
    const res = await fetch(
      `/api/platform/billing/legal-entities/${nextKey}/camt054-reconciliation`,
    );
    const data = (await res.json()) as {
      reconciliation?: { imports: ImportRow[] };
    };
    if (res.ok && data.reconciliation) {
      setImports(data.reconciliation.imports);
    }
  }

  async function onFileSelected(selected: File | null) {
    setError(null);
    setDryRunReport(null);
    setExecuteSuccess(null);
    if (!selected) {
      setFile(null);
      setFileXml(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".xml")) {
      setError("Nur .xml Dateien sind erlaubt.");
      return;
    }
    if (selected.size > CAMT054_MAX_UPLOAD_BYTES) {
      setError("Die Datei ist zu gross (max. 5 MB).");
      return;
    }
    const text = await selected.text();
    setFile(selected);
    setFileXml(text);
  }

  async function runDryRun() {
    if (!fileXml || !legalEntityKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/legal-entities/${legalEntityKey}/camt054-reconciliation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml: fileXml, dryRun: true }),
        },
      );
      const data = (await res.json()) as { reconciliation?: DryRunReport; error?: string };
      if (!res.ok || !data.reconciliation) {
        throw new Error(data.error ?? "Vorschau fehlgeschlagen.");
      }
      setDryRunReport(data.reconciliation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler bei der Vorschau.");
    } finally {
      setLoading(false);
    }
  }

  const executeSummary = useMemo(() => {
    if (!dryRunReport) return null;
    const toBook = dryRunReport.entries.filter((e) => e.outcome === "planned");
    const invoiceNumbers = [...new Set(toBook.map((e) => e.invoiceNumber).filter(Boolean))];
    return {
      paymentCount: toBook.length,
      invoiceNumbers,
      firstInvoiceKey: toBook[0]?.invoiceKey ?? null,
      firstInvoiceNumber: toBook[0]?.invoiceNumber ?? null,
    };
  }, [dryRunReport]);

  async function executeImport() {
    if (!fileXml || !file || !legalEntityKey || !dryRunReport) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/legal-entities/${legalEntityKey}/camt054-reconciliation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            xml: fileXml,
            dryRun: false,
            filename: file.name,
          }),
        },
      );
      const data = (await res.json()) as { reconciliation?: DryRunReport; error?: string };
      if (!res.ok || !data.reconciliation) {
        throw new Error(data.error ?? "Import fehlgeschlagen.");
      }
      setExecuteSuccess({
        importKey: data.reconciliation.importKey,
        invoiceKey: executeSummary?.firstInvoiceKey ?? null,
        invoiceNumber: executeSummary?.firstInvoiceNumber ?? null,
      });
      setDryRunReport(null);
      setFile(null);
      setFileXml(null);
      await refreshImports();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {legalEntities.length > 1 ? (
        <div className="max-w-md space-y-1">
          <label className="text-sm font-medium" htmlFor="legal-entity-select">
            Rechtsträger
          </label>
          <select
            id="legal-entity-select"
            className="fca-input w-full"
            value={legalEntityKey}
            onChange={(e) => onLegalEntityChange(e.target.value)}
          >
            {legalEntities.map((entity) => (
              <option key={entity.key} value={entity.key}>
                {entity.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {canManage ? (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">camt.054 importieren</h2>
            <label className="fca-button-primary cursor-pointer">
              Datei wählen
              <input
                type="file"
                accept=".xml,application/xml,text/xml"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {file ? (
            <p className="text-sm text-muted-foreground">
              Ausgewählt: <span className="font-medium text-foreground">{file.name}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nur XML-Dateien bis 5 MB. Zuerst wird eine Vorschau ohne Buchung erstellt.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="fca-button-secondary"
              disabled={!fileXml || loading}
              onClick={runDryRun}
            >
              {loading ? "Prüfe…" : "Vorschau / Dry-Run"}
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </section>
      ) : null}

      {dryRunReport ? (
        <section className="space-y-4 rounded-lg border border-border p-6">
          <h2 className="text-base font-semibold">Vorschau Abgleich</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-muted-foreground">Transaktionen</dt>
              <dd className="text-lg font-semibold">{dryRunReport.entries.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zugeordnet</dt>
              <dd className="text-lg font-semibold">{dryRunReport.matchedCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nicht zugeordnet</dt>
              <dd className="text-lg font-semibold">{dryRunReport.unmatchedCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Prüfung erforderlich</dt>
              <dd className="text-lg font-semibold">{dryRunReport.reviewRequiredCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duplikate</dt>
              <dd className="text-lg font-semibold">{dryRunReport.duplicateCount}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4">Betrag</th>
                  <th className="py-2 pr-4">Referenz</th>
                  <th className="py-2 pr-4">Zahler</th>
                  <th className="py-2 pr-4">Rechnung</th>
                  <th className="py-2">Ergebnis</th>
                </tr>
              </thead>
              <tbody>
                {dryRunReport.entries.map((entry) => (
                  <tr key={entry.bankTransactionId} className="border-b border-border/60">
                    <td className="py-2 pr-4 whitespace-nowrap">{entry.transaction.paymentDate}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatBillingMoney(entry.transaction.amountMinor, entry.transaction.currency)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {entry.transaction.creditorReferenceFormatted ?? "—"}
                    </td>
                    <td className="py-2 pr-4">{entry.transaction.debtorName ?? "—"}</td>
                    <td className="py-2 pr-4">{entry.invoiceNumber ?? "—"}</td>
                    <td className="py-2">
                      <div className="font-medium">{entry.matchStatusLabel}</div>
                      {entry.matchMethodLabel ? (
                        <div className="text-xs text-muted-foreground">
                          Match: {entry.matchMethodLabel}
                        </div>
                      ) : null}
                      {entry.message ? (
                        <div className="text-xs text-muted-foreground">{entry.message}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManage && executeSummary && executeSummary.paymentCount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm space-y-3">
              <p>
                <strong>{executeSummary.paymentCount}</strong> Banktransaktion(en) würden als
                Zahlung verbucht. Betroffene Rechnung(en):{" "}
                <strong>{executeSummary.invoiceNumbers.join(", ") || "—"}</strong>. Bereits
                verbuchte Banktransaktionen werden nicht erneut erfasst (Idempotenz über
                Banktransaktions-ID).
              </p>
              <button
                type="button"
                className="fca-button-primary"
                disabled={loading}
                onClick={executeImport}
              >
                {loading ? "Verbuche…" : "Abgleich verbuchen"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {executeSuccess ? (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm space-y-2">
          <p className="font-medium text-green-900">Abgleich erfolgreich verbucht.</p>
          {executeSuccess.invoiceKey ? (
            <Link
              href={`/dashboard/admin/commercial/billing/invoices/${executeSuccess.invoiceKey}`}
              className="text-green-800 underline"
            >
              Zur Rechnung {executeSuccess.invoiceNumber ?? ""}
            </Link>
          ) : null}
          {executeSuccess.importKey ? (
            <Link
              href={`/dashboard/admin/commercial/billing/reconciliation/imports/${executeSuccess.importKey}`}
              className="text-green-800 underline"
            >
              Import-Details anzeigen
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Import-Historie</h2>
        {imports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Noch keine camt.054 Importe. Laden Sie eine Bankdatei hoch, um Zahlungseingänge per
            QRR zuzuordnen.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3">Datei</th>
                  <th className="px-4 py-3">Importiert am</th>
                  <th className="px-4 py-3">Transaktionen</th>
                  <th className="px-4 py-3">Zugeordnet</th>
                  <th className="px-4 py-3">Nicht zugeordnet</th>
                  <th className="px-4 py-3">Prüfung erforderlich</th>
                  <th className="px-4 py-3">Duplikate</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((row) => (
                  <tr key={row.key} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/admin/commercial/billing/reconciliation/imports/${row.key}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(row.uploadedAt).toLocaleString("de-CH")}
                    </td>
                    <td className="px-4 py-3">{row.transactionCount}</td>
                    <td className="px-4 py-3">{row.matchedCount}</td>
                    <td className="px-4 py-3">{row.unmatchedCount}</td>
                    <td className="px-4 py-3">{row.reviewRequiredCount}</td>
                    <td className="px-4 py-3">{row.duplicateCount}</td>
                    <td className="px-4 py-3">{importStatusLabel(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

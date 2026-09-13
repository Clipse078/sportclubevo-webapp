"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";

type TransactionRow = {
  key: string;
  paymentDate: string;
  amountMinor: number;
  currency: string;
  creditorReferenceFormatted: string | null;
  debtorName: string | null;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  matchStatus: string;
  matchStatusLabel: string;
  matchMethodLabel: string | null;
  matchReason: string | null;
};

type EligibleInvoice = {
  invoiceKey: string;
  invoiceNumber: string | null;
  customerName: string;
  grossTotalMinor: number;
  paidTotalMinor: number;
  outstandingMinor: number;
  currency: string;
};

type Props = {
  legalEntityKey: string;
  filename: string;
  transactions: TransactionRow[];
  canManage: boolean;
};

export default function NativeBillingReconciliationImportDetail({
  legalEntityKey,
  filename,
  transactions: initialTransactions,
  canManage,
}: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activeTxKey, setActiveTxKey] = useState<string | null>(null);
  const [eligible, setEligible] = useState<EligibleInvoice[]>([]);
  const [selectedInvoiceKey, setSelectedInvoiceKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function openManualMatch(txKey: string) {
    setActiveTxKey(txKey);
    setError(null);
    setSuccess(null);
    setSelectedInvoiceKey("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/platform/billing/legal-entities/${legalEntityKey}/camt054-reconciliation/eligible-invoices`,
      );
      const data = (await res.json()) as { invoices?: EligibleInvoice[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Rechnungen konnten nicht geladen werden.");
      }
      setEligible(data.invoices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
      setActiveTxKey(null);
    } finally {
      setLoading(false);
    }
  }

  async function confirmManualMatch() {
    if (!activeTxKey || !selectedInvoiceKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/legal-entities/${legalEntityKey}/camt054-reconciliation/transactions/${activeTxKey}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceKey: selectedInvoiceKey }),
        },
      );
      const data = (await res.json()) as {
        assignment?: { invoiceKey: string; paymentKey: string };
        error?: string;
      };
      if (!res.ok || !data.assignment) {
        throw new Error(data.error ?? "Zuordnung fehlgeschlagen.");
      }
      const invoice = eligible.find((i) => i.invoiceKey === selectedInvoiceKey);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.key === activeTxKey
            ? {
                ...tx,
                matchStatus: "MATCHED",
                matchStatusLabel: "Zugeordnet",
                matchMethodLabel: "Manuelle Zuordnung",
                invoiceKey: data.assignment!.invoiceKey,
                invoiceNumber: invoice?.invoiceNumber ?? tx.invoiceNumber,
              }
            : tx,
        ),
      );
      setSuccess("Transaktion manuell zugeordnet.");
      setActiveTxKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zuordnung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Import <span className="font-medium text-foreground">{filename}</span>
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Betrag</th>
              <th className="px-4 py-3">Referenz</th>
              <th className="px-4 py-3">Zahler</th>
              <th className="px-4 py-3">Rechnung</th>
              <th className="px-4 py-3">Ergebnis</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.key} className="border-b border-border/60">
                <td className="px-4 py-3">{tx.paymentDate}</td>
                <td className="px-4 py-3">{formatBillingMoney(tx.amountMinor, tx.currency)}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {tx.creditorReferenceFormatted ?? "—"}
                </td>
                <td className="px-4 py-3">{tx.debtorName ?? "—"}</td>
                <td className="px-4 py-3">
                  {tx.invoiceKey ? (
                    <Link
                      href={`/dashboard/admin/commercial/billing/invoices/${tx.invoiceKey}`}
                      className="underline"
                    >
                      {tx.invoiceNumber ?? tx.invoiceKey}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{tx.matchStatusLabel}</div>
                  {tx.matchMethodLabel ? (
                    <div className="text-xs text-muted-foreground">Match: {tx.matchMethodLabel}</div>
                  ) : null}
                  {tx.matchReason ? (
                    <div className="text-xs text-muted-foreground">{tx.matchReason}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {canManage && tx.matchStatus === "UNMATCHED" ? (
                    <button
                      type="button"
                      className="fca-button-secondary text-xs"
                      onClick={() => openManualMatch(tx.key)}
                    >
                      Zuordnen
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeTxKey ? (
        <section className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Manuelle Zuordnung</h3>
          <select
            className="fca-input w-full max-w-xl"
            value={selectedInvoiceKey}
            onChange={(e) => setSelectedInvoiceKey(e.target.value)}
          >
            <option value="">Rechnung wählen…</option>
            {eligible.map((inv) => (
              <option key={inv.invoiceKey} value={inv.invoiceKey}>
                {inv.invoiceNumber ?? inv.invoiceKey} — {inv.customerName} — offen{" "}
                {formatBillingMoney(inv.outstandingMinor, inv.currency)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              className="fca-button-primary"
              disabled={!selectedInvoiceKey || loading}
              onClick={confirmManualMatch}
            >
              Zuordnung bestätigen
            </button>
            <button
              type="button"
              className="fca-button-secondary"
              onClick={() => setActiveTxKey(null)}
            >
              Abbrechen
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}

      <Link
        href="/dashboard/admin/commercial/billing/reconciliation"
        className="fca-button-secondary inline-flex"
      >
        Zurück zum Bankabgleich
      </Link>
    </div>
  );
}

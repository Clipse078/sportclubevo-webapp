"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import type { SerializedInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-serializers";

type Props = {
  invoiceKey: string;
  invoiceNumber: string | null;
  customerName: string;
  canManage: boolean;
  initialSummary: SerializedInvoicePaymentSummary | null;
  defaultReference: string | null;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function NativeBillingInvoiceSettlementsSection({
  invoiceKey,
  invoiceNumber,
  customerName,
  canManage,
  initialSummary,
  defaultReference,
}: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<SerializedInvoicePaymentSummary | null>(
    initialSummary,
  );
  const [recordOpen, setRecordOpen] = useState(false);
  const [reverseKey, setReverseKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amountChf, setAmountChf] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [reference, setReference] = useState(defaultReference ?? "");
  const [note, setNote] = useState("");
  const [reversalReason, setReversalReason] = useState("");

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    if (summary && recordOpen) {
      setAmountChf((summary.outstandingMinor / 100).toFixed(2));
      setPaymentDate(todayIsoDate());
      setReference(defaultReference ?? "");
      setNote("");
    }
  }, [recordOpen, summary, defaultReference]);

  const paymentOpenLabel =
    summary && summary.outstandingMinor > 0 ? "Offen" : summary?.isFullyPaid ? "Bezahlt" : "Offen";

  function parseAmountMinorFromChf(value: string): number | null {
    const normalized = value.replace(",", ".").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return null;
    }
    const parts = normalized.split(".");
    const major = Number(parts[0]);
    const frac = (parts[1] ?? "").padEnd(2, "0").slice(0, 2);
    if (!Number.isFinite(major)) return null;
    return major * 100 + Number(frac);
  }

  async function submitPayment() {
    if (!summary) return;
    const amountMinor = parseAmountMinorFromChf(amountChf);
    if (amountMinor == null || amountMinor <= 0) {
      setError("Ungültiger Zahlungsbetrag.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountMinor,
            currency: "CHF",
            paymentDate,
            reference: reference.trim() || null,
            note: note.trim() || null,
          }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        paymentSummary?: SerializedInvoicePaymentSummary;
      };
      if (!res.ok || !data.paymentSummary) {
        throw new Error(data.error ?? "Zahlung konnte nicht verbucht werden.");
      }
      setSummary(data.paymentSummary);
      setRecordOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReversal(paymentKey: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/payments/${encodeURIComponent(paymentKey)}/reverse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reversalReason }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        paymentSummary?: SerializedInvoicePaymentSummary;
      };
      if (!res.ok || !data.paymentSummary) {
        throw new Error(data.error ?? "Stornierung fehlgeschlagen.");
      }
      setSummary(data.paymentSummary);
      setReverseKey(null);
      setReversalReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return null;
  }

  const canRecord =
    canManage && summary.outstandingMinor > 0 && !recordOpen && reverseKey === null;

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Zahlungen</h2>
        <BillingStatusBadge
          label={`Status: ${paymentOpenLabel}`}
          tone={summary.isFullyPaid ? "success" : "warning"}
        />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3 max-w-2xl">
        <div>
          <dt className="text-muted-foreground">Bruttobetrag</dt>
          <dd className="font-medium tabular-nums">{summary.grossTotalFormatted}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bezahlt</dt>
          <dd className="font-medium tabular-nums">{summary.paidTotalFormatted}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Offen</dt>
          <dd className="font-medium tabular-nums">{summary.outstandingFormatted}</dd>
        </div>
      </dl>

      {summary.isFullyPaid && summary.lastPaymentDateDisplay ? (
        <p className="text-sm text-muted-foreground">
          Bezahlt am{" "}
          <span className="font-medium text-foreground">{summary.lastPaymentDateDisplay}</span>
        </p>
      ) : null}

      {canRecord ? (
        <button
          type="button"
          className="fca-button-primary"
          onClick={() => setRecordOpen(true)}
        >
          Zahlung erfassen
        </button>
      ) : null}

      {recordOpen ? (
        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-4 max-w-lg">
          <h3 className="text-sm font-semibold">Zahlung erfassen</h3>
          <p className="text-sm text-muted-foreground">
            Diese Aktion erstellt einen buchhalterischen Zahlungseintrag.
          </p>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Rechnung</dt>
              <dd className="font-medium">{invoiceNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kunde</dt>
              <dd className="font-medium">{customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Offener Betrag</dt>
              <dd className="font-medium tabular-nums">{summary.outstandingFormatted}</dd>
            </div>
          </dl>
          <label className="block text-sm space-y-1">
            <span className="text-muted-foreground">Betrag</span>
            <input
              type="text"
              inputMode="decimal"
              className="fca-input w-full tabular-nums"
              value={amountChf}
              onChange={(e) => setAmountChf(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Max. {summary.outstandingFormatted}
            </span>
          </label>
          <label className="block text-sm space-y-1">
            <span className="text-muted-foreground">Zahlungsdatum</span>
            <input
              type="date"
              className="fca-input w-full"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </label>
          <div className="text-sm">
            <span className="text-muted-foreground">Zahlungsart</span>
            <p className="font-medium">Banküberweisung</p>
          </div>
          <label className="block text-sm space-y-1">
            <span className="text-muted-foreground">Referenz</span>
            <input
              type="text"
              className="fca-input w-full font-mono text-xs"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label className="block text-sm space-y-1">
            <span className="text-muted-foreground">Notiz</span>
            <textarea
              className="fca-input w-full min-h-[4rem]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="fca-button-secondary"
              disabled={loading}
              onClick={() => setRecordOpen(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="fca-button-primary"
              disabled={loading}
              onClick={submitPayment}
            >
              {loading ? "Verbuche…" : "Zahlung verbuchen"}
            </button>
          </div>
        </div>
      ) : null}

      {summary.payments.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Zahlungshistorie</h3>
          <ul className="space-y-3">
            {summary.payments.map((payment, index) => (
              <li
                key={payment.key}
                className="rounded-md border border-border p-3 text-sm space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">#{index + 1}</span>
                  <BillingStatusBadge
                    label={payment.statusLabel}
                    tone={payment.status === "REVERSED" ? "muted" : "success"}
                  />
                </div>
                <p className="tabular-nums font-medium">{payment.amountFormatted}</p>
                <p className="text-muted-foreground">
                  {payment.methodLabel} · {payment.paymentDateDisplay}
                </p>
                <p className="text-muted-foreground">{payment.sourceLabel}</p>
                {payment.reference ? (
                  <p className="text-xs font-mono text-muted-foreground">{payment.reference}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Erfasst: {payment.createdAtDisplay}
                </p>
                {canManage &&
                payment.status === "CONFIRMED" &&
                reverseKey !== payment.key ? (
                  <button
                    type="button"
                    className="fca-button-secondary text-xs mt-2"
                    onClick={() => {
                      setReverseKey(payment.key);
                      setRecordOpen(false);
                      setReversalReason("");
                    }}
                  >
                    Zahlung stornieren
                  </button>
                ) : null}
                {reverseKey === payment.key ? (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="font-medium">Zahlung stornieren</p>
                    <label className="block space-y-1">
                      <span className="text-muted-foreground">Grund (erforderlich)</span>
                      <textarea
                        className="fca-input w-full min-h-[3rem]"
                        value={reversalReason}
                        onChange={(e) => setReversalReason(e.target.value)}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="fca-button-secondary"
                        disabled={loading}
                        onClick={() => setReverseKey(null)}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        className="fca-button-primary"
                        disabled={loading || !reversalReason.trim()}
                        onClick={() => submitReversal(payment.key)}
                      >
                        Stornierung bestätigen
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Zahlungen erfasst.</p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

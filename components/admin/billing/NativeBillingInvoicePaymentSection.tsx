"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentInstructionView = {
  referenceType: string;
  referenceFormatted: string | null;
  creditorAccountMasked: string;
  amountMinor: number;
  currency: string;
};

type Props = {
  invoiceKey: string;
  canManage: boolean;
  initialInstruction: PaymentInstructionView | null;
  amountFormatted: string;
  embedded?: boolean;
};

export default function NativeBillingInvoicePaymentSection({
  invoiceKey,
  canManage,
  initialInstruction,
  amountFormatted,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState(initialInstruction);

  async function onCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${invoiceKey}/payment-instruction`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        error?: string;
        paymentInstruction?: PaymentInstructionView;
      };
      if (!res.ok || !data.paymentInstruction) {
        throw new Error(data.error ?? "Zahlungsanweisung konnte nicht erstellt werden.");
      }
      setInstruction(data.paymentInstruction);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }

  const wrapperClass = embedded ? "space-y-4" : "space-y-4";

  return (
    <div className={wrapperClass}>
      {instruction ? (
        <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.8125rem] text-[var(--text-2)]">Zahlungsart</dt>
            <dd className="font-medium">Schweizer QR-Rechnung</dd>
          </div>
          <div>
            <dt className="text-[0.8125rem] text-[var(--text-2)]">Konto</dt>
            <dd className="font-medium">{instruction.creditorAccountMasked}</dd>
          </div>
          <div>
            <dt className="text-[0.8125rem] text-[var(--text-2)]">Betrag</dt>
            <dd className="font-medium tabular-nums">{amountFormatted}</dd>
          </div>
          <div>
            <dt className="text-[0.8125rem] text-[var(--text-2)]">Referenztyp</dt>
            <dd className="text-[var(--text-2)]">{instruction.referenceType}</dd>
          </div>
          {instruction.referenceFormatted ? (
            <div className="sm:col-span-2">
              <dt className="text-[0.8125rem] text-[var(--text-2)]">Referenz</dt>
              <dd className="font-mono text-xs text-[var(--text-2)] break-all">
                {instruction.referenceFormatted}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-[var(--text-2)]">Noch keine Zahlungsanweisung erstellt.</p>
      )}
      {canManage && !instruction ? (
        <button
          type="button"
          className="fca-button-secondary"
          disabled={loading}
          onClick={onCreate}
        >
          {loading ? "Erstelle…" : "Zahlungsanweisung erstellen"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

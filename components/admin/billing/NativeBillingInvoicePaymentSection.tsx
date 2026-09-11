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
};

export default function NativeBillingInvoicePaymentSection({
  invoiceKey,
  canManage,
  initialInstruction,
  amountFormatted,
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

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">Zahlungsinformationen</h2>
      {instruction ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Zahlungsart</dt>
            <dd className="font-medium">Schweizer QR-Rechnung</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Referenztyp</dt>
            <dd className="font-medium">{instruction.referenceType}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Referenz</dt>
            <dd className="font-medium font-mono text-xs sm:text-sm">
              {instruction.referenceFormatted ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Konto</dt>
            <dd className="font-medium">{instruction.creditorAccountMasked}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Betrag</dt>
            <dd className="font-medium">{amountFormatted}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine Zahlungsanweisung erstellt.
        </p>
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
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ContractOption = {
  id: string;
  label: string;
  status: string;
};

type Props = {
  contracts: ContractOption[];
};

export default function NativeBillingCreateInvoiceForm({ contracts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/platform/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingContractId: String(form.get("billingContractId") ?? ""),
          periodStart: String(form.get("periodStart") ?? ""),
          periodEnd: String(form.get("periodEnd") ?? ""),
          invoiceDate: String(form.get("invoiceDate") ?? "") || null,
        }),
      });
      const data = (await res.json()) as { error?: string; invoice?: { key: string } };
      if (!res.ok || !data.invoice) {
        throw new Error(data.error ?? "Rechnung konnte nicht erstellt werden.");
      }
      router.push(`/dashboard/admin/commercial/billing/invoices/${data.invoice.key}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Aktiver Vertrag</span>
        <select name="billingContractId" required className="fca-input w-full">
          <option value="">Auswählen…</option>
          {activeContracts.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Leistungszeitraum von</span>
        <input name="periodStart" type="date" required className="fca-input w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Leistungszeitraum bis</span>
        <input name="periodEnd" type="date" required className="fca-input w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Rechnungsdatum (optional)</span>
        <input name="invoiceDate" type="date" className="fca-input w-full" />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button type="submit" className="fca-button-primary" disabled={loading}>
        Rechnungsentwurf erstellen
      </button>
    </form>
  );
}

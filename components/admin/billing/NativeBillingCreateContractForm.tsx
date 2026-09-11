"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";

type ProductOption = { id: string; name: string; catalogueMonthlyNetMinor: number | null };
type CustomerOption = { id: string; label: string };
type EntityOption = { id: string; label: string };

type Props = {
  products: ProductOption[];
  customers: CustomerOption[];
  legalEntities: EntityOption[];
};

export default function NativeBillingCreateContractForm({
  products,
  customers,
  legalEntities,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const billingProductId = String(form.get("billingProductId") ?? "");
    const product = products.find((p) => p.id === billingProductId);
    const monthlyRaw = String(form.get("monthlyNetAmountMinor") ?? "");
    const monthlyNetAmountMinor =
      monthlyRaw.trim() !== ""
        ? Math.round(Number(monthlyRaw) * 100)
        : product?.catalogueMonthlyNetMinor ?? 0;

    try {
      const res = await fetch("/api/platform/billing/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId: String(form.get("legalEntityId") ?? ""),
          billingCustomerId: String(form.get("billingCustomerId") ?? ""),
          contractNumber: String(form.get("contractNumber") ?? ""),
          billingProductId: billingProductId || null,
          productName: String(form.get("productName") ?? product?.name ?? ""),
          monthlyNetAmountMinor,
          startDate: String(form.get("startDate") ?? ""),
          paymentTermsDays: Number(form.get("paymentTermsDays") ?? 30),
        }),
      });
      const data = (await res.json()) as { error?: string; contract?: { key: string } };
      if (!res.ok || !data.contract) {
        throw new Error(data.error ?? "Vertrag konnte nicht erstellt werden.");
      }
      router.push(`/dashboard/admin/commercial/billing/contracts/${data.contract.key}`);
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
        <span className="font-medium">Rechtsträger</span>
        <select name="legalEntityId" required className="fca-input w-full">
          <option value="">Auswählen…</option>
          {legalEntities.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Kunde</span>
        <select name="billingCustomerId" required className="fca-input w-full">
          <option value="">Auswählen…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Vertragsnummer</span>
        <input name="contractNumber" required className="fca-input w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Produkt</span>
        <select name="billingProductId" className="fca-input w-full">
          <option value="">Manuell / ohne Katalog</option>
          {products.map((p) => {
            const catalogueHint =
              p.catalogueMonthlyNetMinor != null
                ? ` — Katalog ab ${formatBillingMoney(p.catalogueMonthlyNetMinor, "CHF")}`
                : "";
            return (
              <option key={p.id} value={p.id}>
                {p.name}
                {catalogueHint}
              </option>
            );
          })}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Produktbezeichnung (optional)</span>
        <input name="productName" className="fca-input w-full" placeholder="Leer = Katalogname" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Monatspreis netto (CHF)</span>
        <input
          name="monthlyNetAmountMinor"
          type="number"
          step="0.01"
          min="0"
          className="fca-input w-full"
          placeholder="Vereinbarter Vertragspreis, z. B. 199.00"
        />
      </label>
      <p className="text-xs text-muted-foreground -mt-2">
        Leer lassen übernimmt den Katalog-Standardpreis als Startwert — der vereinbarte Vertragspreis
        kann abweichen.
      </p>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Startdatum</span>
        <input name="startDate" type="date" required className="fca-input w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Zahlungsziel (Tage)</span>
        <input
          name="paymentTermsDays"
          type="number"
          min="0"
          defaultValue={30}
          className="fca-input w-full"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        MWST 8.1 % · Währung CHF · monatliche Abrechnung
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button type="submit" className="fca-button-primary" disabled={loading}>
        Vertrag anlegen (Entwurf)
      </button>
    </form>
  );
}

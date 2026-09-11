"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TenantOption = { key: string; label: string };

type Props = {
  tenants: TenantOption[];
};

export default function NativeBillingCreateCustomerForm({ tenants }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const displayName = String(form.get("displayName") ?? "").trim();
    const key = String(form.get("key") ?? "").trim();
    const legalName = String(form.get("legalName") ?? "").trim();
    const primaryEmail = String(form.get("primaryEmail") ?? "").trim();
    const tenantKey = String(form.get("tenantKey") ?? "").trim();

    const street = String(form.get("street") ?? "").trim();
    const houseNumber = String(form.get("houseNumber") ?? "").trim();
    const postalCode = String(form.get("postalCode") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const countryCode = String(form.get("countryCode") ?? "CH").trim() || "CH";
    const invoiceEmail = String(form.get("invoiceEmail") ?? "").trim();
    const companyOrName = String(form.get("companyOrName") ?? "").trim() || legalName || displayName;

    try {
      const res = await fetch("/api/platform/billing/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          key: key || undefined,
          legalName: legalName || null,
          primaryEmail: primaryEmail || null,
          defaultCurrency: "CHF",
          defaultLanguage: "de-CH",
          tenantKey: tenantKey || undefined,
          billingProfile: {
            companyOrName,
            street,
            houseNumber: houseNumber || null,
            postalCode,
            city,
            countryCode,
            invoiceEmail: invoiceEmail || primaryEmail || null,
          },
        }),
      });
      const data = (await res.json()) as { error?: string; customer?: { key: string } };
      if (!res.ok || !data.customer) {
        throw new Error(data.error ?? "Kunde konnte nicht erstellt werden.");
      }
      router.push(`/dashboard/admin/commercial/billing/customers/${data.customer.key}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Kunde</legend>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Anzeigename</span>
          <input name="displayName" required className="fca-input w-full" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Kundennummer / Key</span>
          <input
            name="key"
            className="fca-input w-full"
            placeholder="Optional — wird sonst aus dem Anzeigenamen erzeugt"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Rechtlicher Name</span>
          <input name="legalName" className="fca-input w-full" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Kontakt-E-Mail</span>
          <input name="primaryEmail" type="email" className="fca-input w-full" />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Rechnungsadresse</legend>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name auf Rechnung</span>
          <input name="companyOrName" className="fca-input w-full" />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Strasse</span>
            <input name="street" required className="fca-input w-full" />
          </label>
          <label className="block space-y-1 text-sm sm:w-28">
            <span className="font-medium">Nr.</span>
            <input name="houseNumber" className="fca-input w-full" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">PLZ</span>
            <input name="postalCode" required className="fca-input w-full" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Ort</span>
            <input name="city" required className="fca-input w-full" />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Land</span>
          <input name="countryCode" required defaultValue="CH" className="fca-input w-full" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Rechnungs-E-Mail</span>
          <input name="invoiceEmail" type="email" className="fca-input w-full" />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">SCE Tenant (optional)</legend>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Verknüpfter Club</span>
          <select name="tenantKey" className="fca-input w-full">
            <option value="">Keine Verknüpfung</option>
            {tenants.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button type="submit" disabled={loading} className="fca-button-primary">
        {loading ? "Speichern…" : "Kunde anlegen"}
      </button>
    </form>
  );
}

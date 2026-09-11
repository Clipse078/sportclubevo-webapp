"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type LegalEntityOption = { key: string; label: string };

type Props = {
  legalEntities: LegalEntityOption[];
};

export default function NativeBillingCreateBankAccountForm({ legalEntities }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/platform/billing/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityKey: String(form.get("legalEntityKey") ?? ""),
          label: String(form.get("label") ?? ""),
          bankName: String(form.get("bankName") ?? "") || null,
          currency: "CHF",
          iban: String(form.get("iban") ?? ""),
          qrIban: String(form.get("qrIban") ?? "") || null,
          referenceStrategy: String(form.get("referenceStrategy") ?? "NON"),
          qrrReferencePrefix: String(form.get("qrrReferencePrefix") ?? "") || null,
          creditorName: String(form.get("creditorName") ?? ""),
          creditorAddressLine1: String(form.get("creditorAddressLine1") ?? ""),
          creditorHouseNumber: String(form.get("creditorHouseNumber") ?? "") || null,
          creditorPostalCode: String(form.get("creditorPostalCode") ?? ""),
          creditorCity: String(form.get("creditorCity") ?? ""),
          creditorCountryCode: String(form.get("creditorCountryCode") ?? "CH"),
          isDefault: form.get("isDefault") === "on",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Bankkonto konnte nicht gespeichert werden.");
      }
      router.refresh();
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">Bankkonto hinzufügen</h3>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Rechtsträger</span>
        <select name="legalEntityKey" required className="fca-input w-full">
          <option value="">Bitte wählen</option>
          {legalEntities.map((entity) => (
            <option key={entity.key} value={entity.key}>
              {entity.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Bezeichnung</span>
        <input name="label" required className="fca-input w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">IBAN</span>
        <input name="iban" required className="fca-input w-full" autoComplete="off" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">QR-IBAN (optional)</span>
        <input name="qrIban" className="fca-input w-full" autoComplete="off" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Referenzstrategie</span>
        <select name="referenceStrategy" className="fca-input w-full" defaultValue="NON">
          <option value="NON">Keine Referenz (NON)</option>
          <option value="SCOR">SCOR</option>
          <option value="QRR">QRR</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">QRR-Präfix (optional, numerisch)</span>
        <input name="qrrReferencePrefix" className="fca-input w-full" inputMode="numeric" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" />
        <span>Standardkonto</span>
      </label>
      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium">Gläubiger (strukturiert)</legend>
        <input name="creditorName" required placeholder="Name" className="fca-input w-full" />
        <input
          name="creditorAddressLine1"
          required
          placeholder="Strasse"
          className="fca-input w-full"
        />
        <input name="creditorHouseNumber" placeholder="Hausnr." className="fca-input w-full" />
        <div className="grid grid-cols-2 gap-2">
          <input name="creditorPostalCode" required placeholder="PLZ" className="fca-input w-full" />
          <input name="creditorCity" required placeholder="Ort" className="fca-input w-full" />
        </div>
        <input
          name="creditorCountryCode"
          defaultValue="CH"
          required
          className="fca-input w-full"
        />
      </fieldset>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={loading} className="fca-button-primary">
        {loading ? "Speichern…" : "Bankkonto speichern"}
      </button>
    </form>
  );
}

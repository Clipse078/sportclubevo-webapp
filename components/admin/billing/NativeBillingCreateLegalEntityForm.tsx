"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LegalEntityType } from "@prisma/client";

const ENTITY_TYPE_OPTIONS: { value: LegalEntityType; label: string }[] = [
  { value: "COMPANY", label: "Gesellschaft" },
  { value: "ASSOCIATION", label: "Verein" },
  { value: "OTHER", label: "Andere Rechtsform (z. B. Einzelunternehmen)" },
];

export default function NativeBillingCreateLegalEntityForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const displayName = String(form.get("displayName") ?? "").trim();
    const legalName = String(form.get("legalName") ?? "").trim();
    const key = String(form.get("key") ?? "").trim();
    const entityTypeRaw = String(form.get("entityType") ?? "").trim();
    const entityType = entityTypeRaw ? (entityTypeRaw as LegalEntityType) : undefined;
    const uid = String(form.get("uid") ?? "").trim();
    const vatId = String(form.get("vatId") ?? "").trim();
    const defaultCurrency = String(form.get("defaultCurrency") ?? "CHF").trim() || "CHF";
    const addressLine1 = String(form.get("addressLine1") ?? "").trim();
    const houseNumber = String(form.get("houseNumber") ?? "").trim();
    const postalCode = String(form.get("postalCode") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const countryCode = String(form.get("countryCode") ?? "CH").trim() || "CH";

    try {
      const res = await fetch("/api/platform/billing/legal-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          legalName,
          key: key || undefined,
          entityType,
          uid: uid || null,
          vatId: vatId || null,
          defaultCurrency,
          addressLine1,
          houseNumber: houseNumber || null,
          postalCode,
          city,
          countryCode,
        }),
      });
      const data = (await res.json()) as { error?: string; legalEntity?: { key: string } };
      if (!res.ok || !data.legalEntity) {
        throw new Error(data.error ?? "Rechtsträger konnte nicht erstellt werden.");
      }
      router.push(
        `/dashboard/admin/commercial/billing/settings/legal-entities/${data.legalEntity.key}`,
      );
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
        <legend className="text-sm font-semibold">Rechtsträger</legend>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Anzeigename</span>
          <input name="displayName" required className="fca-input w-full" />
          <span className="text-xs text-muted-foreground">
            Erscheint in Vertragsauswahl und auf Rechnungen.
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Rechtlicher Name</span>
          <input name="legalName" required className="fca-input w-full" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Interner Key</span>
          <input
            name="key"
            className="fca-input w-full"
            placeholder="Optional — wird sonst aus dem Anzeigenamen erzeugt"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Rechtsform</span>
          <select name="entityType" className="fca-input w-full">
            <option value="">Nicht angegeben</option>
            {ENTITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">UID / Handelsregister-Nr.</span>
          <input name="uid" className="fca-input w-full" placeholder="z. B. CHE-xxx.xxx.xxx" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">MWST-Nr. (optional)</span>
          <input name="vatId" className="fca-input w-full" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Standardwährung</span>
          <input name="defaultCurrency" required defaultValue="CHF" className="fca-input w-full" />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Adresse</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Strasse</span>
            <input name="addressLine1" required className="fca-input w-full" />
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
          <span className="font-medium">Land (ISO)</span>
          <input name="countryCode" required defaultValue="CH" className="fca-input w-full" />
        </label>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button type="submit" disabled={loading} className="fca-button-primary">
        {loading ? "Speichern…" : "Rechtsträger anlegen"}
      </button>
    </form>
  );
}

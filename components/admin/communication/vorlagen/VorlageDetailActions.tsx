"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  templateId: string;
  canManage: boolean;
  canUse: boolean;
  status: string;
};

export default function VorlageDetailActions({
  templateId,
  canManage,
  canUse,
  status,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usable = canUse && (status === "ACTIVE" || status === "DRAFT");

  async function useTemplate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${templateId}/use`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorlage konnte nicht verwendet werden");
      router.push(data.redirectPath as string);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${templateId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Duplizieren fehlgeschlagen");
      router.push(`/dashboard/communication/vorlagen/${data.id as string}?edit=1`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {usable ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void useTemplate()}
            className="fca-button-primary"
          >
            Entwurf erstellen
          </button>
        ) : null}
        {canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void duplicate()}
            className="fca-button-secondary"
          >
            Duplizieren
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

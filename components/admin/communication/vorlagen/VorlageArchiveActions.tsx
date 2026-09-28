"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  templateId: string;
  status: string;
  canManage: boolean;
};

export default function VorlageArchiveActions({ templateId, status, canManage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage || status === "ARCHIVED") return null;

  async function archive() {
    if (!window.confirm("Vorlage archivieren? Bestehende Kommunikationen bleiben unverändert.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${templateId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Archivieren fehlgeschlagen");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archivieren fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void archive()}
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        Archivieren
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

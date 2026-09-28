"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, RotateCcw } from "lucide-react";

type Props = {
  targetGroupId: string;
  status: string;
  canManage: boolean;
};

export default function ZielgruppeArchiveActions({ targetGroupId, status, canManage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function setArchived(archived: boolean) {
    if (archived) {
      const ok = window.confirm(
        "Zielgruppe archivieren? Sie kann weiterhin in historischen Kommunikationen referenziert sein, erscheint aber standardmässig nicht mehr in Auswahllisten.",
      );
      if (!ok) return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/target-groups/${targetGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: archived ? "ARCHIVED" : "ACTIVE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {status === "ARCHIVED" ? (
        <button
          type="button"
          disabled={loading}
          className="fca-button-secondary inline-flex items-center gap-2"
          onClick={() => setArchived(false)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Wiederherstellen
        </button>
      ) : (
        <button
          type="button"
          disabled={loading}
          className="fca-button-secondary inline-flex items-center gap-2"
          onClick={() => setArchived(true)}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          Archivieren
        </button>
      )}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

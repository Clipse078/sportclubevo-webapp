"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  communicationId: string;
};

export function MitteilungArchiveButton({ communicationId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/communication/club/${communicationId}/archive`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Archivierung fehlgeschlagen");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archivierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleArchive()}
        className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium"
      >
        Archivieren
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

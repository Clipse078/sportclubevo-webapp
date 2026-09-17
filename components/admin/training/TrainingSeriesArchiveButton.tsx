"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";

type Props = {
  seriesId: string;
  seriesTitle: string;
  variant?: "default" | "menu";
  onComplete?: () => void;
};

/**
 * Archive button for a TrainingSeries (TRAININGCENTER-03A).
 *
 * Calls DELETE /api/training-series/[seriesId], which soft-archives the
 * series (status -> ARCHIVED). Already-generated TrainingSession rows are
 * left untouched — archiving preserves generated history.
 */
export default function TrainingSeriesArchiveButton({
  seriesId,
  seriesTitle,
  variant = "default",
  onComplete,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/training-series/${seriesId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Archivierung fehlgeschlagen.");
        setConfirming(false);
        return;
      }

      onComplete?.();
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setConfirming(false);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    if (variant === "menu") {
      return (
        <div className="space-y-1">
          <button
            type="button"
            role="menuitem"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          >
            <Archive className="h-4 w-4 opacity-80" aria-hidden="true" />
            Archivieren
          </button>
          {error ? <p className="px-2 text-[11px] font-medium text-[var(--sce-danger)]">{error}</p> : null}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <Archive className="h-3.5 w-3.5" />
          Archivieren
        </button>
        {error ? <p className="text-[11px] font-medium text-[var(--sce-danger)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-xs font-semibold text-[var(--foreground)]">{`"${seriesTitle}" archivieren?`}</p>
      <p className="text-[11px] text-[var(--text-2)]">
        Bereits generierte Termine bleiben erhalten. Diese Aktion kann rückgängig gemacht werden.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleArchive}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
          Ja, archivieren
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          Abbrechen
        </button>
      </div>
      {error ? <p className="text-[11px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

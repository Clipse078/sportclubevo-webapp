"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw } from "lucide-react";

type Props = {
  sessionId: string;
  /** Whether this occurrence is currently CANCELLED (renders the restore action instead). */
  isCancelled: boolean;
  variant?: "button" | "menu";
};

/**
 * Cancel/restore toggle for a single canonical TrainingSession occurrence
 * (TRAININGCENTER-01). Calls PATCH /api/training-sessions/[sessionId],
 * which only ever mutates this one occurrence's status — the parent
 * TrainingSeries recurrence definition is never touched.
 */
export default function TrainingSessionCancelButton({
  sessionId,
  isCancelled,
  variant = "button",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/training-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isCancelled ? "SCHEDULED" : "CANCELLED" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Aktion fehlgeschlagen.");
        return;
      }

      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const menuClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60";
  const buttonClass = isCancelled
    ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--sce-danger)_35%,var(--border))] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--sce-danger)] transition hover:bg-[color-mix(in_srgb,var(--sce-danger)_8%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={variant === "menu" ? "w-full" : "flex flex-col items-end gap-1"}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        role={variant === "menu" ? "menuitem" : undefined}
        className={
          variant === "menu"
            ? `${menuClass} ${isCancelled ? "text-[var(--foreground)] hover:bg-[var(--surface-2)]" : "text-[var(--sce-danger)] hover:bg-[color-mix(in_srgb,var(--sce-danger)_8%,var(--surface))]"}`
            : buttonClass
        }
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isCancelled ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <Ban className="h-3.5 w-3.5" />
        )}
        {isCancelled ? "Wiederherstellen" : "Absagen"}
      </button>
      {error ? (
        <p className="text-[11px] font-medium text-[var(--sce-danger)]" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

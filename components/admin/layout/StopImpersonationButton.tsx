"use client";

import { useState } from "react";

export default function StopImpersonationButton() {
  const [submitting, setSubmitting] = useState(false);

  async function handleStop() {
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/stop-impersonation", {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Impersonation konnte nicht beendet werden.");
      }

      window.location.href =
        typeof data?.redirectTo === "string"
          ? data.redirectTo
          : "/dashboard/admin/people-access";
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.",
      );
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStop}
      disabled={submitting}
      className="fca-button-secondary shrink-0 border-[var(--sce-warning-border)] text-[var(--sce-warning)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? "Beende…" : "Impersonation beenden"}
    </button>
  );
}

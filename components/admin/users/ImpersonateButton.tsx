"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

type ImpersonateButtonProps = {
  userId: string;
  variant?: "hero" | "default" | "person-detail" | "row-menu";
  /** Called when the user activates the control (e.g. close parent dropdown). */
  onActivate?: () => void;
};

export default function ImpersonateButton({
  userId,
  variant = "default",
  onActivate,
}: ImpersonateButtonProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleImpersonate() {
    onActivate?.();
    const confirmed = window.confirm(
      "SportClubEvo wirklich aus Sicht dieser Person öffnen?\n\nIhre Berechtigungen und Navigation werden exakt übernommen.",
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/users/${userId}/impersonate`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Impersonation konnte nicht gestartet werden.");
      }

      window.location.href = typeof data?.redirectTo === "string" ? data.redirectTo : "/dashboard";
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.",
      );
      setSubmitting(false);
    }
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={handleImpersonate}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Eye className="h-3.5 w-3.5" />
        {submitting ? "Starte…" : "Als Benutzer ansehen"}
      </button>
    );
  }

  if (variant === "person-detail") {
    return (
      <button
        type="button"
        onClick={handleImpersonate}
        disabled={submitting}
        className="fca-button-primary inline-flex items-center gap-1.5"
      >
        <Eye className="h-3.5 w-3.5" />
        {submitting ? "Starte…" : "Als Benutzer ansehen"}
      </button>
    );
  }

  if (variant === "row-menu") {
    return (
      <button
        type="button"
        onClick={handleImpersonate}
        disabled={submitting}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
        {submitting ? "Starte…" : "Als Benutzer ansehen"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleImpersonate}
      disabled={submitting}
      className="fca-button-secondary inline-flex items-center gap-1.5"
    >
      <Eye className="h-3.5 w-3.5" />
      {submitting ? "Starte…" : "Als Benutzer ansehen"}
    </button>
  );
}

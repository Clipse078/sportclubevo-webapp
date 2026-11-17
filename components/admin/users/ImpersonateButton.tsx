"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { SceConfirmDialog } from "@/components/sce/actions";
import { cn } from "@/lib/cn";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function openConfirm() {
    onActivate?.();
    setErrorMessage(null);
    setConfirmOpen(true);
  }

  async function startImpersonation() {
    setSubmitting(true);
    setErrorMessage(null);

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
      setErrorMessage(
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.",
      );
      setSubmitting(false);
    }
  }

  if (variant === "person-detail" && confirmOpen) {
    return (
      <div
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3"
        data-testid="impersonate-inline-confirm"
      >
        <p className="text-sm text-[var(--foreground)]">
          SportClubEvo aus Sicht dieser Person öffnen? Navigation und Berechtigungen entsprechen
          dann dem effektiven Zugriff der Person.
        </p>
        {errorMessage ? (
          <p className="mt-2 text-xs text-[var(--sce-danger)]">{errorMessage}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="fca-button-secondary text-sm"
            disabled={submitting}
            onClick={() => setConfirmOpen(false)}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="fca-button-primary text-sm"
            disabled={submitting}
            onClick={() => void startImpersonation()}
          >
            {submitting ? "Starte…" : "Ansicht starten"}
          </button>
        </div>
      </div>
    );
  }

  const trigger = (() => {
    if (variant === "hero") {
      return (
        <button
          type="button"
          onClick={openConfirm}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-[var(--surface)]/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Eye className="h-3.5 w-3.5" />
          Als Benutzer ansehen
        </button>
      );
    }

    if (variant === "person-detail") {
      return (
        <button
          type="button"
          onClick={openConfirm}
          disabled={submitting}
          className="fca-button-secondary inline-flex items-center gap-1.5"
          data-testid="impersonate-open-confirm"
        >
          <Eye className="h-3.5 w-3.5" />
          Als Benutzer ansehen
        </button>
      );
    }

    if (variant === "row-menu") {
      return (
        <button
          type="button"
          role="menuitem"
          onClick={openConfirm}
          disabled={submitting}
          className={cn(
            "flex w-full min-h-[38px] cursor-pointer items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors",
            "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--sce-primary)]"
            aria-hidden="true"
          >
            <Eye className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate">Als Benutzer ansehen</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={openConfirm}
        disabled={submitting}
        className="fca-button-secondary inline-flex items-center gap-1.5"
      >
        <Eye className="h-3.5 w-3.5" />
        Als Benutzer ansehen
      </button>
    );
  })();

  return (
    <>
      {trigger}
      {variant !== "person-detail" ? (
        <SceConfirmDialog
          open={confirmOpen}
          onClose={() => !submitting && setConfirmOpen(false)}
          title="Als Benutzer ansehen"
          description="SportClubEvo aus Sicht dieser Person öffnen? Navigation und Berechtigungen entsprechen dem effektiven Zugriff der Person. Die Sitzung kann jederzeit über das Sicherheits-Banner beendet werden."
          confirmLabel={submitting ? "Starte…" : "Ansicht starten"}
          onConfirm={() => void startImpersonation()}
          confirmLoading={submitting}
          errorMessage={errorMessage}
        />
      ) : null}
    </>
  );
}
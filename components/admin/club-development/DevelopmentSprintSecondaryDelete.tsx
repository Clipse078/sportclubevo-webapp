"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import { CD_SPRINT_API_COPY } from "@/lib/club-development/product-copy";
import { buildVorhabenUndUmsetzungHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  sprintId: string;
  sprintTitle: string;
  canDelete: boolean;
  returnTo?: string;
  variant?: "secondary" | "compact";
};

export default function DevelopmentSprintSecondaryDelete({
  sprintId,
  sprintTitle,
  canDelete,
  returnTo,
  variant = "secondary",
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impactSummary, setImpactSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  const phaseListHref =
    returnTo?.trim() || buildVorhabenUndUmsetzungHref("umsetzungsphasen");

  function beginConfirm() {
    setError(null);
    setImpactSummary(null);
    setConfirming(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/club-development/sprints/${encodeURIComponent(sprintId)}/permanent`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Löschen nicht möglich.");
          return;
        }
        const count = data?.impact?.activeMembershipCount ?? 0;
        setImpactSummary(
          count > 0
            ? `${count} Zuordnung${count === 1 ? "" : "en"} wird entfernt. ${CD_SPRINT_API_COPY.deletePhaseTasksPreserved}.`
            : CD_SPRINT_API_COPY.deletePhaseTasksPreserved,
        );
      } catch {
        setError("Netzwerkfehler.");
      }
    });
  }

  function performDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({ confirm: "true" });
        if (returnTo?.trim()) params.set("returnTo", returnTo.trim());
        const res = await fetch(
          `/api/club-development/sprints/${encodeURIComponent(sprintId)}/permanent?${params}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Löschen fehlgeschlagen.");
          return;
        }
        const target = typeof data.redirectTo === "string" ? data.redirectTo : phaseListHref;
        router.push(target);
        router.refresh();
      } catch {
        setError("Netzwerkfehler.");
      }
    });
  }

  if (confirming) {
    return (
      <SceInlineDestructiveConfirm
        title={CD_SPRINT_API_COPY.deletePhaseConfirmTitle}
        description={
          impactSummary ??
          `${CD_SPRINT_API_COPY.deletePhaseConfirmBody} (${sprintTitle})`
        }
        pending={pending}
        error={error}
        onConfirm={performDelete}
        onCancel={() => {
          if (!pending) {
            setConfirming(false);
            setError(null);
          }
        }}
        testId="sprint-phase-delete-confirm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={beginConfirm}
      disabled={pending}
      data-testid="sprint-phase-delete-trigger"
      className={
        variant === "compact"
          ? "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sce-danger)] hover:underline disabled:opacity-50"
          : "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--sce-danger)] transition hover:bg-red-50 disabled:opacity-50"
      }
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {CD_SPRINT_API_COPY.deletePhase}
    </button>
  );
}
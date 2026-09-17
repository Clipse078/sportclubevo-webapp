"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SectionCard } from "@/components/ui/page";

type Impact = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  seriesId: string;
  seriesTitle: string;
  /**
   * ADMIN-DELETE-02A: effective PERMISSIONS.TRAININGS_DELETE authority,
   * resolved by the caller. Deliberately independent of trainings.manage —
   * archive/edit remain governed by their existing permission and are
   * unaffected by this control.
   */
  canDelete: boolean;
  /**
   * ADMIN-DELETE-02A-C1: "section" renders the full "Endgültig löschen"
   * card used on the series edit page. "inline" renders a compact button
   * matching the other row actions (Ressourcen/Bearbeiten/Archivieren) in
   * the actual Serien-Verwaltung list — the surface admins use day to day.
   */
  variant?: "section" | "inline" | "menu" | "danger-zone";
  onOpen?: () => void;
};

/**
 * TrainingSeriesDeleteControl — permanent-delete action for a TrainingSeries.
 *
 * ADMIN-DELETE-02A-C1 CORE PRODUCT RULE: dependencies (generated sessions,
 * facility allocations, plan assignments) are shown as IMPACT — a warning —
 * and never block deletion for a trainings.delete holder. Flow: clicking
 * "Löschen" opens the confirmation dialog and fetches the current impact;
 * clicking "Endgültig löschen" atomically cleans up that dependent data and
 * permanently deletes the series (see
 * app/api/training-series/[seriesId]/permanent/route.ts).
 *
 * Archive/restore continue to work exactly as before via the existing
 * archive button/route (components/admin/training/TrainingSeriesArchiveButton.tsx,
 * DELETE /api/training-series/[seriesId]) — a completely separate, reversible
 * lifecycle action.
 */
export default function TrainingSeriesDeleteControl({
  seriesId,
  seriesTitle,
  canDelete,
  variant = "section",
  onOpen,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<Impact[] | null>(null);
  const [dangerExpanded, setDangerExpanded] = useState(false);

  if (!canDelete) {
    return null;
  }

  async function openConfirmation() {
    onOpen?.();
    setConfirming(true);
    setError(null);
    setImpact(null);
    setLoadingImpact(true);

    try {
      const response = await fetch(`/api/training-series/${seriesId}/permanent`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Löschen nicht möglich.");
      }

      setImpact(Array.isArray(data?.impact) ? data.impact : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoadingImpact(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/training-series/${seriesId}/permanent?confirm=true`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Löschen fehlgeschlagen.");
      }

      setConfirming(false);
      router.push("/dashboard/training");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setDeleting(false);
    }
  }

  function closeDialog() {
    setConfirming(false);
    setImpact(null);
    setError(null);
  }

  const dangerZoneTrigger =
    variant === "danger-zone" ? (
      <button
        type="button"
        onClick={() => setDangerExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
        data-testid="training-series-danger-zone-toggle"
        aria-expanded={dangerExpanded}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Gefahrenbereich
          </span>
          <span className="font-medium">Training dauerhaft löschen</span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${dangerExpanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>
    ) : null;

  const trigger =
    variant === "menu" ? (
      <button
        type="button"
        role="menuitem"
        onClick={openConfirmation}
        data-testid="training-series-delete-inline"
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--sce-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
      >
        <Trash2 className="h-4 w-4 opacity-80" aria-hidden="true" />
        Löschen
      </button>
    ) : variant === "inline" ? (
      <button
        type="button"
        onClick={openConfirmation}
        data-testid="training-series-delete-inline"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--sce-danger)] transition hover:bg-[var(--surface)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Löschen
      </button>
    ) : variant === "danger-zone" ? (
      <Button
        variant="danger"
        size="sm"
        iconLeft={<Trash2 className="h-3.5 w-3.5" />}
        onClick={openConfirmation}
        data-testid="training-series-delete-confirm-open"
      >
        Training endgültig löschen
      </Button>
    ) : (
      <Button
        variant="danger"
        size="sm"
        iconLeft={<Trash2 className="h-3.5 w-3.5" />}
        onClick={openConfirmation}
      >
        Löschen
      </Button>
    );

  return (
    <>
      {variant === "section" ? (
        <SectionCard title="Endgültig löschen">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--text-2)]">
              Entfernt die Trainingsserie unwiderruflich, inklusive generierter Termine,
              Ressourcen-Zuordnungen und Trainingsplan-Zuweisungen.
            </p>
            {trigger}
          </div>
        </SectionCard>
      ) : variant === "danger-zone" ? (
        <div className="space-y-3" data-testid="training-series-danger-zone">
          {dangerZoneTrigger}
          {dangerExpanded ? (
            <div className="space-y-3 rounded-lg border border-[var(--sce-danger-border)]/40 bg-[var(--surface-2)]/30 px-3 py-3">
              <p className="text-xs text-[var(--text-2)]">
                Diese Trainingsserie und die davon abhängigen Daten werden dauerhaft gelöscht.
              </p>
              {trigger}
            </div>
          ) : null}
        </div>
      ) : variant === "menu" ? (
        trigger
      ) : (
        trigger
      )}

      <Dialog
        open={confirming}
        onClose={closeDialog}
        title={`„${seriesTitle}" endgültig löschen?`}
        description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden."
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={loadingImpact}
              onClick={handleConfirmDelete}
            >
              Endgültig löschen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && <p className="text-sm font-medium text-[var(--sce-danger)]">{error}</p>}

          {loadingImpact ? (
            <p className="text-sm text-[var(--text-2)]">Auswirkungen werden geprüft…</p>
          ) : impact && impact.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] p-3 text-[var(--sce-warning)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm">
                  Folgende verknüpfte Daten werden ebenfalls unwiderruflich entfernt:
                </p>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-2)]">
                {impact.map((item) => (
                  <li key={item.key}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : impact ? (
            <p className="text-sm text-[var(--text-2)]">
              Keine generierten Termine, Ressourcen-Zuordnungen oder Trainingsplan-Zuweisungen
              vorhanden.
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

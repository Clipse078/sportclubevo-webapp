"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ManipulationConflictPreview } from "@/lib/planning-hub/manipulation-projection";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { weekplannerActivityTypeLabel, weekplannerPrimaryLabel } from "@/lib/planning-hub/item-presenters";
import { isoToLocalTime } from "@/lib/planning-hub/planner-time";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";

type Props = {
  draft: SchedulerDraftChange;
  locale: string;
  timezone: string;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  conflictPreview: ManipulationConflictPreview;
  saving: boolean;
  error: string | null;
  resolveResourceRef: (resourceId: string) => WeekplannerResourceRef | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function formatOccupancyRange(start: Date, end: Date, timeZone: string): string {
  return `${isoToLocalTime(start, timeZone)}–${isoToLocalTime(end, timeZone)}`;
}

function resourceShortLabel(
  resourceId: string | undefined,
  resolve: (id: string) => WeekplannerResourceRef | null,
): string {
  if (!resourceId) return "—";
  const ref = resolve(resourceId);
  return ref ? ref.name : resourceId;
}

export default function PlanningHubManipulationConfirm({
  draft,
  locale,
  timezone,
  resourceCategory,
  conflictPreview,
  saving,
  error,
  resolveResourceRef,
  onCancel,
  onConfirm,
}: Props) {
  const typeLabel = weekplannerActivityTypeLabel(draft.item.type);
  const primary = weekplannerPrimaryLabel(draft.item);
  const title = "Planung ändern";
  const subtitle = `${typeLabel} · ${primary}`;
  const isOccupancyDraft = draft.timeTarget === "resourceOccupancy";

  const activityRange = formatOccupancyRange(draft.item.startAt, draft.item.endAt, timezone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-4 sm:items-center"
      role="dialog"
      aria-label="Planungsänderung bestätigen"
      data-testid="planning-hub-manipulation-confirm"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">{subtitle}</p>

        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-[var(--surface-2)] p-2.5">
            <p className="font-semibold uppercase tracking-wide text-[var(--muted)]">Von</p>
            {isOccupancyDraft ? (
              <>
                {draft.originalResourceId && (
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {resourceShortLabel(draft.originalResourceId, resolveResourceRef)}
                  </p>
                )}
                <p className="mt-1 text-[var(--foreground)]">
                  Reserviert {formatOccupancyRange(draft.originalStart, draft.originalEnd, timezone)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[var(--foreground)]">
                {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: timezone }).format(
                  draft.originalStart,
                )}{" "}
                {formatOccupancyRange(draft.originalStart, draft.originalEnd, timezone)}
              </p>
            )}
            {!isOccupancyDraft && draft.originalResourceId && (
              <p className="mt-1 text-[var(--text-2)]">
                {resourceShortLabel(draft.originalResourceId, resolveResourceRef)}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-[var(--sce-primary)]/30 bg-[var(--sce-primary-light)]/20 p-2.5">
            <p className="font-semibold uppercase tracking-wide text-[var(--muted)]">Nach</p>
            {isOccupancyDraft ? (
              <>
                {draft.proposedResourceId && (
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {resourceShortLabel(draft.proposedResourceId, resolveResourceRef)}
                  </p>
                )}
                <p className="mt-1 text-[var(--foreground)]">
                  Reserviert {formatOccupancyRange(draft.proposedStart, draft.proposedEnd, timezone)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[var(--foreground)]">
                {new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: timezone }).format(
                  draft.proposedStart,
                )}{" "}
                {formatOccupancyRange(draft.proposedStart, draft.proposedEnd, timezone)}
              </p>
            )}
            {!isOccupancyDraft && draft.proposedResourceId && (
              <p className="mt-1 text-[var(--text-2)]">
                {resourceShortLabel(draft.proposedResourceId, resolveResourceRef)}
              </p>
            )}
          </div>
        </div>

        {isOccupancyDraft && draft.item.type === "MATCH" && (
          <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="planning-hub-manipulation-activity-unchanged">
            Spielzeit {activityRange} unverändert
          </p>
        )}

        {isOccupancyDraft && resourceCategory === "dressing" && draft.item.type === "TRAINING" && (
          <p className="mt-2 text-xs text-[var(--text-2)]">
            Trainingszeit {activityRange} unverändert
          </p>
        )}

        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 text-xs",
            conflictPreview.status === "warning" ? "text-amber-700" : "text-[var(--text-2)]",
          )}
          data-testid="planning-hub-manipulation-conflict-hint"
        >
          {conflictPreview.status === "warning" ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          )}
          {conflictPreview.message}
        </p>

        {error && (
          <p className="mt-2 text-xs text-rose-600" data-testid="planning-hub-manipulation-error">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            onClick={onCancel}
            disabled={saving}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            onClick={onConfirm}
            disabled={saving}
            data-testid="planning-hub-manipulation-confirm-apply"
          >
            Änderung übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}

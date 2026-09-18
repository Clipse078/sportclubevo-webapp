"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AlertTriangle, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import {
  aggregateInspectionRowStatus,
  aggregateInspectionStatusLabel,
  computeAggregateInspectionMetrics,
  computeAggregateTimeWindow,
  conflictPartnerDisplayTitle,
  filterAggregateInspectionItems,
  formatAggregateInspectionDayHeading,
  formatAggregateInspectionTimeRange,
  itemInspectionDressingLabel,
  itemInspectionPitchLabel,
  resolveAggregateSelectionId,
  type AggregateInspectionSortKey,
} from "@/lib/planning-hub/aggregate-inspection";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";
import {
  weekplannerActivityTypeLabel,
  weekplannerPrimaryLabel,
  weekplannerTeamLine,
  weekplannerTimingDetail,
} from "@/lib/planning-hub/item-presenters";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import {
  weekplannerConflictDoubleBookingHeadline,
  weekplannerConflictPartnerTimeLabel,
} from "@/lib/planning-hub/conflict-inspection-presenters";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type AggregatedActivityInspectionDialogProps = {
  open: boolean;
  onClose: () => void;
  items: WeekplannerItem[];
  dayKey: string;
  locale: string;
  timezone: string;
  onOpenItem: (item: WeekplannerItem) => void;
  onEditItem?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
};

const SORT_OPTIONS: { value: AggregateInspectionSortKey; label: string }[] = [
  { value: "start-asc", label: "Startzeit (aufsteigend)" },
  { value: "start-desc", label: "Startzeit (absteigend)" },
  { value: "team", label: "Team / Aktivität" },
  { value: "facility", label: "Anlage" },
];

function SummaryMetric({
  value,
  label,
  warning,
}: {
  value: number;
  label: string;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[4.5rem] flex-col rounded-lg border px-3 py-2",
        warning
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-[var(--border)]/80 bg-[var(--surface-2)]/50",
      )}
    >
      <span
        className={cn(
          "text-lg font-semibold tabular-nums leading-none",
          warning ? "text-amber-800/95" : "text-[var(--foreground)]",
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-[11px] text-[var(--muted)]">{label}</span>
    </div>
  );
}

export default function AggregatedActivityInspectionDialog({
  open,
  onClose,
  items,
  dayKey,
  locale,
  timezone,
  onOpenItem,
  onEditItem,
  canEditItem,
}: AggregatedActivityInspectionDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = "aggregated-activity-inspection-title";
  const descId = "aggregated-activity-inspection-desc";

  const [searchQuery, setSearchQuery] = useState("");
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [sortKey, setSortKey] = useState<AggregateInspectionSortKey>("start-asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const metrics = useMemo(() => computeAggregateInspectionMetrics(items), [items]);
  const timeWindow = useMemo(() => computeAggregateTimeWindow(items), [items]);
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );

  const visibleItems = useMemo(
    () =>
      filterAggregateInspectionItems(items, {
        query: searchQuery,
        conflictsOnly,
        sortKey,
      }),
    [items, searchQuery, conflictsOnly, sortKey],
  );

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setConflictsOnly(false);
    setSortKey("start-asc");
    setSelectedId(resolveAggregateSelectionId(items, null));
    setOverflowOpen(false);
  }, [open, items]);

  useEffect(() => {
    setSelectedId((current) => resolveAggregateSelectionId(visibleItems, current));
  }, [visibleItems]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectedItem = selectedId ? itemsById.get(selectedId) : undefined;
  const headerDate = formatAggregateInspectionDayHeading(dayKey, locale, timezone);
  const headerTime =
    timeWindow != null
      ? formatAggregateInspectionTimeRange(timeWindow, locale, timezone)
      : "—";
  const conflictsOnlyDisabled = metrics.conflictActivityCount === 0;

  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") e.stopPropagation();
  }

  const showEdit =
    selectedItem &&
    onEditItem &&
    (canEditItem ? canEditItem(selectedItem) : true);

  const openHref = selectedItem ? getPlanningHubItemHref(selectedItem) : null;

  return (
    <SceModalOverlay
      open={open}
      onBackdropClick={onClose}
      testId="aggregated-activity-inspection-dialog"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cn(SCE_DIALOG_WORKSPACE_PANEL, "h-[var(--sce-dialog-max-height)]")}
      >
        <header className="shrink-0 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold text-[var(--foreground)] sm:text-lg"
                data-testid="aggregate-inspection-title"
              >
                {metrics.activityCount} gleichzeitige Aktivitäten
              </h2>
              <p id={descId} className="mt-1 text-sm text-[var(--text-2)]">
                {headerDate} · {headerTime}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dialog schließen"
              onClick={onClose}
              className={cn(
                "shrink-0 rounded-lg p-1.5 text-[var(--text-2)]",
                "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div
            className="mt-3 flex flex-wrap gap-2"
            data-testid="aggregate-inspection-metrics"
          >
            <SummaryMetric value={metrics.activityCount} label="Aktivitäten" />
            <SummaryMetric value={metrics.trainingCount} label="Trainings" />
            <SummaryMetric
              value={metrics.conflictActivityCount}
              label="Konflikte"
              warning={metrics.conflictActivityCount > 0}
            />
            <SummaryMetric value={metrics.uniqueFacilityCount} label="Anlagen" />
            <SummaryMetric value={metrics.uniqueDressingRoomCount} label="Garderoben" />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section
            className="flex min-h-0 min-w-0 flex-1 flex-col border-[var(--border)] lg:border-r"
            aria-label="Aktivitäten vergleichen"
          >
            <div className="shrink-0 space-y-2 border-b border-[var(--border)]/80 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[12rem] flex-1">
                  <CenterWorkspaceSearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Aktivitäten durchsuchen …"
                    ariaLabel="Aktivitäten durchsuchen"
                  />
                </div>
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                    conflictsOnlyDisabled
                      ? "cursor-not-allowed border-[var(--border)]/60 text-[var(--muted)] opacity-60"
                      : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded border-[var(--border)]"
                    checked={conflictsOnly}
                    disabled={conflictsOnlyDisabled}
                    onChange={(e) => setConflictsOnly(e.target.checked)}
                    data-testid="aggregate-inspection-conflicts-only"
                  />
                  Nur Konflikte
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                  <span className="whitespace-nowrap">Sortieren nach</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as AggregateInspectionSortKey)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                    data-testid="aggregate-inspection-sort"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-[1] bg-[var(--surface)] shadow-[0_1px_0_var(--border)]">
                  <tr className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-3 py-2 font-semibold sm:px-4">Zeit</th>
                    <th className="px-2 py-2 font-semibold">Typ</th>
                    <th className="px-2 py-2 font-semibold">Team / Aktivität</th>
                    <th className="hidden px-2 py-2 font-semibold md:table-cell">Anlage</th>
                    <th className="hidden px-2 py-2 font-semibold lg:table-cell">Garderobe</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold sm:px-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody data-testid="aggregate-inspection-table-body">
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                        Keine Aktivitäten für die aktuelle Filterung.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item) => {
                      const selected = item.id === selectedId;
                      const semantic = activityVisualStyle(item.type);
                      const status = aggregateInspectionRowStatus(item);
                      const statusLabel = aggregateInspectionStatusLabel(status);
                      return (
                        <tr
                          key={item.id}
                          data-testid={`aggregate-inspection-row-${item.id}`}
                          data-selected={selected ? "true" : "false"}
                          className={cn(
                            "cursor-pointer border-b border-[var(--border)]/40 transition-colors",
                            selected
                              ? "bg-[var(--sce-primary)]/[0.08] ring-1 ring-inset ring-[var(--sce-primary)]/25"
                              : "hover:bg-[var(--surface-2)]/80",
                          )}
                          onClick={() => setSelectedId(item.id)}
                          onDoubleClick={() => onOpenItem(item)}
                        >
                          <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-[var(--text-2)] sm:px-4">
                            {weekplannerTimingDetail(item, locale, timezone)}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={cn("h-2 w-2 shrink-0 rounded-full", semantic.markerClass)}
                                aria-hidden
                              />
                              <span className="whitespace-nowrap text-[var(--foreground)]">
                                {weekplannerActivityTypeLabel(item.type)}
                              </span>
                            </span>
                          </td>
                          <td className="max-w-[14rem] px-2 py-1.5 sm:max-w-none">
                            <span className="block truncate font-medium text-[var(--foreground)]">
                              {schedulerDisplayIdentity(item)}
                            </span>
                          </td>
                          <td className="hidden max-w-[10rem] truncate px-2 py-1.5 text-[var(--text-2)] md:table-cell">
                            {itemInspectionPitchLabel(item)}
                          </td>
                          <td className="hidden max-w-[8rem] truncate px-2 py-1.5 text-[var(--text-2)] lg:table-cell">
                            {itemInspectionDressingLabel(item)}
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={cn(
                                "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                status === "conflict"
                                  ? "border-amber-500/35 bg-amber-500/10 text-amber-900/90"
                                  : status === "end-time-action"
                                    ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-800/90"
                                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]",
                              )}
                            >
                              {status === "conflict" && (
                                <AlertTriangle className="mr-0.5 h-3 w-3 shrink-0" aria-hidden />
                              )}
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 sm:px-3">
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--sce-primary)] hover:bg-[var(--surface-2)]"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenItem(item);
                              }}
                            >
                              Öffnen
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside
            className="flex w-full shrink-0 flex-col border-t border-[var(--border)] bg-[var(--surface)] lg:w-[min(32%,22rem)] lg:border-t-0"
            aria-label="Ausgewählte Aktivität"
            data-testid="aggregate-inspection-detail-pane"
          >
            {selectedItem ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {schedulerDisplayIdentity(selectedItem)}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-2)]">
                    {weekplannerActivityTypeLabel(selectedItem.type)} ·{" "}
                    {weekplannerTimingDetail(selectedItem, locale, timezone)}
                  </p>

                  <hr className="my-4 border-[var(--border)]/80" />

                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Team
                      </dt>
                      <dd className="mt-0.5 text-[var(--foreground)]">
                        {weekplannerTeamLine(selectedItem) ?? weekplannerPrimaryLabel(selectedItem)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Anlage
                      </dt>
                      <dd className="mt-0.5 text-[var(--foreground)]">
                        {itemInspectionPitchLabel(selectedItem)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Garderoben
                      </dt>
                      <dd className="mt-0.5 text-[var(--foreground)]">
                        {itemInspectionDressingLabel(selectedItem)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Status
                      </dt>
                      <dd className="mt-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-medium",
                            selectedItem.conflicts.length > 0
                              ? "text-amber-800/95"
                              : "text-[var(--foreground)]",
                          )}
                          data-testid="aggregate-inspection-detail-status"
                        >
                          {selectedItem.conflicts.length > 0 && (
                            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {aggregateInspectionStatusLabel(
                            aggregateInspectionRowStatus(selectedItem),
                          )}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  {selectedItem.conflicts.length > 0 && (
                    <div
                      className="mt-4 space-y-3"
                      data-testid="aggregate-inspection-conflict-explanations"
                    >
                      {selectedItem.conflicts.map((conflict, index) => {
                        const partnerTitle = conflictPartnerDisplayTitle(conflict, itemsById);
                        const partnerTime = weekplannerConflictPartnerTimeLabel(
                          conflict,
                          locale,
                          timezone,
                        );
                        return (
                          <div
                            key={`${conflict.facilityResourceId}-${conflict.partnerItemId ?? index}`}
                            className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] px-3 py-2.5"
                          >
                            <p className="flex items-start gap-1.5 text-sm font-semibold text-amber-900/95">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              {weekplannerConflictDoubleBookingHeadline(conflict)}
                            </p>
                            <p className="mt-2 text-xs font-medium text-[var(--text-2)]">
                              Zur gleichen Zeit durch:
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
                              {partnerTitle}
                            </p>
                            {partnerTime && (
                              <p className="text-xs tabular-nums text-[var(--muted)]">{partnerTime}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!openHref}
                    onClick={() => onOpenItem(selectedItem)}
                    data-testid="aggregate-inspection-open"
                  >
                    Öffnen
                  </Button>
                  {showEdit && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => onEditItem!(selectedItem)}
                      data-testid="aggregate-inspection-edit"
                    >
                      Bearbeiten
                    </Button>
                  )}
                  {openHref && (
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        aria-label="Weitere Aktionen"
                        className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                        onClick={() => setOverflowOpen((v) => !v)}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </button>
                      {overflowOpen && (
                        <div className="absolute bottom-full right-0 z-10 mb-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                          <a
                            href={openHref}
                            className="block px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                            onClick={() => setOverflowOpen(false)}
                          >
                            In neuem Tab öffnen
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="p-5 text-sm text-[var(--muted)]">Keine Aktivität ausgewählt.</p>
            )}
          </aside>
        </div>
      </div>
    </SceModalOverlay>
  );
}

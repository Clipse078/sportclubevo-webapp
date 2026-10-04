"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import { useSceModalDialog } from "@/lib/ui/use-sce-modal-dialog";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import { buildPlanningConflictIncidents } from "@/lib/planning-hub/conflict-attention";
import {
  buildConflictResolutionFeedback,
  canonicalConflictIncidentTotal,
  conflictsForIncidentOnItem,
  defaultActivityIdForIncident,
  filterConflictIncidents,
  type ConflictResolutionFilterKind,
} from "@/lib/planning-hub/conflict-resolution";
import {
  conflictPartnerDisplayTitle,
  itemInspectionDressingLabel,
  itemInspectionPitchLabel,
} from "@/lib/planning-hub/aggregate-inspection";
import {
  weekplannerActivityTypeLabel,
  weekplannerTimingDetail,
} from "@/lib/planning-hub/item-presenters";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import {
  weekplannerConflictDoubleBookingHeadline,
  weekplannerConflictPartnerTimeLabel,
  weekplannerResourceOccupancyTimeLabel,
} from "@/lib/planning-hub/conflict-inspection-presenters";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubConflictResolutionActions from "./PlanningHubConflictResolutionActions";

export type PlanningHubConflictWorkspaceDialogProps = {
  open: boolean;
  onClose: () => void;
  week: WeekplannerWeek;
  focusIncidentId?: string | null;
  locale: string;
  timezone: string;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  >;
  onOpenItem: (item: WeekplannerItem) => void;
  onEditItem?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
  pendingResolutionRef?: MutableRefObject<{
    itemId: string;
    conflictResourceId: string;
    beforeCount: number;
  } | null>;
};

function formatIncidentOverlapRange(
  incident: PlanningConflictIncident,
  locale: string,
  timeZone: string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(incident.startAt)}–${fmt.format(incident.endAt)}`;
}

function incidentActivityScanLine(
  incident: PlanningConflictIncident,
  itemsById: Map<string, WeekplannerItem>,
): string {
  return incident.itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is WeekplannerItem => !!item)
    .map((item) => schedulerDisplayIdentity(item))
    .join(" / ");
}

export default function PlanningHubConflictWorkspaceDialog({
  open,
  onClose,
  week,
  focusIncidentId,
  locale,
  timezone,
  permissionContext,
  onOpenItem,
  onEditItem,
  canEditItem,
  pendingResolutionRef: externalPendingRef,
}: PlanningHubConflictWorkspaceDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = "planning-conflict-workspace-title";

  const incidents = useMemo(() => buildPlanningConflictIncidents(week), [week]);
  const itemsById = useMemo(
    () =>
      new Map(
        week.days.flatMap((day) => day.items.map((item) => [item.id, item] as const)),
      ),
    [week],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ConflictResolutionFilterKind>("all");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const internalPendingRef = useRef<{
    itemId: string;
    conflictResourceId: string;
    beforeCount: number;
  } | null>(null);
  const pendingResolutionRef = externalPendingRef ?? internalPendingRef;

  const filteredIncidents = useMemo(
    () =>
      filterConflictIncidents(incidents, {
        query: searchQuery,
        kind: kindFilter,
        itemsById,
      }),
    [incidents, searchQuery, kindFilter, itemsById],
  );

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    setKindFilter("all");
    setFeedback(null);
    pendingResolutionRef.current = null;
    const initial =
      focusIncidentId && incidents.some((i) => i.id === focusIncidentId)
        ? focusIncidentId
        : (incidents[0]?.id ?? null);
    setSelectedIncidentId(initial);
  }, [open, focusIncidentId, incidents]);

  useEffect(() => {
    if (!open) return;
    if (
      selectedIncidentId &&
      !filteredIncidents.some((i) => i.id === selectedIncidentId)
    ) {
      setSelectedIncidentId(filteredIncidents[0]?.id ?? null);
    }
  }, [filteredIncidents, selectedIncidentId, open]);

  const selectedIncident = selectedIncidentId
    ? incidents.find((i) => i.id === selectedIncidentId) ?? null
    : null;

  useEffect(() => {
    if (!selectedIncident) {
      setSelectedActivityId(null);
      return;
    }
    setSelectedActivityId(defaultActivityIdForIncident(selectedIncident, itemsById));
  }, [selectedIncident, itemsById]);

  useEffect(() => {
    const pending = pendingResolutionRef.current;
    if (!pending) return;
    const after = itemsById.get(pending.itemId);
    if (!after || after.conflicts.length >= pending.beforeCount) return;
    const syntheticBefore = {
      ...after,
      conflicts: [{ facilityResourceId: pending.conflictResourceId, facilityResourceName: "" }],
    } as WeekplannerItem;
    const fb = buildConflictResolutionFeedback(syntheticBefore, after, {
      facilityResourceId: pending.conflictResourceId,
      facilityResourceName: "",
      resourceKind: "PITCH_HALL",
    });
    if (fb?.kind === "full") {
      setFeedback(fb.message);
    } else if (fb?.kind === "partial") {
      setFeedback(
        `✓ ${fb.resolvedLabel} behoben · ${fb.remainingCount} weiterer Konflikt${fb.remainingCount === 1 ? "" : "e"} bleibt bestehen`,
      );
    }
    pendingResolutionRef.current = null;
  }, [itemsById, incidents, pendingResolutionRef]);

  useSceModalDialog({ open, onClose, panelRef, initialFocusRef: titleRef });

  if (!open) return null;

  const selectedActivity = selectedActivityId ? itemsById.get(selectedActivityId) : undefined;
  const incidentIndex = selectedIncident
    ? filteredIncidents.findIndex((i) => i.id === selectedIncident.id)
    : -1;
  const totalCanonical = canonicalConflictIncidentTotal(incidents);

  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") e.stopPropagation();
  }

  function goRelative(delta: number) {
    if (incidentIndex < 0 || filteredIncidents.length === 0) return;
    const next =
      filteredIncidents[(incidentIndex + delta + filteredIncidents.length) %
        filteredIncidents.length];
    if (next) setSelectedIncidentId(next.id);
  }

  return (
    <SceModalOverlay
      open={open}
      onBackdropClick={onClose}
      testId="planning-conflict-workspace-dialog"
      initialFocusRef={titleRef}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handlePanelKeyDown}
        className={cn(SCE_DIALOG_WORKSPACE_PANEL, "w-full")}
      >
        <header className="shrink-0 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                ref={titleRef}
                id={titleId}
                tabIndex={-1}
                className="text-base font-semibold outline-none sm:text-lg"
              >
                Planungskonflikte prüfen
              </h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                {totalCanonical} Konflikt{totalCanonical === 1 ? "" : "e"} diese Woche
              </p>
            </div>
            <button
              type="button"
              aria-label="Dialog schließen"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {feedback && (
            <p
              className="mt-2 text-sm font-medium text-emerald-800"
              data-testid="conflict-workspace-feedback"
              role="status"
            >
              {feedback}
            </p>
          )}
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
          <section className="flex min-h-0 flex-col border-[var(--border)] lg:border-r">
            <div className="shrink-0 space-y-2 border-b border-[var(--border)]/80 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[12rem] flex-1">
                  <CenterWorkspaceSearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Konflikte durchsuchen …"
                    ariaLabel="Konflikte durchsuchen"
                  />
                </div>
                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value as ConflictResolutionFilterKind)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
                  data-testid="conflict-workspace-kind-filter"
                  aria-label="Konflikttyp filtern"
                >
                  <option value="all">Alle Konflikte</option>
                  <option value="PITCH_HALL">Spielfeld</option>
                  <option value="DRESSING_ROOM">Garderobe</option>
                </select>
              </div>
              {filteredIncidents.length > 1 && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-2)]">
                    Konflikt {incidentIndex + 1} von {filteredIncidents.length}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label="Vorheriger Konflikt"
                      data-testid="conflict-workspace-prev"
                      onClick={() => goRelative(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label="Nächster Konflikt"
                      data-testid="conflict-workspace-next"
                      onClick={() => goRelative(1)}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <ul
              className="min-h-0 flex-1 overflow-y-auto p-2"
              data-testid="conflict-workspace-incident-list"
            >
              {filteredIncidents.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                  Keine Konflikte für die aktuelle Filterung.
                </li>
              ) : (
                filteredIncidents.map((incident) => {
                  const selected = incident.id === selectedIncidentId;
                  const overlapRange = formatIncidentOverlapRange(incident, locale, timezone);
                  const activityScan = incidentActivityScanLine(incident, itemsById);
                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        data-testid={`conflict-workspace-incident-${incident.id}`}
                        className={cn(
                          "mb-1 w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors",
                          selected
                            ? "border-[var(--sce-primary)]/50 bg-[var(--sce-primary)]/[0.08] ring-1 ring-[var(--sce-primary)]/25"
                            : "border-[var(--border)]/60 hover:bg-[var(--surface-2)]",
                        )}
                        onClick={() => setSelectedIncidentId(incident.id)}
                      >
                        <span className="flex items-center gap-1 font-semibold text-[var(--foreground)]">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden />
                          {incident.facilityResourceName}
                        </span>
                        <span className="mt-0.5 block text-[var(--text-2)]">
                          {overlapRange}
                          {activityScan ? ` · ${activityScan}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <aside
            className={cn(
              "flex min-h-0 flex-col border-t border-[var(--border)] lg:border-t-0",
              selectedIncident && "border-l-2 border-l-[var(--sce-primary)]/40 lg:border-l-[var(--sce-primary)]/40",
            )}
            data-testid="conflict-workspace-detail"
          >
            {selectedIncident && selectedActivity ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <p className="text-base font-semibold">{schedulerDisplayIdentity(selectedActivity)}</p>
                <p
                  className="mt-0.5 text-sm text-[var(--text-2)]"
                  data-testid="conflict-workspace-activity-sport-time"
                >
                  {weekplannerActivityTypeLabel(selectedActivity.type)} · Sporttermin{" "}
                  {weekplannerTimingDetail(selectedActivity, locale, timezone)}
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Anlage
                    </dt>
                    <dd>{itemInspectionPitchLabel(selectedActivity)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Garderobe
                    </dt>
                    <dd>{itemInspectionDressingLabel(selectedActivity)}</dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-3">
                  {conflictsForIncidentOnItem(selectedActivity, selectedIncident).map(
                    (conflict, index) => {
                      const partnerTitle = conflictPartnerDisplayTitle(conflict, itemsById);
                      const partnerTime = weekplannerConflictPartnerTimeLabel(
                        conflict,
                        locale,
                        timezone,
                      );
                      const ownReservation = weekplannerResourceOccupancyTimeLabel(
                        selectedActivity,
                        conflict.facilityResourceId,
                        locale,
                        timezone,
                      );
                      return (
                        <div
                          key={`${conflict.facilityResourceId}-${conflict.partnerItemId ?? index}`}
                          className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] px-3 py-2.5"
                          data-testid="conflict-workspace-conflict-block"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Konflikt
                          </p>
                          <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-amber-900/95">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            {weekplannerConflictDoubleBookingHeadline(conflict)}
                          </p>
                          {ownReservation && (
                            <p
                              className="mt-2 text-xs text-[var(--text-2)]"
                              data-testid="conflict-workspace-own-reservation"
                            >
                              Reservierung {conflict.facilityResourceName}:{" "}
                              <span className="tabular-nums font-medium">{ownReservation}</span>
                            </p>
                          )}
                          <p className="mt-2 text-xs font-medium text-[var(--text-2)]">
                            Zur gleichen Zeit:
                          </p>
                          <p className="text-sm font-semibold">{partnerTitle}</p>
                          {partnerTime && (
                            <p className="text-xs tabular-nums text-[var(--muted)]">
                              Reservierung {partnerTime}
                            </p>
                          )}
                          <PlanningHubConflictResolutionActions
                            item={selectedActivity}
                            conflict={conflict}
                            permissionContext={permissionContext}
                            onOpenItem={onOpenItem}
                            onEditItem={onEditItem}
                            canEditItem={canEditItem}
                            testIdPrefix="conflict-workspace"
                          />
                        </div>
                      );
                    },
                  )}
                </div>

                {selectedIncident.itemIds.length > 1 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Betroffene Aktivitäten
                    </p>
                    <ul className="mt-1 space-y-1">
                      {selectedIncident.itemIds.map((id) => {
                        const item = itemsById.get(id);
                        if (!item) return null;
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              className={cn(
                                "w-full rounded-md px-2 py-1 text-left text-xs hover:bg-[var(--surface-2)]",
                                id === selectedActivityId && "bg-[var(--surface-2)] font-semibold",
                              )}
                              onClick={() => setSelectedActivityId(id)}
                            >
                              {schedulerDisplayIdentity(item)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="p-5 text-sm text-[var(--muted)]">Kein Konflikt ausgewählt.</p>
            )}
          </aside>
        </div>
      </div>
    </SceModalOverlay>
  );
}

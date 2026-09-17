"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { usePublishPlannerWeekChrome } from "./PlannerWeekChromeBridge";
import {
  fetchPlanningHubFacilityGroupsClient,
  type PlanningHubFacilityGroups,
} from "@/lib/planning-hub/fetch-facility-groups-client";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/page/EmptyState";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { WeekplannerPlanDto } from "@/lib/weekplanner/plan-types";
const WeekplannerPlanningSheet = dynamic(
  () => import("./WeekplannerPlanningSheet").then((m) => m.WeekplannerPlanningSheet),
  { ssr: false },
);
const WeekplannerOperationalPlanningSheet = dynamic(
  () =>
    import("./WeekplannerOperationalPlanningSheet").then((m) => m.WeekplannerOperationalPlanningSheet),
  { ssr: false },
);
import PlanningHubConflictSheet from "@/components/admin/planning-hub/PlanningHubConflictSheet";
import PlanningHubCalendarView from "@/components/admin/planning-hub/PlanningHubCalendarView";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { PlanningHubManipulationProvider } from "@/components/admin/planning-hub/PlanningHubManipulationContext";
import { buildResourceSegmentsForDay } from "@/lib/planning-hub/scheduler/resource-segments";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import {
  resolvePlanningHubResourceDay,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import { dayKeyInTimeZone } from "@/lib/planning-hub/scheduler/time-zone";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import type { WeekplannerOverrideRow } from "./WeekplannerAllocationOverrideEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";

type OverrideEditingContext = {
  planId: string;
  planName: string;
  overridesByKey: Record<string, WeekplannerOverrideRow[]>;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

type CanonicalEditingContext = {
  canManageTrainings: boolean;
  canManageEvents: boolean;
  facilityGroupsByAllocationGroup?: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
};

export type WeekPlannerWorkspaceProps = {
  week: WeekplannerWeek;
  locale?: string;
  timezone?: string;
  plans?: WeekplannerPlanDto[];
  activePlanId?: string | null;
  overrideEditing?: OverrideEditingContext;
  canonicalEditing?: CanonicalEditingContext;
  urlState?: PlanningHubUrlState;
  dressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  selectedIncident?: PlanningConflictIncident | null;
  conflictPicker?: PlanningConflictIncident[] | null;
  onCloseIncident?: () => void;
  onCloseConflictPicker?: () => void;
  onPickConflictIncident?: (incident: PlanningConflictIncident) => void;
};

function getMissingAllocations(item: WeekplannerItem): string[] {
  const missing: string[] = [];
  if (item.pitchAllocations.length === 0) missing.push("Spielfeld");
  if (item.type === "MATCH") {
    if (item.dressingRoomAllocations.length === 0) missing.push("Heimkabine");
    if (item.awayDressingRoomAllocations.length === 0) missing.push("Gastkabine");
  }
  return missing;
}

export default function WeekPlannerWorkspace({
  week,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  plans = [],
  activePlanId = null,
  overrideEditing,
  canonicalEditing,
  urlState: urlStateProp,
  dressingRoomOccupancyPresets,
  selectedIncident,
  conflictPicker,
  onCloseIncident,
  onCloseConflictPicker,
  onPickConflictIncident,
}: WeekPlannerWorkspaceProps) {
  const router = useRouter();
  const urlState: PlanningHubUrlState = urlStateProp ?? {
    week: week.param,
    perspective: "kalender",
    activity: "alle",
    team: null,
    facility: null,
    conflictsOnly: false,
    resourceCategory: "pitch",
  };

  const filteredWeek = applyPlanningHubFilters(week, urlState);
  const totalItems = filteredWeek.days.reduce((sum, day) => sum + day.items.length, 0);
  const todayDayKey = dayKeyInTimeZone(new Date(), timezone);

  const isStandardplan = activePlanId === null;
  const incompleteCount = isStandardplan
    ? filteredWeek.days.reduce(
        (sum, day) =>
          sum + day.items.filter((item) => getMissingAllocations(item).length > 0).length,
        0,
      )
    : 0;

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const day of week.days) {
      for (const item of day.items) {
        if (item.type === "TRAINING") {
          map.set(item.teamSeasonId, item.teamNames[0] ?? item.title);
        } else if (item.teamNames[0]) {
          map.set(item.teamNames[0], item.teamNames[0]);
        }
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "de-CH"));
  }, [week]);

  const [internalSelectedIncident, setInternalSelectedIncident] =
    useState<PlanningConflictIncident | null>(null);
  const [internalConflictPicker, setInternalConflictPicker] = useState<
    PlanningConflictIncident[] | null
  >(null);

  const isConflictControlled = selectedIncident !== undefined;
  const resolvedSelectedIncident = isConflictControlled ? selectedIncident ?? null : internalSelectedIncident;
  const resolvedConflictPicker = isConflictControlled ? conflictPicker ?? null : internalConflictPicker;

  const handleReviewConflicts = useCallback(
    (incidents: PlanningConflictIncident[]) => {
      if (incidents.length === 1) {
        const incident = incidents[0]!;
        if (isConflictControlled) {
          onPickConflictIncident?.(incident);
        } else {
          setInternalSelectedIncident(incident);
        }
        return;
      }
      if (!isConflictControlled) {
        setInternalConflictPicker(incidents);
      }
    },
    [isConflictControlled, onPickConflictIncident],
  );

  const publishChrome = usePublishPlannerWeekChrome();
  useLayoutEffect(() => {
    publishChrome({
      week,
      teamOptions,
      incompleteCount,
      onReviewConflicts: handleReviewConflicts,
    });
  }, [publishChrome, week, teamOptions, incompleteCount, handleReviewConflicts]);

  const [editingItem, setEditingItem] = useState<WeekplannerItem | null>(null);
  const [operationalEditingItem, setOperationalEditingItem] = useState<WeekplannerItem | null>(null);
  const canEdit = !!canonicalEditing;

  const itemsById = new Map(
    week.days.flatMap((day) => day.items.map((item) => [item.id, item] as const)),
  );

  function handleEdit(item: WeekplannerItem) {
    if (!canonicalEditing) return;
    const canEditThisItem =
      item.type !== "VERANSTALTUNG" &&
      ((item.type === "TRAINING" && canonicalEditing.canManageTrainings) ||
        ((item.type === "MATCH" || item.type === "TOURNAMENT") && canonicalEditing.canManageEvents));
    if (canEditThisItem) setEditingItem(item);
  }

  function handleOperationalEdit(item: WeekplannerItem) {
    if (!overrideEditing) return;
    setOperationalEditingItem(item);
  }

  function handleItemActivate(item: WeekplannerItem) {
    if (item.type === "VERANSTALTUNG") {
      const href = getPlanningHubItemHref(item);
      if (href) router.push(href);
      return;
    }
    if (activePlanId && overrideEditing) {
      handleOperationalEdit(item);
      return;
    }
    if (isStandardplan && canEdit) {
      handleEdit(item);
    }
  }

  const resolvedUrlState = { ...urlState, week: week.param };

  const [lazyFacilityGroups, setLazyFacilityGroups] = useState<PlanningHubFacilityGroups | null>(
    null,
  );

  useEffect(() => {
    if (!canonicalEditing && !overrideEditing) return;
    if (canonicalEditing?.facilityGroupsByAllocationGroup || overrideEditing?.facilityGroupsByAllocationGroup) {
      return;
    }
    let cancelled = false;
    fetchPlanningHubFacilityGroupsClient()
      .then((groups) => {
        if (!cancelled) setLazyFacilityGroups(groups);
      })
      .catch(() => {
        /* sheet/manipulation falls back to week item refs until retry */
      });
    return () => {
      cancelled = true;
    };
  }, [canonicalEditing, overrideEditing]);

  const manipulationFacilityGroups =
    canonicalEditing?.facilityGroupsByAllocationGroup ??
    overrideEditing?.facilityGroupsByAllocationGroup ??
    lazyFacilityGroups;

  const resourceRowsForManipulation = useMemo(() => {
    if (urlState.perspective !== "ressourcen" || !manipulationFacilityGroups) return [];
    const filtered = applyPlanningHubFilters(week, resolvedUrlState);
    const weekDayKeys = filtered.days.map((d) => d.dayKey);
    const selectedDay = resolvePlanningHubResourceDay(weekDayKeys, urlState.day, todayDayKey);
    const day = filtered.days.find((d) => d.dayKey === selectedDay) ?? filtered.days[0];
    if (!day) return [];
    const segments = buildResourceSegmentsForDay(day.items, urlState.resourceCategory);
    return segments.map((s) => ({
      resourceId: s.resource.facilityResourceId,
      ref: s.resource,
    }));
  }, [week, resolvedUrlState, urlState.perspective, urlState.day, urlState.resourceCategory, todayDayKey, manipulationFacilityGroups]);

  const wrapManipulation = (node: ReactNode) => {
    if (!canonicalEditing && !overrideEditing) return node;
    return (
      <PlanningHubManipulationProvider
        week={week}
        urlState={resolvedUrlState}
        locale={locale}
        timezone={timezone}
        isStandardplan={isStandardplan}
        alternativePlanId={activePlanId}
        canManageTrainings={canonicalEditing?.canManageTrainings ?? false}
        canManageEvents={canonicalEditing?.canManageEvents ?? false}
        facilityGroupsByAllocationGroup={manipulationFacilityGroups ?? undefined}
        overridesByKey={overrideEditing?.overridesByKey}
        resourceRows={resourceRowsForManipulation}
      >
        {node}
      </PlanningHubManipulationProvider>
    );
  };

  return (
    <div
      className="space-y-2 opacity-0 animate-[plannerContentReveal_180ms_ease-out_forwards]"
      data-testid="planning-hub-planner-content"
    >
      {totalItems === 0 ? (
        <EmptyState
          heading="Keine Planungseinträge"
          description="Für diese Kalenderwoche gibt es keine passenden Aktivitäten."
        />
      ) : urlState.perspective === "kalender" ? (
        wrapManipulation(
          <PlanningHubCalendarView
            week={week}
            urlState={resolvedUrlState}
            locale={locale}
            timezone={timezone}
            todayDayKey={todayDayKey}
            onItemActivate={handleItemActivate}
          />,
        )
      ) : urlState.perspective === "ressourcen" ? (
        wrapManipulation(
          <PlanningHubResourceDayView
            week={week}
            urlState={resolvedUrlState}
            locale={locale}
            timezone={timezone}
            todayDayKey={todayDayKey}
            onItemActivate={handleItemActivate}
          />,
        )
      ) : (
        <PlanningHubListeView
          week={week}
          urlState={resolvedUrlState}
          locale={locale}
          timezone={timezone}
          planName={activePlanId ? plans.find((p) => p.id === activePlanId)?.name ?? null : null}
          onItemActivate={handleItemActivate}
          canManageMatchSchedule={canonicalEditing?.canManageEvents ?? false}
        />
      )}

      {canonicalEditing && (
        <WeekplannerPlanningSheet
          item={editingItem}
          facilityGroupsByAllocationGroup={
            manipulationFacilityGroups ?? { PITCH_HALL: [], DRESSING_ROOM: [] }
          }
          timezone={timezone}
          tenantDressingRoomOccupancyPresets={dressingRoomOccupancyPresets}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            router.refresh();
          }}
        />
      )}

      {overrideEditing && (
        <WeekplannerOperationalPlanningSheet
          item={operationalEditingItem}
          planId={overrideEditing.planId}
          planName={overrideEditing.planName}
          overridesByKey={overrideEditing.overridesByKey}
          facilityGroupsByAllocationGroup={overrideEditing.facilityGroupsByAllocationGroup}
          timezone={timezone}
          onClose={() => setOperationalEditingItem(null)}
          onSaved={() => setOperationalEditingItem(null)}
        />
      )}

      <PlanningHubConflictSheet
        incident={resolvedSelectedIncident}
        itemsById={itemsById}
        locale={locale}
        timezone={timezone}
        reassignContext={
          canonicalEditing
            ? {
                canManageTrainings: canonicalEditing.canManageTrainings,
                canManageEvents: canonicalEditing.canManageEvents,
                isStandardplan: activePlanId === null,
              }
            : undefined
        }
        onClose={() => onCloseIncident?.()}
        onReassignItem={(item) => {
          onCloseIncident?.();
          handleEdit(item);
        }}
      />

      {resolvedConflictPicker && resolvedConflictPicker.length > 1 && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
          role="dialog"
          aria-label="Konflikte auswählen"
        >
          <div className="max-h-[70vh] w-full max-w-md overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Konflikte prüfen</p>
            <ul className="space-y-1">
              {resolvedConflictPicker.map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
                    onClick={() => onPickConflictIncident?.(incident)}
                  >
                    {incident.facilityResourceName} · {incident.occupancyCount} Belegungen
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--text-2)]"
              onClick={() => onCloseConflictPicker?.()}
            >
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

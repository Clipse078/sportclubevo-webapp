"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import PlanningHubConflictWorkspaceDialog from "@/components/admin/planning-hub/PlanningHubConflictWorkspaceDialog";
import PlanningHubCalendarView from "@/components/admin/planning-hub/PlanningHubCalendarView";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { PlanningHubManipulationProvider } from "@/components/admin/planning-hub/PlanningHubManipulationContext";
import { buildResourceSegmentsForDay } from "@/lib/planning-hub/scheduler/resource-segments";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import { buildPlanningHubTeamOptions } from "@/lib/planning-hub/team-filter";
import {
  buildPlanningConflictIncidents,
  type PlanningConflictIncident,
} from "@/lib/planning-hub/conflict-attention";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import {
  isPlanningHubResourceTimelinePerspective,
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
  canManageAllocations: boolean;
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
  resourceTimelineCatalog?: PlanningHubFacilityGroups;
  conflictWorkspaceOpen?: boolean;
  onOpenConflictWorkspace?: () => void;
  onCloseConflictWorkspace?: () => void;
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
  resourceTimelineCatalog,
  conflictWorkspaceOpen = false,
  onOpenConflictWorkspace,
  onCloseConflictWorkspace,
}: WeekPlannerWorkspaceProps) {
  const router = useRouter();
  const urlState: PlanningHubUrlState = urlStateProp ?? {
    week: week.param,
    perspective: "kalender",
    activity: "alle",
    team: null,
    facility: null,
    search: "",
    conflictsOnly: false,
    resourceCategory: "pitch",
    resourceFilterIds: null,
  };

  const filteredWeek = applyPlanningHubFilters(week, urlState);
  const weekTotalItems = week.days.reduce((sum, day) => sum + day.items.length, 0);
  const todayDayKey = dayKeyInTimeZone(new Date(), timezone);

  const isStandardplan = activePlanId === null;
  const incompleteCount = isStandardplan
    ? filteredWeek.days.reduce(
        (sum, day) =>
          sum + day.items.filter((item) => getMissingAllocations(item).length > 0).length,
        0,
      )
    : 0;

  const teamOptions = useMemo(() => buildPlanningHubTeamOptions(week), [week]);

  const [conflictFocusIncidentId, setConflictFocusIncidentId] = useState<string | null>(null);
  const [internalConflictWorkspaceOpen, setInternalConflictWorkspaceOpen] = useState(false);
  const conflictWorkspaceVisible = onCloseConflictWorkspace
    ? conflictWorkspaceOpen
    : internalConflictWorkspaceOpen;
  const closeConflictWorkspace = onCloseConflictWorkspace ?? (() => setInternalConflictWorkspaceOpen(false));

  const handleReviewConflicts = useCallback(
    (_incidents: PlanningConflictIncident[], focusIncidentId?: string | null) => {
      setConflictFocusIncidentId(focusIncidentId ?? null);
      if (onOpenConflictWorkspace) {
        onOpenConflictWorkspace();
      } else {
        setInternalConflictWorkspaceOpen(true);
      }
    },
    [onOpenConflictWorkspace],
  );

  const handleReviewConflictForItem = useCallback(
    (item: WeekplannerItem) => {
      const incidents = buildPlanningConflictIncidents(week);
      const incident = incidents.find((entry) => entry.itemIds.includes(item.id));
      handleReviewConflicts(incidents, incident?.id ?? null);
    },
    [week, handleReviewConflicts],
  );

  const conflictResolutionPendingRef = useRef<{
    itemId: string;
    incidentId: string | null;
    conflictResourceId: string;
    beforeIncidentTotal: number;
    beforeItemConflictCount: number;
    successMessage: string | null;
  } | null>(null);

  const [editingItem, setEditingItem] = useState<WeekplannerItem | null>(null);
  const [operationalEditingItem, setOperationalEditingItem] = useState<WeekplannerItem | null>(null);
  const canEdit = !!canonicalEditing;

  const itemsById = new Map(
    week.days.flatMap((day) => day.items.map((item) => [item.id, item] as const)),
  );

  function handleEdit(item: WeekplannerItem) {
    if (!canonicalEditing) return;
    const canEditThisItem =
      (item.type === "TRAINING" && canonicalEditing.canManageTrainings) ||
      ((item.type === "MATCH" ||
        item.type === "TOURNAMENT" ||
        item.type === "VERANSTALTUNG") &&
        canonicalEditing.canManageEvents);
    if (canEditThisItem) setEditingItem(item);
  }

  function handleOperationalEdit(item: WeekplannerItem) {
    if (!overrideEditing) return;
    setOperationalEditingItem(item);
  }

  function handleItemOpen(item: WeekplannerItem) {
    const href = getPlanningHubItemHref(item);
    if (href) router.push(href);
  }

  function canEditPlannerItem(item: WeekplannerItem): boolean {
    if (activePlanId && overrideEditing && item.type !== "VERANSTALTUNG") return true;
    if (!canonicalEditing) return false;
    return (
      (item.type === "TRAINING" && canonicalEditing.canManageTrainings) ||
      ((item.type === "MATCH" ||
        item.type === "TOURNAMENT" ||
        item.type === "VERANSTALTUNG") &&
        canonicalEditing.canManageEvents)
    );
  }

  function handleItemActivate(item: WeekplannerItem) {
    if (item.type === "VERANSTALTUNG" && activePlanId && overrideEditing) {
      handleItemOpen(item);
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

  const needsTimelineCatalog =
    isPlanningHubResourceTimelinePerspective(urlState.perspective) ||
    !!canonicalEditing ||
    !!overrideEditing;

  useEffect(() => {
    if (!needsTimelineCatalog) return;
    if (
      resourceTimelineCatalog ||
      canonicalEditing?.facilityGroupsByAllocationGroup ||
      overrideEditing?.facilityGroupsByAllocationGroup
    ) {
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
  }, [needsTimelineCatalog, resourceTimelineCatalog, canonicalEditing, overrideEditing]);

  const manipulationFacilityGroups =
    resourceTimelineCatalog ??
    canonicalEditing?.facilityGroupsByAllocationGroup ??
    overrideEditing?.facilityGroupsByAllocationGroup ??
    lazyFacilityGroups;

  const publishChrome = usePublishPlannerWeekChrome();
  useLayoutEffect(() => {
    publishChrome({
      week,
      teamOptions,
      incompleteCount,
      onReviewConflicts: handleReviewConflicts,
      resourceTimelineCatalog: manipulationFacilityGroups ?? undefined,
    });
  }, [
    publishChrome,
    week,
    teamOptions,
    incompleteCount,
    handleReviewConflicts,
    manipulationFacilityGroups,
  ]);

  const resourceRowsForManipulation = useMemo(() => {
    if (!isPlanningHubResourceTimelinePerspective(urlState.perspective) || !manipulationFacilityGroups) {
      return [];
    }
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

  const handleManipulationApplied = useCallback(
    (draft: SchedulerDraftChange) => {
      const item = itemsById.get(draft.itemId);
      if (!item) return;
      const conflictResourceId =
        draft.originalResourceId ??
        draft.proposedResourceId ??
        (draft.timeTarget === "resourceOccupancy" ? draft.segmentId?.split(":")[1] : undefined) ??
        item.conflicts[0]?.facilityResourceId;
      if (!conflictResourceId) return;
      const incidentsBefore = buildPlanningConflictIncidents(week);
      conflictResolutionPendingRef.current = {
        itemId: item.id,
        incidentId: conflictResourceId
          ? incidentsBefore.find(
              (incident) =>
                incident.facilityResourceId === conflictResourceId &&
                incident.itemIds.includes(item.id),
            )?.id ?? null
          : null,
        conflictResourceId,
        beforeIncidentTotal: incidentsBefore.length,
        beforeItemConflictCount: item.conflicts.length,
        successMessage:
          draft.proposedResourceId && draft.timeTarget === "resourceOccupancy"
            ? `Planung aktualisiert`
            : "Planung aktualisiert",
      };
    },
    [itemsById, week],
  );

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
        canManageAllocations={canonicalEditing?.canManageAllocations ?? false}
        facilityGroupsByAllocationGroup={manipulationFacilityGroups ?? undefined}
        overridesByKey={overrideEditing?.overridesByKey}
        resourceRows={resourceRowsForManipulation}
        onManipulationApplied={handleManipulationApplied}
      >
        {node}
      </PlanningHubManipulationProvider>
    );
  };

  const manipulationPermissionContext = {
    canManageTrainings: canonicalEditing?.canManageTrainings ?? false,
    canManageEvents: canonicalEditing?.canManageEvents ?? false,
    canManageAllocations: canonicalEditing?.canManageAllocations ?? false,
    isStandardplan,
    alternativePlanId: activePlanId,
  };

  const plannerPerspective =
    weekTotalItems === 0 ? (
      <EmptyState
        heading="Keine Planungseinträge"
        description="Für diese Kalenderwoche gibt es keine Aktivitäten."
      />
    ) : urlState.perspective === "kalender" ? (
      <PlanningHubCalendarView
        week={week}
        urlState={resolvedUrlState}
        locale={locale}
        timezone={timezone}
        todayDayKey={todayDayKey}
        onItemActivate={handleItemActivate}
        onItemOpen={handleItemOpen}
        onItemEdit={handleItemActivate}
        canEditItem={canEditPlannerItem}
      />
    ) : isPlanningHubResourceTimelinePerspective(urlState.perspective) ? (
      <PlanningHubResourceDayView
        week={week}
        urlState={resolvedUrlState}
        locale={locale}
        timezone={timezone}
        todayDayKey={todayDayKey}
        onItemActivate={handleItemActivate}
        resourceCatalogGroups={manipulationFacilityGroups ?? undefined}
      />
    ) : (
      <PlanningHubListeView
        week={week}
        urlState={resolvedUrlState}
        locale={locale}
        timezone={timezone}
        onItemOpen={handleItemOpen}
        onItemEditPlanning={(item) => {
          if (activePlanId && overrideEditing) {
            handleOperationalEdit(item);
            return;
          }
          handleEdit(item);
        }}
        onReviewConflictForItem={handleReviewConflictForItem}
        canEditItem={canEditPlannerItem}
        permissionContext={{
          canManageTrainings: canonicalEditing?.canManageTrainings ?? false,
          canManageEvents: canonicalEditing?.canManageEvents ?? false,
          canManageAllocations: canonicalEditing?.canManageAllocations ?? false,
          isStandardplan,
          alternativePlanId: activePlanId,
        }}
      />
    );

  return (
    <div
      className="space-y-2 opacity-0 animate-[plannerContentReveal_180ms_ease-out_forwards]"
      data-testid="planning-hub-planner-content"
    >
      {wrapManipulation(
        <>
          {plannerPerspective}
          <PlanningHubConflictWorkspaceDialog
            open={conflictWorkspaceVisible}
            onClose={closeConflictWorkspace}
            week={week}
            focusIncidentId={conflictFocusIncidentId}
            locale={locale}
            timezone={timezone}
            permissionContext={manipulationPermissionContext}
            onOpenItem={handleItemOpen}
            onEditItem={canEdit ? handleEdit : undefined}
            canEditItem={canEditPlannerItem}
            pendingResolutionRef={conflictResolutionPendingRef}
          />
        </>,
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

    </div>
  );
}

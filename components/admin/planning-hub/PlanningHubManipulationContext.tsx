"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerOverrideRow } from "@/components/admin/planner/WeekplannerAllocationOverrideEditor";
import { applyStandardPlanSchedulerDraft } from "@/lib/planning-hub/canonical-planning-mutations";
import { applyAlternativePlanSchedulerDraft } from "@/lib/planning-hub/operational-planning-mutations";
import {
  evaluateManipulationConflicts,
  projectItemWithDraft,
} from "@/lib/planning-hub/manipulation-projection";
import {
  getSchedulerManipulationCapabilities,
  hasAnyManipulationCapability,
  type ManipulationPermissionContext,
  type SchedulerManipulationCapabilities,
} from "@/lib/planning-hub/manipulation-capabilities";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import {
  preserveDurationOnMove,
  resizeEndPreservingStart,
  snapMinutesFromMidnight,
  snapPixelDeltaToMinutes,
} from "@/lib/planning-hub/scheduler/time-snap";
import { zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import {
  CALENDAR_PIXELS_PER_MINUTE,
  RESOURCE_PIXELS_PER_MINUTE,
} from "@/lib/planning-hub/scheduler/time-scale";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import { isNoOpDraft } from "@/lib/planning-hub/scheduler-draft";
import type { WeekplannerItem, WeekplannerResourceRef, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubManipulationConfirm from "./PlanningHubManipulationConfirm";

export type ManipulationSurface = "kalender" | "ressourcen";

type ActivePointerSession = {
  mode: "move" | "resize";
  surface: ManipulationSurface;
  item: WeekplannerItem;
  segmentId?: string;
  originalResourceId?: string;
  startClientX: number;
  startClientY: number;
  originalStart: Date;
  originalEnd: Date;
  capabilities: SchedulerManipulationCapabilities;
};

type PlanningHubManipulationContextValue = {
  enabled: boolean;
  isDragging: boolean;
  permissionContext: ManipulationPermissionContext;
  previewDraft: SchedulerDraftChange | null;
  hoverResourceId: string | null;
  getCapabilities: (item: WeekplannerItem) => SchedulerManipulationCapabilities;
  beginCalendarMove: (item: WeekplannerItem, clientY: number) => void;
  beginCalendarResize: (item: WeekplannerItem, clientY: number) => void;
  beginResourceMove: (
    item: WeekplannerItem,
    segmentId: string,
    resourceId: string,
    clientX: number,
    clientY: number,
  ) => void;
  cancelManipulation: () => void;
  resolveResourceRef: (resourceId: string) => WeekplannerResourceRef | null;
};

const PlanningHubManipulationContext = createContext<PlanningHubManipulationContextValue | null>(null);

export function usePlanningHubManipulation(): PlanningHubManipulationContextValue | null {
  return useContext(PlanningHubManipulationContext);
}

type ProviderProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  timezone: string;
  locale: string;
  isStandardplan: boolean;
  alternativePlanId: string | null;
  canManageTrainings: boolean;
  canManageEvents: boolean;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  overridesByKey?: Record<string, WeekplannerOverrideRow[]>;
  resourceRows?: { resourceId: string; ref: WeekplannerResourceRef }[];
  children: ReactNode;
};

export function PlanningHubManipulationProvider({
  week,
  urlState,
  timezone,
  locale,
  isStandardplan,
  alternativePlanId,
  canManageTrainings,
  canManageEvents,
  facilityGroupsByAllocationGroup,
  overridesByKey = {},
  resourceRows = [],
  children,
}: ProviderProps) {
  const router = useRouter();
  const [pointerSession, setPointerSession] = useState<ActivePointerSession | null>(null);
  const [previewDraft, setPreviewDraft] = useState<SchedulerDraftChange | null>(null);
  const [confirmationDraft, setConfirmationDraft] = useState<SchedulerDraftChange | null>(null);
  const [hoverResourceId, setHoverResourceId] = useState<string | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const pointerSessionRef = useRef(pointerSession);
  pointerSessionRef.current = pointerSession;
  const previewDraftRef = useRef(previewDraft);
  previewDraftRef.current = previewDraft;

  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    const mq = window.matchMedia?.("(min-width: 768px)");
    const desktop = mq ? mq.matches : true;
    return (
      desktop &&
      (canManageTrainings || canManageEvents) &&
      (isStandardplan || !!alternativePlanId)
    );
  }, [canManageTrainings, canManageEvents, isStandardplan, alternativePlanId]);

  const permissionContext: ManipulationPermissionContext = useMemo(
    () => ({
      isStandardplan,
      canManageTrainings,
      canManageEvents,
      alternativePlanId,
      resourceCategory: urlState.resourceCategory,
    }),
    [isStandardplan, canManageTrainings, canManageEvents, alternativePlanId, urlState.resourceCategory],
  );

  const allItems = useMemo(() => week.days.flatMap((d) => d.items), [week.days]);

  const resourceRefById = useMemo(() => {
    const map = new Map<string, WeekplannerResourceRef>();
    for (const row of resourceRows) map.set(row.resourceId, row.ref);
    for (const group of facilityGroupsByAllocationGroup.PITCH_HALL) {
      for (const r of group.resources) {
        map.set(r.id, {
          facilityResourceId: r.id,
          facilityId: r.facilityId,
          code: r.code,
          name: r.name,
          facilityName: r.facilityName,
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        });
      }
    }
    for (const group of facilityGroupsByAllocationGroup.DRESSING_ROOM) {
      for (const r of group.resources) {
        map.set(r.id, {
          facilityResourceId: r.id,
          facilityId: r.facilityId,
          code: r.code,
          name: r.name,
          facilityName: r.facilityName,
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        });
      }
    }
    return map;
  }, [resourceRows, facilityGroupsByAllocationGroup]);

  const resolveResourceRef = useCallback(
    (resourceId: string) => resourceRefById.get(resourceId) ?? null,
    [resourceRefById],
  );

  const getCapabilities = useCallback(
    (item: WeekplannerItem) => getSchedulerManipulationCapabilities(item, permissionContext),
    [permissionContext],
  );

  const clearTransient = useCallback(() => {
    setPointerSession(null);
    setPreviewDraft(null);
    setHoverResourceId(null);
  }, []);

  const cancelManipulation = useCallback(() => {
    clearTransient();
    setConfirmationDraft(null);
    setConfirmError(null);
  }, [clearTransient]);

  const buildDraft = useCallback(
    (
      session: ActivePointerSession,
      proposedStart: Date,
      proposedEnd: Date,
      proposedResourceId?: string,
    ): SchedulerDraftChange => {
      const resourceChanged =
        proposedResourceId && proposedResourceId !== session.originalResourceId;
      const timeChanged =
        proposedStart.getTime() !== session.originalStart.getTime() ||
        proposedEnd.getTime() !== session.originalEnd.getTime();
      const manipulationType =
        resourceChanged && timeChanged ? "combined" : session.mode === "resize" ? "resize" : "move";
      return {
        itemId: session.item.id,
        segmentId: session.segmentId,
        originalStart: session.originalStart,
        originalEnd: session.originalEnd,
        proposedStart,
        proposedEnd,
        originalResourceId: session.originalResourceId,
        proposedResourceId: proposedResourceId ?? session.originalResourceId,
        manipulationType,
        item: session.item,
      };
    },
    [],
  );

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const session = pointerSessionRef.current;
      if (!session) return;

      if (session.surface === "kalender") {
        const deltaY = clientY - session.startClientY;
        const deltaMinutes = snapPixelDeltaToMinutes(deltaY, CALENDAR_PIXELS_PER_MINUTE);
        const originalStartMin = zonedMinutesFromMidnight(session.originalStart, timezone);
        const proposedStartMin = snapMinutesFromMidnight(originalStartMin + deltaMinutes);
        const { startAt, endAt } = preserveDurationOnMove(
          session.originalStart,
          session.originalEnd,
          proposedStartMin,
          timezone,
          session.originalStart,
        );
        if (session.mode === "resize") {
          const originalEndMin = zonedMinutesFromMidnight(session.originalEnd, timezone);
          const resizeDelta = snapPixelDeltaToMinutes(deltaY, CALENDAR_PIXELS_PER_MINUTE);
          const proposedEndMin = snapMinutesFromMidnight(originalEndMin + resizeDelta);
          const resized = resizeEndPreservingStart(
            session.originalStart,
            proposedEndMin,
            timezone,
            session.originalStart,
          );
          if (!resized) return;
          setPreviewDraft(buildDraft(session, resized.startAt, resized.endAt));
          return;
        }
        if (!session.capabilities.canMoveTime) return;
        setPreviewDraft(buildDraft(session, startAt, endAt));
        return;
      }

      const deltaX = clientX - session.startClientX;
      const deltaY = clientY - session.startClientY;
      let proposedStart = session.originalStart;
      let proposedEnd = session.originalEnd;
      if (session.capabilities.canMoveTime) {
        const deltaMinutes = snapPixelDeltaToMinutes(deltaX, RESOURCE_PIXELS_PER_MINUTE);
        const originalStartMin = zonedMinutesFromMidnight(session.originalStart, timezone);
        const proposedStartMin = snapMinutesFromMidnight(originalStartMin + deltaMinutes);
        const shifted = preserveDurationOnMove(
          session.originalStart,
          session.originalEnd,
          proposedStartMin,
          timezone,
          session.originalStart,
        );
        proposedStart = shifted.startAt;
        proposedEnd = shifted.endAt;
      }

      let proposedResourceId = session.originalResourceId;
      const targetEl = document.elementFromPoint(clientX, clientY);
      const rowEl = targetEl?.closest("[data-planning-resource-id]") as HTMLElement | null;
      const targetResourceId = rowEl?.dataset.planningResourceId ?? null;
      setHoverResourceId(targetResourceId);

      const canChangeResource =
        urlState.resourceCategory === "pitch"
          ? session.capabilities.canChangePrimaryResource
          : session.capabilities.canChangeDressingRoom;

      if (
        targetResourceId &&
        canChangeResource &&
        targetResourceId !== session.originalResourceId &&
        resourceRefById.has(targetResourceId)
      ) {
        proposedResourceId = targetResourceId;
      }

      setPreviewDraft(
        buildDraft(session, proposedStart, proposedEnd, proposedResourceId),
      );
    },
    [buildDraft, resourceRefById, timezone, urlState.resourceCategory],
  );

  const endPointer = useCallback(() => {
    const session = pointerSessionRef.current;
    const draft = previewDraftRef.current;
    clearTransient();
    if (!session || !draft || isNoOpDraft(draft)) return;
    setConfirmationDraft(draft);
    setConfirmError(null);
  }, [clearTransient]);

  useEffect(() => {
    if (!pointerSession) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    };
    const onUp = () => endPointer();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelManipulation();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [pointerSession, updateFromPointer, endPointer, cancelManipulation]);

  const beginSession = useCallback(
    (session: ActivePointerSession) => {
      if (!enabled) return;
      if (!hasAnyManipulationCapability(session.capabilities)) return;
      setConfirmationDraft(null);
      setConfirmError(null);
      setPointerSession(session);
      setPreviewDraft(
        buildDraft(session, session.originalStart, session.originalEnd, session.originalResourceId),
      );
    },
    [enabled, buildDraft],
  );

  const beginCalendarMove = useCallback(
    (item: WeekplannerItem, clientY: number) => {
      const caps = getCapabilities(item);
      if (!caps.canMoveTime) return;
      beginSession({
        mode: "move",
        surface: "kalender",
        item,
        startClientX: 0,
        startClientY: clientY,
        originalStart: item.startAt,
        originalEnd: item.endAt,
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities],
  );

  const beginCalendarResize = useCallback(
    (item: WeekplannerItem, clientY: number) => {
      const caps = getCapabilities(item);
      if (!caps.canResize) return;
      beginSession({
        mode: "resize",
        surface: "kalender",
        item,
        startClientX: 0,
        startClientY: clientY,
        originalStart: item.startAt,
        originalEnd: item.endAt,
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities],
  );

  const beginResourceMove = useCallback(
    (
      item: WeekplannerItem,
      segmentId: string,
      resourceId: string,
      clientX: number,
      clientY: number,
    ) => {
      const caps = getCapabilities(item);
      if (!caps.canMoveTime && !caps.canChangePrimaryResource && !caps.canChangeDressingRoom) return;
      beginSession({
        mode: "move",
        surface: "ressourcen",
        item,
        segmentId,
        originalResourceId: resourceId,
        startClientX: clientX,
        startClientY: clientY,
        originalStart: item.startAt,
        originalEnd: item.endAt,
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities],
  );

  const conflictPreview = useMemo(() => {
    const draft = confirmationDraft ?? previewDraft;
    if (!draft) return null;
    const targetRef =
      draft.proposedResourceId ? resolveResourceRef(draft.proposedResourceId) : null;
    return evaluateManipulationConflicts(allItems, draft, targetRef, urlState.resourceCategory);
  }, [confirmationDraft, previewDraft, allItems, resolveResourceRef, urlState.resourceCategory]);

  const handleConfirm = useCallback(async () => {
    if (!confirmationDraft) return;
    setConfirmSaving(true);
    setConfirmError(null);
    try {
      if (isStandardplan) {
        await applyStandardPlanSchedulerDraft(
          confirmationDraft,
          urlState.resourceCategory,
          facilityGroupsByAllocationGroup,
          timezone,
        );
      } else if (alternativePlanId) {
        await applyAlternativePlanSchedulerDraft(
          confirmationDraft,
          alternativePlanId,
          urlState.resourceCategory,
          overridesByKey,
          timezone,
        );
      }
      router.refresh();
      setConfirmationDraft(null);
      setPreviewDraft(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setConfirmSaving(false);
    }
  }, [
    confirmationDraft,
    isStandardplan,
    urlState.resourceCategory,
    facilityGroupsByAllocationGroup,
    timezone,
    alternativePlanId,
    overridesByKey,
    router,
  ]);

  const value: PlanningHubManipulationContextValue = {
    enabled,
    isDragging: pointerSession !== null,
    permissionContext,
    previewDraft,
    hoverResourceId,
    getCapabilities,
    beginCalendarMove,
    beginCalendarResize,
    beginResourceMove,
    cancelManipulation,
    resolveResourceRef,
  };

  return (
    <PlanningHubManipulationContext.Provider value={value}>
      {children}
      {confirmationDraft && conflictPreview && (
        <PlanningHubManipulationConfirm
          draft={confirmationDraft}
          locale={locale}
          timezone={timezone}
          resourceCategory={urlState.resourceCategory}
          conflictPreview={conflictPreview}
          saving={confirmSaving}
          error={confirmError}
          resolveResourceRef={resolveResourceRef}
          onCancel={cancelManipulation}
          onConfirm={handleConfirm}
        />
      )}
    </PlanningHubManipulationContext.Provider>
  );
}

export function effectiveItemTimes(
  item: WeekplannerItem,
  draft: SchedulerDraftChange | null,
): { startAt: Date; endAt: Date } {
  if (!draft || draft.itemId !== item.id) {
    return { startAt: item.startAt, endAt: item.endAt };
  }
  return { startAt: draft.proposedStart, endAt: draft.proposedEnd };
}

export function isItemGhosted(
  item: WeekplannerItem,
  draft: SchedulerDraftChange | null,
  isDragging: boolean,
): boolean {
  return isDragging && !!draft && draft.itemId === item.id;
}

export function projectedItemForRender(
  item: WeekplannerItem,
  draft: SchedulerDraftChange | null,
  resourceCategory: PlanningHubUrlState["resourceCategory"],
  resolveResourceRef: (id: string) => WeekplannerResourceRef | null,
): WeekplannerItem {
  if (!draft || draft.itemId !== item.id) return item;
  const targetRef = draft.proposedResourceId ? resolveResourceRef(draft.proposedResourceId) : null;
  return projectItemWithDraft(item, draft, targetRef, resourceCategory);
}

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
import { applyPlanningHubActivityRescheduleDraft } from "@/lib/planning-hub/activity-rescheduling-mutations";
import { isActivityTimeDraft } from "@/lib/planning-hub/planning-activity-rescheduling";
import {
  canMutateActivityTimeForItem,
  canMutateResourceReservationForItem,
  formatManipulationHttpError,
} from "@/lib/planning-hub/manipulation-server-authorization";
import { resolveActivityScheduleAuthority } from "@/lib/planning-hub/planning-activity-rescheduling";
import { segmentIdForResource } from "@/lib/planning-hub/conflict-resolution";
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
  calendarDayDeltaFromPixelDrag,
  calendarMoveWithDayAndTimeDelta,
  resolveCalendarTargetDayKey,
} from "@/lib/planning-hub/scheduler/calendar-date-shift";
import {
  preserveDurationOnMove,
  resizeEndPreservingStart,
  resizeStartPreservingEnd,
  snapMinutesFromMidnight,
  snapPixelDeltaToMinutes,
} from "@/lib/planning-hub/scheduler/time-snap";
import { zonedMinutesFromMidnight } from "@/lib/planning-hub/scheduler/time-zone";
import {
  CALENDAR_PIXELS_PER_MINUTE,
  RESOURCE_PIXELS_PER_MINUTE,
} from "@/lib/planning-hub/scheduler/time-scale";
import type { SchedulerDraftChange, SchedulerTimeTarget } from "@/lib/planning-hub/scheduler-draft";
import { isNoOpDraft } from "@/lib/planning-hub/scheduler-draft";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";
import { draftGeometryKey } from "@/lib/planning-hub/scheduler/draft-geometry-key";
import {
  isValidResourceOccupancySpan,
} from "@/lib/planning-hub/scheduler/resource-occupancy-manipulation";
import {
  resolveProposedResourceDropTarget,
  schedulerTimeTargetForCategory,
} from "@/lib/planning-hub/planning-resource-manipulation";
import { buildPlanningResourceGroupsFromFacilityGroups } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import { manipulationSurfaceForPerspective } from "@/lib/planning-hub/planner-perspective";
import type { ManipulationConflictPreview } from "@/lib/planning-hub/manipulation-projection";
import type { WeekplannerItem, WeekplannerResourceRef, WeekplannerWeek } from "@/lib/weekplanner/types";
import PlanningHubManipulationConfirm from "./PlanningHubManipulationConfirm";
import PlanningHubManipulationEditDialog from "./PlanningHubManipulationEditDialog";
import PlanningHubActivityScheduleEditDialog from "./PlanningHubActivityScheduleEditDialog";
import { useDesktopMinWidth768 } from "@/lib/planning-hub/use-desktop-min-width";
import type { PlanningHubManipulationSurface } from "@/lib/planning-hub/planner-perspective";

export type ManipulationSurface = PlanningHubManipulationSurface;

type ResizeEdge = "start" | "end";

type ActivePointerSession = {
  mode: "move" | "resize";
  resizeEdge?: ResizeEdge;
  surface: ManipulationSurface;
  item: WeekplannerItem;
  segmentId?: string;
  originalResourceId?: string;
  startClientX: number;
  startClientY: number;
  originalStart: Date;
  originalEnd: Date;
  timeTarget: SchedulerTimeTarget;
  capabilities: SchedulerManipulationCapabilities;
};

type CalendarDragLayout = {
  dayColumnWidthPx: number;
  weekDayKeys: readonly string[];
};

const RESOURCE_AUTO_SCROLL_EDGE_PX = 56;
const RESOURCE_AUTO_SCROLL_SPEED_PX = 10;

function dressingResourceRef(
  item: WeekplannerItem,
  resourceId: string,
): WeekplannerResourceRef | null {
  const refs = [...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  return refs.find((r) => r.facilityResourceId === resourceId) ?? null;
}

function pitchResourceRef(item: WeekplannerItem, resourceId: string): WeekplannerResourceRef | null {
  return item.pitchAllocations.find((r) => r.facilityResourceId === resourceId) ?? null;
}

function resourceManipulationBounds(
  item: WeekplannerItem,
  resourceId: string | undefined,
  category: PlanningHubUrlState["resourceCategory"],
  surface: ManipulationSurface,
): { startAt: Date; endAt: Date; timeTarget: SchedulerTimeTarget } {
  const timeTarget = schedulerTimeTargetForCategory(category, surface);
  if (timeTarget === "resourceOccupancy" && resourceId) {
    const ref =
      category === "dressing"
        ? dressingResourceRef(item, resourceId)
        : pitchResourceRef(item, resourceId);
    if (ref) {
      const window = resourceSegmentDisplayWindow(item.startAt, item.endAt, ref);
      return { ...window, timeTarget: "resourceOccupancy" };
    }
  }
  return { startAt: item.startAt, endAt: item.endAt, timeTarget: "activity" };
}

type PlanningHubManipulationContextValue = {
  enabled: boolean;
  isDragging: boolean;
  permissionContext: ManipulationPermissionContext;
  previewDraft: SchedulerDraftChange | null;
  dragConflictPreview: ManipulationConflictPreview | null;
  hoverResourceId: string | null;
  getCapabilities: (item: WeekplannerItem) => SchedulerManipulationCapabilities;
  beginCalendarMove: (item: WeekplannerItem, clientX: number, clientY: number) => void;
  beginCalendarResize: (item: WeekplannerItem, edge: ResizeEdge, clientX: number, clientY: number) => void;
  beginResourceMove: (
    item: WeekplannerItem,
    segmentId: string,
    resourceId: string,
    clientX: number,
    clientY: number,
  ) => void;
  beginResourceResize: (
    item: WeekplannerItem,
    segmentId: string,
    resourceId: string,
    edge: ResizeEdge,
    clientX: number,
    clientY: number,
  ) => void;
  setCalendarDragLayout: (layout: CalendarDragLayout) => void;
  cancelManipulation: () => void;
  resolveResourceRef: (resourceId: string) => WeekplannerResourceRef | null;
  openManipulationEditor: (item: WeekplannerItem, segmentId: string, resourceId: string) => void;
  openActivityScheduleEditor: (item: WeekplannerItem) => void;
  /** SCE-PLANNER-UX-08-05 — perspective-independent resource editor entry. */
  openResourceEditorForConflict: (
    item: WeekplannerItem,
    resourceId: string,
    category: PlanningHubUrlState["resourceCategory"],
  ) => void;
  openActivityScheduleEditorForConflict: (item: WeekplannerItem) => void;
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
  canManageAllocations: boolean;
  facilityGroupsByAllocationGroup?: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  overridesByKey?: Record<string, WeekplannerOverrideRow[]>;
  resourceRows?: { resourceId: string; ref: WeekplannerResourceRef }[];
  onManipulationApplied?: (draft: SchedulerDraftChange) => void;
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
  canManageAllocations,
  facilityGroupsByAllocationGroup,
  overridesByKey = {},
  resourceRows = [],
  onManipulationApplied,
  children,
}: ProviderProps) {
  const router = useRouter();
  const [pointerSession, setPointerSession] = useState<ActivePointerSession | null>(null);
  const [previewDraft, setPreviewDraft] = useState<SchedulerDraftChange | null>(null);
  const [confirmationDraft, setConfirmationDraft] = useState<SchedulerDraftChange | null>(null);
  const [hoverResourceId, setHoverResourceId] = useState<string | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [dragConflictPreview, setDragConflictPreview] = useState<ManipulationConflictPreview | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<{
    item: WeekplannerItem;
    segmentId: string;
    resourceId: string;
  } | null>(null);
  const [scheduleEditItem, setScheduleEditItem] = useState<WeekplannerItem | null>(null);
  const [manipulationCategoryOverride, setManipulationCategoryOverride] = useState<
    PlanningHubUrlState["resourceCategory"] | null
  >(null);
  const effectiveResourceCategory = manipulationCategoryOverride ?? urlState.resourceCategory;
  const lastPreviewKeyRef = useRef<string>("");
  const pointerSessionRef = useRef(pointerSession);
  pointerSessionRef.current = pointerSession;
  const previewDraftRef = useRef(previewDraft);
  previewDraftRef.current = previewDraft;
  const calendarDragLayoutRef = useRef<CalendarDragLayout>({
    dayColumnWidthPx: 120,
    weekDayKeys: [],
  });

  const calendarPixelsPerMinute = CALENDAR_PIXELS_PER_MINUTE;

  const desktopMinWidth = useDesktopMinWidth768();
  const enabled =
    desktopMinWidth &&
    (canManageTrainings || canManageEvents || canManageAllocations) &&
    (isStandardplan || !!alternativePlanId);

  const manipulationSurface = manipulationSurfaceForPerspective(urlState.perspective);

  const permissionContext: ManipulationPermissionContext = useMemo(
    () => ({
      isStandardplan,
      canManageTrainings,
      canManageEvents,
      canManageAllocations,
      alternativePlanId,
      resourceCategory: urlState.resourceCategory,
      manipulationSurface,
    }),
    [
      isStandardplan,
      canManageTrainings,
      canManageEvents,
      canManageAllocations,
      alternativePlanId,
      urlState.resourceCategory,
      manipulationSurface,
    ],
  );

  const allItems = useMemo(() => week.days.flatMap((d) => d.items), [week.days]);

  const resourceRefById = useMemo(() => {
    const map = new Map<string, WeekplannerResourceRef>();
    const register = (ref: WeekplannerResourceRef) => {
      map.set(ref.facilityResourceId, ref);
    };
    for (const row of resourceRows) register(row.ref);
    for (const item of allItems) {
      for (const ref of item.pitchAllocations) register(ref);
      for (const ref of item.dressingRoomAllocations) register(ref);
      for (const ref of item.canonicalPitchAllocations) register(ref);
      for (const ref of item.canonicalDressingRoomAllocations) register(ref);
      if (item.type === "MATCH") {
        for (const ref of item.awayDressingRoomAllocations) register(ref);
      }
      if (item.type === "TOURNAMENT") {
        for (const participant of item.participantAllocations) {
          for (const ref of participant.dressingRoomAllocations) register(ref);
          for (const ref of participant.canonicalDressingRoomAllocations) register(ref);
        }
      }
    }
    if (facilityGroupsByAllocationGroup) {
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
    }
    return map;
  }, [resourceRows, facilityGroupsByAllocationGroup, allItems]);

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
    setDragConflictPreview(null);
    setHoverResourceId(null);
    lastPreviewKeyRef.current = "";
  }, []);

  const commitPreviewDraft = useCallback(
    (draft: SchedulerDraftChange) => {
      const key = draftGeometryKey(draft);
      if (key === lastPreviewKeyRef.current) return;
      lastPreviewKeyRef.current = key;
      setPreviewDraft(draft);
      const targetRef = draft.proposedResourceId ? resolveResourceRef(draft.proposedResourceId) : null;
      setDragConflictPreview(
        evaluateManipulationConflicts(allItems, draft, targetRef, urlState.resourceCategory),
      );
    },
    [allItems, resolveResourceRef, urlState.resourceCategory],
  );

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
        timeTarget: session.timeTarget,
        item: session.item,
      };
    },
    [],
  );

  const scrollResourceTimeline = useCallback((clientX: number) => {
    const scrollEl = document.querySelector("[data-planning-hub-resource-scroll]");
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    if (clientX < rect.left + RESOURCE_AUTO_SCROLL_EDGE_PX) {
      scrollEl.scrollLeft -= RESOURCE_AUTO_SCROLL_SPEED_PX;
    } else if (clientX > rect.right - RESOURCE_AUTO_SCROLL_EDGE_PX) {
      scrollEl.scrollLeft += RESOURCE_AUTO_SCROLL_SPEED_PX;
    }
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const session = pointerSessionRef.current;
      if (!session) return;

      if (session.surface === "kalender") {
        const deltaY = clientY - session.startClientY;
        const deltaX = clientX - session.startClientX;
        const deltaMinutes = snapPixelDeltaToMinutes(deltaY, calendarPixelsPerMinute);
        const layout = calendarDragLayoutRef.current;
        const dayDelta = calendarDayDeltaFromPixelDrag(deltaX, layout.dayColumnWidthPx);
        const referenceDay = session.originalStart;

        if (session.mode === "resize") {
          if (session.resizeEdge === "start") {
            const originalStartMin = zonedMinutesFromMidnight(session.originalStart, timezone);
            const proposedStartMin = snapMinutesFromMidnight(originalStartMin + deltaMinutes);
            const resized = resizeStartPreservingEnd(
              session.originalEnd,
              proposedStartMin,
              timezone,
              referenceDay,
            );
            if (!resized) return;
            commitPreviewDraft(buildDraft(session, resized.startAt, resized.endAt));
            return;
          }
          const originalEndMin = zonedMinutesFromMidnight(session.originalEnd, timezone);
          const resizeDelta = snapPixelDeltaToMinutes(deltaY, calendarPixelsPerMinute);
          const proposedEndMin = snapMinutesFromMidnight(originalEndMin + resizeDelta);
          const resized = resizeEndPreservingStart(
            session.originalStart,
            proposedEndMin,
            timezone,
            referenceDay,
          );
          if (!resized) return;
          commitPreviewDraft(buildDraft(session, resized.startAt, resized.endAt));
          return;
        }

        if (!session.capabilities.canMoveTime) return;
        const moved =
          layout.weekDayKeys.length > 0
            ? calendarMoveWithDayAndTimeDelta(
                session.originalStart,
                session.originalEnd,
                dayDelta,
                deltaMinutes,
                layout.weekDayKeys,
                timezone,
              )
            : preserveDurationOnMove(
                session.originalStart,
                session.originalEnd,
                snapMinutesFromMidnight(
                  zonedMinutesFromMidnight(session.originalStart, timezone) + deltaMinutes,
                ),
                timezone,
                referenceDay,
              );
        if (!moved) return;
        commitPreviewDraft(buildDraft(session, moved.startAt, moved.endAt));
        return;
      }

      scrollResourceTimeline(clientX);

      const deltaX = clientX - session.startClientX;
      const occupancySession = session.timeTarget === "resourceOccupancy";
      let proposedStart = session.originalStart;
      let proposedEnd = session.originalEnd;
      if (session.mode === "resize") {
        const canResizeStart = occupancySession
          ? session.capabilities.canChangeResourceOccupancyStart
          : session.capabilities.canResize;
        const canResizeEnd = occupancySession
          ? session.capabilities.canChangeResourceOccupancyEnd
          : session.capabilities.canResize;
        if (!canResizeStart && !canResizeEnd) return;

        const resizeDelta = snapPixelDeltaToMinutes(deltaX, RESOURCE_PIXELS_PER_MINUTE);
        const referenceDay = session.originalStart;
        if (session.resizeEdge === "start" && canResizeStart) {
          const originalStartMin = zonedMinutesFromMidnight(session.originalStart, timezone);
          const proposedStartMin = snapMinutesFromMidnight(originalStartMin + resizeDelta);
          const resized = resizeStartPreservingEnd(
            session.originalEnd,
            proposedStartMin,
            timezone,
            referenceDay,
          );
          if (!resized) return;
          proposedStart = resized.startAt;
          proposedEnd = resized.endAt;
        } else if (session.resizeEdge === "end" && canResizeEnd) {
          const originalEndMin = zonedMinutesFromMidnight(session.originalEnd, timezone);
          const proposedEndMin = snapMinutesFromMidnight(originalEndMin + resizeDelta);
          const resized = resizeEndPreservingStart(
            session.originalStart,
            proposedEndMin,
            timezone,
            referenceDay,
          );
          if (!resized) return;
          proposedStart = resized.startAt;
          proposedEnd = resized.endAt;
        }
      } else if (
        occupancySession
          ? session.capabilities.canMoveResourceOccupancy
          : session.capabilities.canMoveTime
      ) {
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

      if (occupancySession && !isValidResourceOccupancySpan(proposedStart, proposedEnd)) {
        return;
      }

      let proposedResourceId = session.originalResourceId;
      const targetEl =
        typeof document.elementFromPoint === "function"
          ? document.elementFromPoint(clientX, clientY)
          : null;
      const rowEl = targetEl?.closest("[data-planning-resource-id]") as HTMLElement | null;
      const targetResourceId = rowEl?.dataset.planningResourceId ?? null;
      setHoverResourceId(targetResourceId);

      const canChangeResource =
        urlState.resourceCategory === "pitch"
          ? session.capabilities.canChangePrimaryResource
          : session.capabilities.canChangeDressingRoom;

      proposedResourceId = resolveProposedResourceDropTarget({
        targetResourceId,
        originalResourceId: session.originalResourceId,
        canChangeResource,
        knownResourceIds: resourceRefById,
      });

      commitPreviewDraft(buildDraft(session, proposedStart, proposedEnd, proposedResourceId));
    },
    [
      buildDraft,
      calendarPixelsPerMinute,
      commitPreviewDraft,
      resourceRefById,
      scrollResourceTimeline,
      timezone,
      urlState.resourceCategory,
    ],
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
      lastPreviewKeyRef.current = "";
      setPointerSession(session);
      commitPreviewDraft(
        buildDraft(session, session.originalStart, session.originalEnd, session.originalResourceId),
      );
    },
    [enabled, buildDraft, commitPreviewDraft],
  );

  const setCalendarDragLayout = useCallback((layout: CalendarDragLayout) => {
    calendarDragLayoutRef.current = layout;
  }, []);

  const beginCalendarMove = useCallback(
    (item: WeekplannerItem, clientX: number, clientY: number) => {
      const caps = getCapabilities(item);
      if (!caps.canMoveTime) return;
      beginSession({
        mode: "move",
        surface: "kalender",
        item,
        startClientX: clientX,
        startClientY: clientY,
        originalStart: item.startAt,
        originalEnd: item.endAt,
        timeTarget: "activity",
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities],
  );

  const beginCalendarResize = useCallback(
    (item: WeekplannerItem, edge: ResizeEdge, clientX: number, clientY: number) => {
      const caps = getCapabilities(item);
      if (!caps.canResize) return;
      beginSession({
        mode: "resize",
        resizeEdge: edge,
        surface: "kalender",
        item,
        startClientX: clientX,
        startClientY: clientY,
        originalStart: item.startAt,
        originalEnd: item.endAt,
        timeTarget: "activity",
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
      if (
        !caps.canMoveTime &&
        !caps.canMoveResourceOccupancy &&
        !caps.canChangePrimaryResource &&
        !caps.canChangeDressingRoom
      ) {
        return;
      }
      const bounds = resourceManipulationBounds(
        item,
        resourceId,
        urlState.resourceCategory,
        "resourceTimeline",
      );
      beginSession({
        mode: "move",
        surface: "resourceTimeline",
        item,
        segmentId,
        originalResourceId: resourceId,
        startClientX: clientX,
        startClientY: clientY,
        originalStart: bounds.startAt,
        originalEnd: bounds.endAt,
        timeTarget: bounds.timeTarget,
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities, urlState.resourceCategory],
  );

  const beginResourceResize = useCallback(
    (
      item: WeekplannerItem,
      segmentId: string,
      resourceId: string,
      edge: ResizeEdge,
      clientX: number,
      clientY: number,
    ) => {
      const caps = getCapabilities(item);
      const occupancyResize =
        caps.canChangeResourceOccupancyStart || caps.canChangeResourceOccupancyEnd;
      if (!caps.canResize && !occupancyResize) return;
      const bounds = resourceManipulationBounds(
        item,
        resourceId,
        urlState.resourceCategory,
        "resourceTimeline",
      );
      beginSession({
        mode: "resize",
        resizeEdge: edge,
        surface: "resourceTimeline",
        item,
        segmentId,
        originalResourceId: resourceId,
        startClientX: clientX,
        startClientY: clientY,
        originalStart: bounds.startAt,
        originalEnd: bounds.endAt,
        timeTarget: bounds.timeTarget,
        capabilities: caps,
      });
    },
    [beginSession, getCapabilities, urlState.resourceCategory],
  );

  const conflictPreview = useMemo(() => {
    const draft = confirmationDraft;
    if (!draft) return null;
    const targetRef =
      draft.proposedResourceId ? resolveResourceRef(draft.proposedResourceId) : null;
    return evaluateManipulationConflicts(
      allItems,
      draft,
      targetRef,
      effectiveResourceCategory,
    );
  }, [confirmationDraft, allItems, resolveResourceRef, effectiveResourceCategory]);

  const planningResourceGroups = useMemo(() => {
    if (!facilityGroupsByAllocationGroup) return [];
    const facilityGroups =
      effectiveResourceCategory === "pitch"
        ? facilityGroupsByAllocationGroup.PITCH_HALL
        : facilityGroupsByAllocationGroup.DRESSING_ROOM;
    return buildPlanningResourceGroupsFromFacilityGroups(
      facilityGroups,
      effectiveResourceCategory,
    );
  }, [facilityGroupsByAllocationGroup, effectiveResourceCategory]);

  const resourceOptionsForCategory = useMemo(() => {
    const options: WeekplannerResourceRef[] = [];
    if (facilityGroupsByAllocationGroup) {
      const groups =
        effectiveResourceCategory === "pitch"
          ? facilityGroupsByAllocationGroup.PITCH_HALL
          : facilityGroupsByAllocationGroup.DRESSING_ROOM;
      for (const group of groups) {
        for (const r of group.resources) {
          options.push({
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
    }
    return options;
  }, [facilityGroupsByAllocationGroup, effectiveResourceCategory]);

  const openManipulationEditor = useCallback(
    (item: WeekplannerItem, segmentId: string, resourceId: string) => {
      if (!enabled) return;
      const caps = getCapabilities(item);
      if (!hasAnyManipulationCapability(caps)) return;
      setManipulationCategoryOverride(null);
      setEditTarget({ item, segmentId, resourceId });
      setScheduleEditItem(null);
      setConfirmationDraft(null);
      setConfirmError(null);
    },
    [enabled, getCapabilities],
  );

  const openActivityScheduleEditor = useCallback(
    (item: WeekplannerItem) => {
      if (!enabled) return;
      const caps = getCapabilities(item);
      if (!caps.canMoveTime && !caps.canResize) return;
      setManipulationCategoryOverride(null);
      setScheduleEditItem(item);
      setEditTarget(null);
      setConfirmationDraft(null);
      setConfirmError(null);
    },
    [enabled, getCapabilities],
  );

  const openResourceEditorForConflict = useCallback(
    (item: WeekplannerItem, resourceId: string, category: PlanningHubUrlState["resourceCategory"]) => {
      if (!enabled) return;
      const actor = {
        canManageTrainings: permissionContext.canManageTrainings,
        canManageEvents: permissionContext.canManageEvents,
        canManageAllocations: permissionContext.canManageAllocations,
      };
      if (!canMutateResourceReservationForItem(item, actor)) return;
      setManipulationCategoryOverride(category);
      setEditTarget({
        item,
        segmentId: segmentIdForResource(item.id, resourceId),
        resourceId,
      });
      setScheduleEditItem(null);
      setConfirmationDraft(null);
      setConfirmError(null);
    },
    [enabled, permissionContext],
  );

  const openActivityScheduleEditorForConflict = useCallback(
    (item: WeekplannerItem) => {
      if (!enabled) return;
      const actor = {
        canManageTrainings: permissionContext.canManageTrainings,
        canManageEvents: permissionContext.canManageEvents,
        canManageAllocations: permissionContext.canManageAllocations,
      };
      const authority = resolveActivityScheduleAuthority(item, {
        isStandardplan: permissionContext.isStandardplan,
        alternativePlanId: permissionContext.alternativePlanId,
      });
      if (!canMutateActivityTimeForItem(item, actor) || !authority.permitted) return;
      setManipulationCategoryOverride(null);
      setScheduleEditItem(item);
      setEditTarget(null);
      setConfirmationDraft(null);
      setConfirmError(null);
    },
    [enabled, permissionContext],
  );

  const submitEditorDraft = useCallback(
    async (draft: SchedulerDraftChange) => {
      setConfirmationDraft(draft);
      setEditTarget(null);
      setConfirmError(null);
    },
    [],
  );

  const recoverFromRejectedMutation = useCallback(
    (status: number) => {
      setConfirmationDraft(null);
      setPreviewDraft(null);
      lastPreviewKeyRef.current = "";
      if (status === 403) {
        router.refresh();
      }
    },
    [router],
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmationDraft) return;
    setConfirmSaving(true);
    setConfirmError(null);
    try {
      const groups = facilityGroupsByAllocationGroup ?? {
        PITCH_HALL: [],
        DRESSING_ROOM: [],
      };

      const draftPayload = {
        draft: {
          ...confirmationDraft,
          originalStart: confirmationDraft.originalStart.toISOString(),
          originalEnd: confirmationDraft.originalEnd.toISOString(),
          proposedStart: confirmationDraft.proposedStart.toISOString(),
          proposedEnd: confirmationDraft.proposedEnd.toISOString(),
        },
        allItems,
        resourceCategory: effectiveResourceCategory,
        targetResource: confirmationDraft.proposedResourceId
          ? resolveResourceRef(confirmationDraft.proposedResourceId)
          : null,
      };

      if (isActivityTimeDraft(confirmationDraft)) {
        const validateRes = await fetch("/api/planning-hub/activity-rescheduling/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draftPayload,
            isStandardplan,
            alternativePlanId,
          }),
        });
        if (!validateRes.ok) {
          const data = (await validateRes.json().catch(() => null)) as { error?: string } | null;
          recoverFromRejectedMutation(validateRes.status);
          throw new Error(formatManipulationHttpError(validateRes.status, data?.error));
        }
      } else {
        const validateRes = await fetch("/api/planning-hub/resource-manipulation/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftPayload),
        });
        if (!validateRes.ok) {
          const data = (await validateRes.json().catch(() => null)) as { error?: string } | null;
          recoverFromRejectedMutation(validateRes.status);
          throw new Error(formatManipulationHttpError(validateRes.status, data?.error));
        }
      }

      if (isActivityTimeDraft(confirmationDraft)) {
        await applyPlanningHubActivityRescheduleDraft(confirmationDraft, {
          isStandardplan,
          alternativePlanId,
          resourceCategory: urlState.resourceCategory,
          facilityGroups: groups,
          overridesByKey,
          timeZone: timezone,
        });
      } else if (isStandardplan) {
        const { applyStandardPlanSchedulerDraft } = await import(
          "@/lib/planning-hub/canonical-planning-mutations"
        );
        await applyStandardPlanSchedulerDraft(
          confirmationDraft,
          effectiveResourceCategory,
          groups,
          timezone,
        );
      } else if (alternativePlanId) {
        const { applyAlternativePlanSchedulerDraft } = await import(
          "@/lib/planning-hub/operational-planning-mutations"
        );
        await applyAlternativePlanSchedulerDraft(
          confirmationDraft,
          alternativePlanId,
          effectiveResourceCategory,
          overridesByKey,
          timezone,
        );
      }
      onManipulationApplied?.(confirmationDraft);
      router.refresh();
      setConfirmationDraft(null);
      setPreviewDraft(null);
      setManipulationCategoryOverride(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      if (/keine berechtigung/i.test(message)) {
        recoverFromRejectedMutation(403);
      }
      setConfirmError(message);
    } finally {
      setConfirmSaving(false);
    }
  }, [
    confirmationDraft,
    isStandardplan,
    effectiveResourceCategory,
    urlState.resourceCategory,
    facilityGroupsByAllocationGroup,
    timezone,
    alternativePlanId,
    overridesByKey,
    allItems,
    resolveResourceRef,
    recoverFromRejectedMutation,
    onManipulationApplied,
  ]);

  const value: PlanningHubManipulationContextValue = {
    enabled,
    isDragging: pointerSession !== null,
    permissionContext,
    previewDraft,
    dragConflictPreview,
    hoverResourceId,
    getCapabilities,
    beginCalendarMove,
    beginCalendarResize,
    beginResourceMove,
    beginResourceResize,
    setCalendarDragLayout,
    cancelManipulation,
    resolveResourceRef,
    openManipulationEditor,
    openActivityScheduleEditor,
    openResourceEditorForConflict,
    openActivityScheduleEditorForConflict,
  };

  return (
    <PlanningHubManipulationContext.Provider value={value}>
      {children}
      {scheduleEditItem && (
        <PlanningHubActivityScheduleEditDialog
          item={scheduleEditItem}
          locale={locale}
          timezone={timezone}
          resourceCategory={urlState.resourceCategory}
          planningResourceGroups={planningResourceGroups}
          onClose={() => setScheduleEditItem(null)}
          onSubmitDraft={submitEditorDraft}
          evaluateConflicts={(draft) =>
            evaluateManipulationConflicts(allItems, draft, null, urlState.resourceCategory)
          }
          resolveResourceRef={resolveResourceRef}
        />
      )}
      {editTarget && (
        <PlanningHubManipulationEditDialog
          item={editTarget.item}
          segmentId={editTarget.segmentId}
          resourceId={editTarget.resourceId}
          locale={locale}
          timezone={timezone}
          resourceCategory={effectiveResourceCategory}
          resourceOptions={resourceOptionsForCategory}
          planningResourceGroups={planningResourceGroups}
          onClose={() => {
            setEditTarget(null);
            setManipulationCategoryOverride(null);
          }}
          onSubmitDraft={submitEditorDraft}
          evaluateConflicts={(draft, targetRef) =>
            evaluateManipulationConflicts(allItems, draft, targetRef, effectiveResourceCategory)
          }
        />
      )}
      {confirmationDraft && conflictPreview && (
        <PlanningHubManipulationConfirm
          draft={confirmationDraft}
          locale={locale}
          timezone={timezone}
          resourceCategory={effectiveResourceCategory}
          conflictPreview={conflictPreview}
          saving={confirmSaving}
          error={confirmError}
          resolveResourceRef={resolveResourceRef}
          planningResourceGroups={planningResourceGroups}
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
  if (!draft || draft.itemId !== item.id || draft.timeTarget === "resourceOccupancy") {
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

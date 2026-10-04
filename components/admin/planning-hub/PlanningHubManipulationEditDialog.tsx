"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { ManipulationConflictPreview } from "@/lib/planning-hub/manipulation-projection";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import { isoToLocalTime, combineTimeWithReferenceDay } from "@/lib/planning-hub/planner-time";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";
import type { PlanningResourceGroup } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import { SCE_DIALOG_VARIANT_FORM } from "@/lib/shell/responsive-layout";
import { cn } from "@/lib/cn";
import {
  buildManipulationResourceAvailabilityList,
  sortManipulationResourceAvailabilityForPicker,
  type ManipulationResourceKind,
} from "@/lib/planning-hub/manipulation-resource-availability";
import PlanningHubManipulationConfirm from "./PlanningHubManipulationConfirm";
import PlanningHubManipulationModalShell from "./PlanningHubManipulationModalShell";
import PlanningHubManipulationResourceAvailabilityBoard from "./PlanningHubManipulationResourceAvailabilityBoard";
import PlanningHubManipulationResourceAvailabilityPicker from "./PlanningHubManipulationResourceAvailabilityPicker";

type Props = {
  item: WeekplannerItem;
  segmentId: string;
  resourceId: string;
  locale: string;
  timezone: string;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  resourceOptions: WeekplannerResourceRef[];
  planningResourceGroups?: readonly PlanningResourceGroup[];
  facilityGroups: FacilityGroup[];
  allItems: readonly WeekplannerItem[];
  onClose: () => void;
  onSubmitDraft: (draft: SchedulerDraftChange) => void;
  evaluateConflicts: (
    draft: SchedulerDraftChange,
    targetRef: WeekplannerResourceRef | null,
  ) => ManipulationConflictPreview;
};

export default function PlanningHubManipulationEditDialog({
  item,
  segmentId,
  resourceId,
  locale,
  timezone,
  resourceCategory,
  resourceOptions,
  planningResourceGroups,
  facilityGroups,
  allItems,
  onClose,
  onSubmitDraft,
  evaluateConflicts,
}: Props) {
  const formId = useId();
  const firstFieldRef = useRef<HTMLElement | null>(null);
  const ref =
    resourceCategory === "pitch"
      ? item.pitchAllocations.find((r) => r.facilityResourceId === resourceId)
      : [...item.dressingRoomAllocations].find((r) => r.facilityResourceId === resourceId);
  const window = ref
    ? resourceSegmentDisplayWindow(item.startAt, item.endAt, ref)
    : { startAt: item.startAt, endAt: item.endAt };

  const [targetResourceId, setTargetResourceId] = useState(resourceId);
  const [startTime, setStartTime] = useState(isoToLocalTime(window.startAt, timezone));
  const [endTime, setEndTime] = useState(isoToLocalTime(window.endAt, timezone));
  const [confirmDraft, setConfirmDraft] = useState<SchedulerDraftChange | null>(null);
  const [conflictPreview, setConflictPreview] = useState<ManipulationConflictPreview | null>(null);

  const draft = useMemo((): SchedulerDraftChange | null => {
    if (!ref) return null;
    const proposedStartIso = combineTimeWithReferenceDay(startTime, window.startAt, timezone);
    const proposedEndIso = combineTimeWithReferenceDay(endTime, window.endAt, timezone);
    if (!proposedStartIso || !proposedEndIso) return null;
    const proposedStart = new Date(proposedStartIso);
    const proposedEnd = new Date(proposedEndIso);
    const resourceChanged = targetResourceId !== resourceId;
    const timeChanged =
      proposedStart.getTime() !== window.startAt.getTime() ||
      proposedEnd.getTime() !== window.endAt.getTime();
    return {
      itemId: item.id,
      segmentId,
      originalStart: window.startAt,
      originalEnd: window.endAt,
      proposedStart,
      proposedEnd,
      originalResourceId: resourceId,
      proposedResourceId: targetResourceId,
      manipulationType: resourceChanged && timeChanged ? "combined" : timeChanged ? "move" : "move",
      timeTarget: "resourceOccupancy",
      item,
    };
  }, [
    ref,
    startTime,
    endTime,
    targetResourceId,
    resourceId,
    item,
    segmentId,
    window.startAt,
    window.endAt,
    timezone,
  ]);

  const targetRef = resourceOptions.find((r) => r.facilityResourceId === targetResourceId) ?? null;

  const reservationWindow = useMemo(() => {
    const proposedStartIso = combineTimeWithReferenceDay(startTime, window.startAt, timezone);
    const proposedEndIso = combineTimeWithReferenceDay(endTime, window.endAt, timezone);
    if (!proposedStartIso || !proposedEndIso) {
      return { startAt: window.startAt, endAt: window.endAt };
    }
    return { startAt: new Date(proposedStartIso), endAt: new Date(proposedEndIso) };
  }, [startTime, endTime, window.startAt, window.endAt, timezone]);

  const resourceKind: ManipulationResourceKind =
    resourceCategory === "pitch" ? "PITCH_HALL" : "DRESSING_ROOM";

  const availabilityEntries = useMemo(() => {
    const list = buildManipulationResourceAvailabilityList({
      allItems,
      editingItem: item,
      currentResourceId: resourceId,
      resourceOptions,
      reservationStartAt: reservationWindow.startAt,
      reservationEndAt: reservationWindow.endAt,
      resourceKind,
    });
    return sortManipulationResourceAvailabilityForPicker(list);
  }, [
    allItems,
    item,
    resourceId,
    resourceOptions,
    reservationWindow.startAt,
    reservationWindow.endAt,
    resourceKind,
  ]);

  if (confirmDraft && conflictPreview) {
    return (
      <PlanningHubManipulationConfirm
        draft={confirmDraft}
        locale={locale}
        timezone={timezone}
        resourceCategory={resourceCategory}
        conflictPreview={conflictPreview}
        saving={false}
        error={null}
        resolveResourceRef={(id) => resourceOptions.find((r) => r.facilityResourceId === id) ?? null}
        planningResourceGroups={planningResourceGroups}
        onCancel={() => {
          setConfirmDraft(null);
          setConflictPreview(null);
        }}
        onConfirm={() => {
          onSubmitDraft(confirmDraft);
          onClose();
        }}
      />
    );
  }

  return (
    <PlanningHubManipulationModalShell
      testId="planning-hub-manipulation-edit"
      onClose={onClose}
      initialFocusRef={firstFieldRef}
      panelClassName={cn(SCE_DIALOG_VARIANT_FORM, "max-w-[min(42rem,var(--sce-dialog-form-max-width))]")}
    >
      <form
        aria-labelledby={`${formId}-title`}
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft) return;
          const preview = evaluateConflicts(draft, targetRef);
          setConflictPreview(preview);
          setConfirmDraft(draft);
        }}
      >
        <p id={`${formId}-title`} className="text-sm font-semibold text-[var(--foreground)]">
          Planung ändern
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          Zielressource und Reservierungszeit (Sportzeit bleibt unverändert).
        </p>

        <div className="mt-3">
          <PlanningHubManipulationResourceAvailabilityPicker
            item={item}
            allItems={allItems}
            resourceKind={resourceKind}
            resourceOptions={resourceOptions}
            facilityGroups={facilityGroups}
            planningResourceGroups={planningResourceGroups}
            currentResourceId={resourceId}
            selectedResourceId={targetResourceId}
            onSelectResourceId={setTargetResourceId}
            reservationStartAt={reservationWindow.startAt}
            reservationEndAt={reservationWindow.endAt}
            timezone={timezone}
            initialFocusRef={firstFieldRef}
            availabilityEntries={availabilityEntries}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-start`}>
            Reserviert ab
          </label>
          <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-end`}>
            Reserviert bis
          </label>
          <input
            id={`${formId}-start`}
            type="time"
            className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <input
            id={`${formId}-end`}
            type="time"
            className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>

        <PlanningHubManipulationResourceAvailabilityBoard
          item={item}
          resourceKind={resourceKind}
          availabilityEntries={availabilityEntries}
          facilityGroups={facilityGroups}
          planningResourceGroups={planningResourceGroups}
          selectedResourceId={targetResourceId}
          onSelectResourceId={setTargetResourceId}
          reservationStartAt={reservationWindow.startAt}
          reservationEndAt={reservationWindow.endAt}
          timezone={timezone}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-semibold text-white"
            data-testid="planning-hub-manipulation-edit-continue"
          >
            Weiter
          </button>
        </div>
      </form>
    </PlanningHubManipulationModalShell>
  );
}

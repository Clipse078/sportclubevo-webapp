"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { ManipulationConflictPreview } from "@/lib/planning-hub/manipulation-projection";
import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import { isoToLocalTime, combineTimeWithReferenceDay } from "@/lib/planning-hub/planner-time";
import { resourceSegmentDisplayWindow } from "@/lib/planning-hub/scheduler/resource-segment-display";
import PlanningHubManipulationConfirm from "./PlanningHubManipulationConfirm";

type Props = {
  item: WeekplannerItem;
  segmentId: string;
  resourceId: string;
  locale: string;
  timezone: string;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  resourceOptions: WeekplannerResourceRef[];
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
  onClose,
  onSubmitDraft,
  evaluateConflicts,
}: Props) {
  const formId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);
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

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-4 sm:items-center"
      role="dialog"
      aria-labelledby={`${formId}-title`}
      data-testid="planning-hub-manipulation-edit"
    >
      <form
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg"
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

        <label className="mt-3 block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-resource`}>
          Ressource
        </label>
        <select
          id={`${formId}-resource`}
          ref={firstFieldRef}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
          value={targetResourceId}
          onChange={(event) => setTargetResourceId(event.target.value)}
        >
          {resourceOptions.map((option) => (
            <option key={option.facilityResourceId} value={option.facilityResourceId}>
              {option.name}
            </option>
          ))}
        </select>

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
    </div>
  );
}

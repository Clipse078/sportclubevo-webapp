"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { ManipulationConflictPreview } from "@/lib/planning-hub/manipulation-projection";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { isoToLocalDate, isoToLocalTime } from "@/lib/planning-hub/planner-time";
import { zonedTimeToUtc } from "@/lib/training/recurrence";
import PlanningHubManipulationConfirm from "./PlanningHubManipulationConfirm";
import PlanningHubManipulationModalShell from "./PlanningHubManipulationModalShell";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import type { PlanningResourceGroup } from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  resourceCategory: PlanningHubUrlState["resourceCategory"];
  planningResourceGroups?: readonly PlanningResourceGroup[];
  onClose: () => void;
  onSubmitDraft: (draft: SchedulerDraftChange) => void;
  onApplyDraft: (draft: SchedulerDraftChange) => Promise<void>;
  applySaving: boolean;
  applyError: string | null;
  evaluateConflicts: (draft: SchedulerDraftChange) => ManipulationConflictPreview;
  resolveResourceRef: (id: string) => WeekplannerResourceRef | null;
};

export default function PlanningHubActivityScheduleEditDialog({
  item,
  locale,
  timezone,
  resourceCategory,
  planningResourceGroups,
  onClose,
  onSubmitDraft,
  onApplyDraft,
  applySaving,
  applyError,
  evaluateConflicts,
  resolveResourceRef,
}: Props) {
  const formId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(isoToLocalDate(item.startAt, timezone));
  const [startTime, setStartTime] = useState(isoToLocalTime(item.startAt, timezone));
  const [endTime, setEndTime] = useState(isoToLocalTime(item.endAt, timezone));
  const [confirmDraft, setConfirmDraft] = useState<SchedulerDraftChange | null>(null);
  const [conflictPreview, setConflictPreview] = useState<ManipulationConflictPreview | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const draft = useMemo((): SchedulerDraftChange | null => {
    const proposedStart = zonedTimeToUtc(date, startTime, timezone);
    const proposedEnd = zonedTimeToUtc(date, endTime, timezone);
    if (proposedEnd.getTime() <= proposedStart.getTime()) return null;
    return {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart,
      proposedEnd,
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
  }, [date, startTime, endTime, item, timezone]);

  if (confirmDraft && conflictPreview) {
    return (
      <PlanningHubManipulationConfirm
        draft={confirmDraft}
        locale={locale}
        timezone={timezone}
        resourceCategory={resourceCategory}
        conflictPreview={conflictPreview}
        saving={applySaving}
        error={applyError}
        resolveResourceRef={resolveResourceRef}
        planningResourceGroups={planningResourceGroups}
        onCancel={() => {
          setConfirmDraft(null);
          setConflictPreview(null);
        }}
        onConfirm={async () => {
          try {
            await onApplyDraft(confirmDraft);
            onClose();
          } catch {
            // Parent surfaces applyError on the confirm layer.
          }
        }}
      />
    );
  }

  return (
    <PlanningHubManipulationModalShell
      testId="planning-hub-activity-schedule-edit"
      onClose={onClose}
      initialFocusRef={firstFieldRef}
    >
      <form
        aria-labelledby={`${formId}-title`}
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft) return;
          const preview = evaluateConflicts(draft);
          setConflictPreview(preview);
          setConfirmDraft(draft);
        }}
      >
        <p id={`${formId}-title`} className="text-sm font-semibold text-[var(--foreground)]">
          Termin ändern
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          Sporttermin (Trainingszeit / Spielzeit / Turnierzeit) — Reservierungen folgen mit Puffer.
        </p>

        <label className="mt-3 block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-date`}>
          Datum
        </label>
        <input
          id={`${formId}-date`}
          ref={firstFieldRef}
          type="date"
          className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-start`}>
            Beginn
          </label>
          <label className="block text-xs font-semibold text-[var(--muted)]" htmlFor={`${formId}-end`}>
            Ende
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
            className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={!draft}
            data-testid="planning-hub-activity-schedule-edit-continue"
          >
            Weiter
          </button>
        </div>
      </form>
    </PlanningHubManipulationModalShell>
  );
}

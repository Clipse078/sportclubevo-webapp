"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import {
  groupScheduleDestinationPhases,
  hasScheduleDestinationPhases,
  type UmsetzungsplanungPhaseOption,
} from "@/lib/club-development/sprints/umsetzungsplanung-workspace";

type Props = {
  taskId: string;
  taskTitle: string;
  phaseOptions: UmsetzungsplanungPhaseOption[];
  sourcePhaseId?: string | null;
  canSchedule: boolean;
  canReturnToUnplanned?: boolean;
  pending?: boolean;
  onMoveToPhase: (taskId: string, phaseId: string) => void | Promise<void>;
  onReturnToUnplanned?: (taskId: string) => void | Promise<void>;
  testId?: string;
};

export default function UmsetzungsplanungTaskScheduleMenu({
  taskId,
  taskTitle,
  phaseOptions,
  sourcePhaseId = null,
  canSchedule,
  canReturnToUnplanned = false,
  pending = false,
  onMoveToPhase,
  onReturnToUnplanned,
  testId,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped = groupScheduleDestinationPhases(phaseOptions, sourcePhaseId);
  const hasDestinations = hasScheduleDestinationPhases(phaseOptions, sourcePhaseId);
  const showMenu = canSchedule && (hasDestinations || canReturnToUnplanned);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, pickerOpen]);

  const closeAll = () => {
    setMenuOpen(false);
    setPickerOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  if (!showMenu) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center text-[var(--muted)]" aria-hidden>
        <MoreVertical className="h-4 w-4" />
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative flex justify-end" data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)] disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={menuOpen || pickerOpen}
        aria-controls={menuOpen || pickerOpen ? menuId : undefined}
        disabled={pending}
        data-testid={testId ? `${testId}-trigger` : undefined}
        onClick={() => {
          setPickerOpen(false);
          setMenuOpen((open) => !open);
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MoreVertical className="h-4 w-4" aria-hidden />}
        <span className="sr-only">Aktionen für {taskTitle}</span>
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[14rem] rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 text-left shadow-lg"
          data-testid={testId ? `${testId}-menu` : undefined}
        >
          {hasDestinations ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              onClick={() => {
                setMenuOpen(false);
                setPickerOpen(true);
              }}
              data-testid={testId ? `${testId}-move-to-phase` : undefined}
            >
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToPhaseMenuAction}
            </button>
          ) : (
            <p className="px-3 py-2 text-xs text-[var(--muted)]" role="presentation">
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskScheduleDestinationEmpty}
            </p>
          )}
          {canReturnToUnplanned && onReturnToUnplanned ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              onClick={() => {
                closeAll();
                void onReturnToUnplanned(taskId);
              }}
              data-testid={testId ? `${testId}-return-unplanned` : undefined}
            >
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToUnplannedMenuAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {pickerOpen ? (
        <div
          id={menuId}
          role="dialog"
          aria-label={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToPhaseMenuAction}
          className="absolute right-0 z-30 mt-1 max-h-[min(18rem,70vh)] min-w-[14rem] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 text-left shadow-lg"
          data-testid={testId ? `${testId}-picker` : undefined}
        >
          {grouped.ongoing.length > 0 ? (
            <ScheduleDestinationGroup
              heading={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.scheduleDestinationOngoingGroup}
              phases={grouped.ongoing}
              taskId={taskId}
              onPick={(phaseId) => {
                closeAll();
                void onMoveToPhase(taskId, phaseId);
              }}
              testIdPrefix={testId ? `${testId}-ongoing` : undefined}
            />
          ) : null}
          {grouped.planned.length > 0 ? (
            <ScheduleDestinationGroup
              heading={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.scheduleDestinationPlannedGroup}
              phases={grouped.planned}
              taskId={taskId}
              onPick={(phaseId) => {
                closeAll();
                void onMoveToPhase(taskId, phaseId);
              }}
              testIdPrefix={testId ? `${testId}-planned` : undefined}
            />
          ) : null}
          {!hasDestinations ? (
            <p className="px-3 py-2 text-xs text-[var(--muted)]">
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskScheduleDestinationEmpty}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScheduleDestinationGroup({
  heading,
  phases,
  taskId,
  onPick,
  testIdPrefix,
}: {
  heading: string;
  phases: UmsetzungsplanungPhaseOption[];
  taskId: string;
  onPick: (phaseId: string) => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {heading}
      </p>
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          onClick={() => onPick(phase.id)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${taskId}-${phase.id}` : undefined}
        >
          {phase.title}
        </button>
      ))}
    </div>
  );
}
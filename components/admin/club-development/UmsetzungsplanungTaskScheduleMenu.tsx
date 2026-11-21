"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const grouped = groupScheduleDestinationPhases(phaseOptions, sourcePhaseId);
  const hasDestinations = hasScheduleDestinationPhases(phaseOptions, sourcePhaseId);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        const panel = document.getElementById(menuId);
        if (panel?.contains(event.target as Node)) return;
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, menuId]);

  const positionPanel = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = 260;
    setPanelPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8)),
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setPanelPos(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const pickPhase = (phaseId: string) => {
    setActionError(null);
    closeMenu();
    void (async () => {
      try {
        await onMoveToPhase(taskId, phaseId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Verschieben fehlgeschlagen.");
      }
    })();
  };

  const returnUnplanned = () => {
    setActionError(null);
    closeMenu();
    void (async () => {
      try {
        await onReturnToUnplanned?.(taskId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Verschieben fehlgeschlagen.");
      }
    })();
  };

  if (!canSchedule) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center text-[var(--muted)]" aria-hidden>
        <MoreVertical className="h-4 w-4" />
      </span>
    );
  }

  const floatingMenu =
    menuOpen && panelPos && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            aria-label={`Aktionen für ${taskTitle}`}
            className="fixed z-[200] max-h-[min(24rem,70vh)] min-w-[14rem] max-w-[min(20rem,90vw)] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 text-left shadow-lg"
            style={{ top: panelPos.top, left: panelPos.left }}
            data-testid={testId ? `${testId}-menu` : undefined}
          >
            <p
              className="px-3 pb-1 pt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]"
              role="presentation"
              data-testid={testId ? `${testId}-move-heading` : undefined}
            >
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToPhaseMenuHeading}
            </p>

            {hasDestinations ? (
              <>
                {grouped.ongoing.length > 0 ? (
                  <ScheduleDestinationGroup
                    heading={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.scheduleDestinationOngoingGroup}
                    phases={grouped.ongoing}
                    taskId={taskId}
                    onPick={pickPhase}
                    testIdPrefix={testId ? `${testId}-ongoing` : undefined}
                  />
                ) : null}
                {grouped.planned.length > 0 ? (
                  <ScheduleDestinationGroup
                    heading={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.scheduleDestinationPlannedGroup}
                    phases={grouped.planned}
                    taskId={taskId}
                    onPick={pickPhase}
                    testIdPrefix={testId ? `${testId}-planned` : undefined}
                  />
                ) : null}
              </>
            ) : (
              <p className="px-3 py-2 text-xs text-[var(--muted)]" role="presentation" data-testid={testId ? `${testId}-empty` : undefined}>
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskScheduleDestinationEmpty}
              </p>
            )}

            {canReturnToUnplanned && onReturnToUnplanned ? (
              <>
                <div className="mx-2 my-1 border-t border-[var(--border)]/60" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
                  onClick={returnUnplanned}
                  data-testid={testId ? `${testId}-return-unplanned` : undefined}
                >
                  {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToUnplannedMenuAction}
                </button>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative flex flex-col items-end justify-center" data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)] disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        disabled={pending}
        data-testid={testId ? `${testId}-trigger` : undefined}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (menuOpen) {
            closeMenu();
            return;
          }
          positionPanel();
          setMenuOpen(true);
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MoreVertical className="h-4 w-4" aria-hidden />}
        <span className="sr-only">Aktionen für {taskTitle}</span>
      </button>
      {actionError ? (
        <p className="sr-only" role="alert" data-testid={testId ? `${testId}-error` : undefined}>
          {actionError}
        </p>
      ) : null}
      {floatingMenu}
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
    <div role="group" aria-label={heading} className="py-0.5">
      <p className="px-3 pb-0.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]" role="presentation">
        {heading}
      </p>
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          role="menuitem"
          className="block w-full py-2 pl-5 pr-3 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
          onClick={() => onPick(phase.id)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${taskId}-${phase.id}` : undefined}
        >
          {phase.title}
        </button>
      ))}
    </div>
  );
}
"use client";

import { Loader2, MoreVertical } from "lucide-react";
import { useId, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import {
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_ACTION_ITEM_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_DIVIDER_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_EMPTY_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_GROUP_HEADING_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_SECTION_HEADING_CLASS,
  UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_THEME_SCOPE_CLASS,
} from "@/lib/club-development/umsetzungsplanung-task-schedule-menu-styles";
import {
  groupScheduleDestinationPhases,
  hasScheduleDestinationPhases,
  type UmsetzungsplanungPhaseOption,
} from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";
import { resolveSceModalOverlayThemeAttribute } from "@/lib/ui/sce-modal-overlay-theme";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const grouped = groupScheduleDestinationPhases(phaseOptions, sourcePhaseId);
  const hasDestinations = hasScheduleDestinationPhases(phaseOptions, sourcePhaseId);
  const portalledTheme =
    resolveSceModalOverlayThemeAttribute() ?? SCE_DS2_WHITE_EDITION.themeValue;

  const closeMenu = () => setMenuOpen(false);

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

  return (
    <div className="relative flex flex-col items-end justify-center" data-testid={testId}>
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
          setMenuOpen((open) => !open);
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
      <PopoverContent
        id={menuId}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        constrainHeight={false}
        clipOverflow
        role="dialog"
        surfaceVariant="sce-light"
        className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS}
      >
        <div
          data-sce-theme={portalledTheme}
          className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_THEME_SCOPE_CLASS}
          role="menu"
          aria-label={`Aktionen für ${taskTitle}`}
          data-testid={testId ? `${testId}-menu` : undefined}
        >
          <p
            className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_SECTION_HEADING_CLASS}
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
            <p
              className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_EMPTY_CLASS}
              role="presentation"
              data-testid={testId ? `${testId}-empty` : undefined}
            >
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskScheduleDestinationEmpty}
            </p>
          )}

          {canReturnToUnplanned && onReturnToUnplanned ? (
            <>
              <div className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_DIVIDER_CLASS} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_ACTION_ITEM_CLASS}
                onClick={returnUnplanned}
                data-testid={testId ? `${testId}-return-unplanned` : undefined}
              >
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveToUnplannedMenuAction}
              </button>
            </>
          ) : null}
        </div>
      </PopoverContent>
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
      <p className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_GROUP_HEADING_CLASS} role="presentation">
        {heading}
      </p>
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          role="menuitem"
          className={UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS}
          onClick={() => onPick(phase.id)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${taskId}-${phase.id}` : undefined}
        >
          {phase.title}
        </button>
      ))}
    </div>
  );
}
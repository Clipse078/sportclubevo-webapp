"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, DoorOpen, MoreHorizontal, ShieldAlert } from "lucide-react";
import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { deriveConflictResolutionCapabilities } from "@/lib/planning-hub/conflict-resolution";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { usePlanningHubManipulation } from "./PlanningHubManipulationContext";

type PlanningHubListeRowMenuProps = {
  item: WeekplannerItem;
  permissionContext: Pick<
    ManipulationPermissionContext,
    | "canManageTrainings"
    | "canManageEvents"
    | "canManageAllocations"
    | "isStandardplan"
    | "alternativePlanId"
  >;
  canEditItem: boolean;
  onOpenItem: () => void;
  onEditPlanning: () => void;
  onReviewConflict: () => void;
};

function MenuButton({
  label,
  icon,
  onClick,
  testId,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors",
        "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
      )}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export default function PlanningHubListeRowMenu({
  item,
  permissionContext,
  canEditItem,
  onOpenItem,
  onEditPlanning,
  onReviewConflict,
}: PlanningHubListeRowMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const manipulation = usePlanningHubManipulation();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const caps = deriveConflictResolutionCapabilities(item, permissionContext, {
    canEditActivity: canEditItem,
  });
  const hasConflict = item.conflicts.length > 0;
  const pitchId = item.pitchAllocations[0]?.facilityResourceId;
  const dressingId = item.dressingRoomAllocations[0]?.facilityResourceId;

  const showSchedule = caps.canMoveActivityTime && manipulation?.enabled;
  const showPitch =
    caps.canChangePrimaryResource && manipulation?.enabled && pitchId;
  const showDressing =
    caps.canChangeSupportingResource && manipulation?.enabled && dressingId;
  const showPlanningEdit = canEditItem && caps.canEditActivity;
  const showConflict = hasConflict;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aktionsmenü"
        data-testid={`planning-hub-liste-row-menu-${item.id}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--text-2)] transition-colors",
          "hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        role="dialog"
        className="w-[min(100vw-2rem,16rem)] p-1.5"
        aria-label="Planungsaktionen"
      >
        <MenuButton
          label="Öffnen"
          icon={<CalendarClock className="h-4 w-4" />}
          testId={`planning-hub-liste-action-open-${item.id}`}
          onClick={() => {
            setOpen(false);
            onOpenItem();
          }}
        />
        {showPlanningEdit ? (
          <MenuButton
            label="Planung ändern"
            icon={<CalendarClock className="h-4 w-4" />}
            testId={`planning-hub-liste-action-plan-${item.id}`}
            onClick={() => {
              setOpen(false);
              onEditPlanning();
            }}
          />
        ) : null}
        {showSchedule ? (
          <MenuButton
            label="Termin ändern"
            icon={<CalendarClock className="h-4 w-4" />}
            testId={`planning-hub-liste-action-schedule-${item.id}`}
            onClick={() => {
              setOpen(false);
              manipulation?.openActivityScheduleEditor(item);
            }}
          />
        ) : null}
        {showPitch ? (
          <MenuButton
            label="Spielfeld ändern"
            icon={<SoccerPitchLineIcon className="h-4 w-4" />}
            testId={`planning-hub-liste-action-pitch-${item.id}`}
            onClick={() => {
              setOpen(false);
              manipulation?.openResourceEditorForConflict(item, pitchId!, "pitch");
            }}
          />
        ) : null}
        {showDressing ? (
          <MenuButton
            label="Garderobe ändern"
            icon={<DoorOpen className="h-4 w-4" />}
            testId={`planning-hub-liste-action-dressing-${item.id}`}
            onClick={() => {
              setOpen(false);
              manipulation?.openResourceEditorForConflict(item, dressingId!, "dressing");
            }}
          />
        ) : null}
        {showConflict ? (
          <MenuButton
            label="Konflikt prüfen"
            icon={<ShieldAlert className="h-4 w-4" />}
            testId={`planning-hub-liste-action-conflict-${item.id}`}
            onClick={() => {
              setOpen(false);
              onReviewConflict();
            }}
          />
        ) : null}
      </PopoverContent>
    </>
  );
}

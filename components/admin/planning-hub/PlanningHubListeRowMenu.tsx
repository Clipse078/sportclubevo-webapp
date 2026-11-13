"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, DoorOpen, ExternalLink, MoreHorizontal, Pencil, ShieldAlert } from "lucide-react";
import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import {
  RESOURCE_SEMANTIC_DRESSING_ICON_CLASS,
  RESOURCE_SEMANTIC_PITCH_ICON_CLASS,
} from "@/components/admin/shared/planning/resource-card-selection-style";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import {
  derivePlanningHubListeMenuCapabilities,
  type PlanningHubListeMenuAction,
} from "@/lib/planning-hub/liste-operational-menu";
import type { ManipulationPermissionContext } from "@/lib/planning-hub/manipulation-capabilities";
import type { PlannerCanonicalEditAccess } from "@/lib/planning-hub/planner-canonical-edit-access";
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
  > & {
    canViewTrainings?: boolean;
    canViewEvents?: boolean;
  };
  canEditItem: boolean;
  plannerEditAccess: PlannerCanonicalEditAccess | null;
  alternativePlanActive: boolean;
  onMenuAction: (action: PlanningHubListeMenuAction) => void;
  onReviewConflict: () => void;
};

type MenuIconTone = "neutral" | "planning" | "schedule" | "pitch" | "dressing" | "conflict";

const MENU_ICON_TONE_CLASS: Record<MenuIconTone, string> = {
  neutral: "bg-[var(--surface-2)] text-[var(--text-2)]",
  planning: "bg-[var(--sce-primary-light)]/80 text-[var(--sce-primary)]",
  schedule: "bg-[var(--sce-info-light)]/80 text-[color-mix(in_srgb,var(--sce-info)_85%,var(--foreground))]",
  pitch: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  dressing: "bg-[var(--blue)]/10 text-[var(--blue)]",
  conflict: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
};

function MenuButton({
  label,
  icon,
  tone,
  onClick,
  testId,
}: {
  label: string;
  icon: React.ReactNode;
  tone: MenuIconTone;
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
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          MENU_ICON_TONE_CLASS[tone],
        )}
        aria-hidden
      >
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
  plannerEditAccess,
  alternativePlanActive,
  onMenuAction,
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

  const caps = derivePlanningHubListeMenuCapabilities({
    item,
    permissionContext,
    canEditItem,
    manipulationEnabled: manipulation?.enabled ?? false,
    plannerEditAccess,
    alternativePlanActive,
  });

  function openPitchAction() {
    if (caps.pitchUsesManipulation && caps.pitchResourceId) {
      manipulation?.openResourceEditorForConflict(item, caps.pitchResourceId, "pitch");
      onMenuAction("pitch");
      return;
    }
    onMenuAction("pitch");
  }

  function openDressingAction() {
    if (caps.dressingUsesManipulation && caps.dressingResourceId) {
      manipulation?.openResourceEditorForConflict(item, caps.dressingResourceId, "dressing");
      onMenuAction("dressing");
      return;
    }
    onMenuAction("dressing");
  }

  function openScheduleAction() {
    manipulation?.openActivityScheduleEditor(item);
    onMenuAction("schedule");
  }

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
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--text-2)] transition-colors",
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
        constrainHeight={false}
        clipOverflow={false}
        role="dialog"
        className="w-[min(100vw-2rem,16rem)] p-1.5"
        aria-label="Planungsaktionen"
      >
        {caps.showDetails ? (
          <MenuButton
            label="Details öffnen"
            tone="neutral"
            icon={<ExternalLink className="h-4 w-4" />}
            testId={`planning-hub-liste-action-details-${item.id}`}
            onClick={() => {
              setOpen(false);
              onMenuAction("details");
            }}
          />
        ) : null}
        {caps.showEdit ? (
          <MenuButton
            label={caps.editMenuLabel}
            tone="planning"
            icon={<Pencil className="h-4 w-4" />}
            testId={`planning-hub-liste-action-edit-${item.id}`}
            onClick={() => {
              setOpen(false);
              onMenuAction("edit");
            }}
          />
        ) : null}
        {caps.showEdit === false && caps.editBlockedReason ? (
          <p className="px-3 py-2 text-[11px] leading-snug text-[var(--text-2)]">{caps.editBlockedReason}</p>
        ) : null}
        {caps.showSchedule ? (
          <MenuButton
            label="Termin ändern"
            tone="schedule"
            icon={<Clock3 className="h-4 w-4" />}
            testId={`planning-hub-liste-action-schedule-${item.id}`}
            onClick={() => {
              setOpen(false);
              openScheduleAction();
            }}
          />
        ) : null}
        {caps.showPitch ? (
          <MenuButton
            label={caps.pitchLabel}
            tone="pitch"
            icon={<SoccerPitchLineIcon className={cn("h-4 w-4", RESOURCE_SEMANTIC_PITCH_ICON_CLASS)} />}
            testId={`planning-hub-liste-action-pitch-${item.id}`}
            onClick={() => {
              setOpen(false);
              openPitchAction();
            }}
          />
        ) : null}
        {caps.showDressing ? (
          <MenuButton
            label={caps.dressingLabel}
            tone="dressing"
            icon={<DoorOpen className={cn("h-4 w-4", RESOURCE_SEMANTIC_DRESSING_ICON_CLASS)} />}
            testId={`planning-hub-liste-action-dressing-${item.id}`}
            onClick={() => {
              setOpen(false);
              openDressingAction();
            }}
          />
        ) : null}
        {caps.showConflict ? (
          <MenuButton
            label="Konflikt prüfen"
            tone="conflict"
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

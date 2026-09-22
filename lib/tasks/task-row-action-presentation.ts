/**
 * AUFGABEN-06G7 — semantic task row action presentation (icon intent only; authorization unchanged).
 */

import type { LucideIcon } from "lucide-react";
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import type { TaskStatus } from "@prisma/client";

export type TaskRowActionIntent =
  | "complete"
  | "edit"
  | "reopen"
  | "cancel"
  | "delete"
  | "more";

export type TaskRowActionPresentation = {
  intent: TaskRowActionIntent;
  icon: LucideIcon;
  label: string;
  className: string;
  hoverClassName: string;
  focusRingClassName: string;
};

const BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] disabled:opacity-40 disabled:pointer-events-none";

export const TASK_ROW_ACTION_PRESENTATION: Record<TaskRowActionIntent, TaskRowActionPresentation> =
  {
    complete: {
      intent: "complete",
      icon: Check,
      label: "Als erledigt markieren",
      className: `${BASE} text-emerald-500`,
      hoverClassName: "hover:border-emerald-500/35 hover:bg-emerald-950/35",
      focusRingClassName: "focus-visible:ring-emerald-500/50",
    },
    edit: {
      intent: "edit",
      icon: Pencil,
      label: "Bearbeiten",
      className: `${BASE} text-[var(--orange)]`,
      hoverClassName: "hover:border-[var(--orange)]/35 hover:bg-[var(--orange-light)]",
      focusRingClassName: "focus-visible:ring-[var(--orange)]/45",
    },
    reopen: {
      intent: "reopen",
      icon: RotateCcw,
      label: "Wieder öffnen",
      className: `${BASE} text-sky-400`,
      hoverClassName: "hover:border-sky-500/35 hover:bg-sky-950/30",
      focusRingClassName: "focus-visible:ring-sky-500/45",
    },
    cancel: {
      intent: "cancel",
      icon: XCircle,
      label: "Abbrechen",
      className: `${BASE} text-amber-400`,
      hoverClassName: "hover:border-amber-500/35 hover:bg-amber-950/25",
      focusRingClassName: "focus-visible:ring-amber-500/45",
    },
    delete: {
      intent: "delete",
      icon: Trash2,
      label: "Löschen",
      className: `${BASE} text-red-400`,
      hoverClassName: "hover:border-red-500/35 hover:bg-red-950/30",
      focusRingClassName: "focus-visible:ring-red-500/45",
    },
    more: {
      intent: "more",
      icon: MoreHorizontal,
      label: "Weitere Aktionen",
      className: `${BASE} text-[var(--text-2)]`,
      hoverClassName: "hover:border-[var(--border)] hover:bg-[var(--surface-2)]",
      focusRingClassName: "focus-visible:ring-[var(--border-strong)]",
    },
  };

export function taskRowActionForStatusTransition(
  targetStatus: TaskStatus,
): TaskRowActionIntent | null {
  switch (targetStatus) {
    case "DONE":
      return "complete";
    case "OPEN":
    case "IN_PROGRESS":
      return "reopen";
    case "CANCELLED":
      return "cancel";
    default:
      return null;
  }
}

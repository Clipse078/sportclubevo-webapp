import type { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

/**
 * Vereinsentwicklung backlog task status visuals (Übersicht / Zielboard).
 * Uses the same SCE semantic tokens as `taskStatusBadgeClass`; PO mapping:
 * Offen → neutral, In Arbeit → blue, Wartet → amber, Erledigt → green, Abgebrochen → muted.
 */
export type VereinsentwicklungTaskStatusVisualKey = TaskStatus | "WAITING";

const BADGE_SURFACE: Record<VereinsentwicklungTaskStatusVisualKey, string> = {
  OPEN:
    "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_92%,transparent)] text-[var(--sce-color-status-neutral)]",
  IN_PROGRESS:
    "border-[var(--sce-info-border)] bg-[var(--sce-info-light)] text-[var(--sce-color-status-info)]",
  WAITING:
    "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-color-status-warning)]",
  DONE:
    "border-[var(--sce-success-border)] bg-[var(--sce-success-light)] text-[var(--sce-color-status-success)]",
  CANCELLED: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
};

export const VEREINSENTWICKLUNG_TASK_STATUS_BADGE_BASE_CLASS =
  "inline-flex w-fit max-w-full items-center rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold leading-tight whitespace-nowrap";

export function vereinsentwicklungTaskStatusVisualKey(
  status: TaskStatus | string,
): VereinsentwicklungTaskStatusVisualKey {
  if (status === "WAITING") return "WAITING";
  return status as TaskStatus;
}

export function vereinsentwicklungTaskStatusBadgeClass(
  status: TaskStatus | VereinsentwicklungTaskStatusVisualKey,
): string {
  const key = vereinsentwicklungTaskStatusVisualKey(status);
  return cn(VEREINSENTWICKLUNG_TASK_STATUS_BADGE_BASE_CLASS, BADGE_SURFACE[key] ?? BADGE_SURFACE.OPEN);
}
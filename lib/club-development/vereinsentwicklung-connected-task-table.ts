import type { TaskStatus } from "@prisma/client";
import type { SprintTaskAssigneeViewModel } from "./sprints/sprint-task-assignee";

/** Accessible column labels for connected Vereinsentwicklung task tables (exact copy, no qualifiers). */
export const VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS = {
  referenz: "Referenz",
  aufgabe: "Titel",
  ziel: "Ziel",
  strategie: "Strategie",
  orgEinheit: "Org-Einheit",
  status: "Status",
  verantwortlich: "Verantwortlich",
} as const;

export type VereinsentwicklungConnectedTaskTableRowModel = {
  taskId: string;
  publicReference: string | null;
  title: string;
  taskHref: string;
  targetId: string | null;
  targetTitle: string | null;
  targetHref: string | null;
  strategyId: string | null;
  strategyTitle: string | null;
  strategyHref: string | null;
  orgUnitLabel: string | null;
  status: TaskStatus;
  statusLabel: string;
  assignees: SprintTaskAssigneeViewModel[];
  /** Optional Teilaufgaben rollup — bar only when true and totalCount > 0. */
  progressHasChildRollup?: boolean;
  progressCompletedCount?: number | null;
  progressTotalCount?: number | null;
};

export function buildTargetDetailHref(targetId: string, returnTo?: string): string {
  const base = `/vereinsleitung/targets/${encodeURIComponent(targetId)}`;
  if (!returnTo?.trim()) return base;
  const q = new URLSearchParams({ returnTo });
  return `${base}?${q.toString()}`;
}

export function buildStrategyWorkspaceHref(strategyId: string): string {
  const q = new URLSearchParams({ ansicht: "strategie", strategyId });
  return `/vereinsleitung/strategie-und-ziele?${q.toString()}`;
}
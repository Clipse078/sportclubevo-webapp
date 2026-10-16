/**
 * SCE-ACTIVITY-CREATE-01J-R5.5 — normalized planner operational issues
 * (conflicts, incomplete allocations, match end-time gaps).
 * Single derived model for card summary, hover/focus detail, and opened activity.
 */

import { MATCH_END_TIME_ACTION_LABEL } from "@/lib/match/match-operational-completeness";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";
import {
  listOperationalMissingAllocationLabels,
  type ListOperationalRowStatus,
} from "@/lib/planning-hub/list-operational";
import { weekplannerConflictSummaryLine } from "@/lib/weekplanner/conflict-presenters";
import type { WeekplannerConflict, WeekplannerItem } from "@/lib/weekplanner/types";

export type PlannerOperationalStatus = {
  hasIssues: boolean;
  conflictCount: number;
  incompleteCount: number;
  openActionCount: number;
  conflicts: readonly WeekplannerConflict[];
  incompleteItems: readonly string[];
  openActionLabels: readonly string[];
};

function incompleteDetailMessage(label: string): string {
  switch (label) {
    case "Spielfeld":
      return "Kein Spielfeld zugewiesen";
    case "Garderobe":
      return "Keine Garderobe zugewiesen";
    case "Heimkabine":
      return "Keine Heimkabine zugewiesen";
    case "Gastkabine":
      return "Keine Gastkabine zugewiesen";
    default:
      return `Fehlende Angabe: ${label}`;
  }
}

export function plannerOperationalIncompleteDetailMessages(item: WeekplannerItem): string[] {
  return listOperationalMissingAllocationLabels(item).map(incompleteDetailMessage);
}

export function plannerOperationalConflictDetailMessages(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string[] {
  return item.conflicts.map((c) => plannerOperationalConflictDetailLine(c, locale, timeZone));
}

/** Operator-facing conflict line for hover/open surfaces (specific when data allows). */
export function plannerOperationalConflictDetailLine(
  conflict: WeekplannerConflict,
  locale: string,
  timeZone: string,
): string {
  const resource = conflict.facilityResourceName?.trim();
  const partner = conflict.partnerTitle?.trim();
  if (resource && partner) {
    return `${resource} ist zu diesem Zeitpunkt bereits belegt (${partner})`;
  }
  return weekplannerConflictSummaryLine(conflict, locale, timeZone);
}

export function derivePlannerOperationalStatus(item: WeekplannerItem): PlannerOperationalStatus {
  const conflicts = item.conflicts;
  const incompleteItems = listOperationalMissingAllocationLabels(item);
  const openActionLabels: string[] = [];
  if (weekplannerMatchRequiresEndTimeAction(item)) {
    openActionLabels.push(MATCH_END_TIME_ACTION_LABEL);
  }

  const conflictCount = conflicts.length;
  const incompleteCount = incompleteItems.length;
  const openActionCount = openActionLabels.length;
  const hasIssues = conflictCount > 0 || incompleteCount > 0 || openActionCount > 0;

  return {
    hasIssues,
    conflictCount,
    incompleteCount,
    openActionCount,
    conflicts,
    incompleteItems,
    openActionLabels,
  };
}

/** Compact card-visible summary (no hover required). Returns null when healthy. */
export function plannerOperationalIssueSummaryLabel(status: PlannerOperationalStatus): string | null {
  if (!status.hasIssues) return null;

  const parts: string[] = [];
  if (status.conflictCount > 0) {
    parts.push(status.conflictCount === 1 ? "1 Konflikt" : `${status.conflictCount} Konflikte`);
  }
  if (status.incompleteCount > 0) {
    parts.push("Unvollständig");
  }
  if (status.openActionCount > 0 && status.conflictCount === 0 && status.incompleteCount === 0) {
    parts.push(status.openActionLabels[0] ?? "Offen");
  } else if (status.openActionCount > 0) {
    parts.push("Offen");
  }

  return parts.length > 0 ? `⚠ ${parts.join(" · ")}` : null;
}

export function plannerOperationalStatusFromLegacyRowStatus(
  status: ListOperationalRowStatus,
): Pick<PlannerOperationalStatus, "hasIssues"> {
  return { hasIssues: status !== "ready" };
}

"use client";

import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import {
  buildPlanningConflictIncidents,
  countConflictsByKind,
  type PlanningConflictIncident,
} from "@/lib/planning-hub/conflict-attention";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";

type PlanningHubConflictAttentionProps = {
  week: WeekplannerWeek;
  incompleteCount?: number;
  onReviewConflicts?: (incidents: PlanningConflictIncident[]) => void;
};

export default function PlanningHubConflictAttention({
  week,
  incompleteCount = 0,
  onReviewConflicts,
}: PlanningHubConflictAttentionProps) {
  const incidents = buildPlanningConflictIncidents(week);
  const total = incidents.length;

  if (total === 0 && incompleteCount === 0) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-emerald-800"
        data-testid="planning-hub-conflict-none"
      >
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>Keine Planungskonflikte diese Woche</span>
      </div>
    );
  }

  const { pitch, dressing } = countConflictsByKind(incidents);
  const parts: string[] = [];
  if (pitch > 0) parts.push(`${pitch} Spielfeld`);
  if (dressing > 0) parts.push(`${dressing} Garderobe`);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      data-testid="planning-hub-conflict-attention"
    >
      {total > 0 && (
        <button
          type="button"
          onClick={() => onReviewConflicts?.(incidents)}
          className="inline-flex items-center gap-1.5 font-semibold text-amber-900 hover:underline"
        >
          <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
          {total} Konflikt{total === 1 ? "" : "e"}
          {parts.length > 0 && (
            <span className="font-normal text-amber-800">· {parts.join(" · ")}</span>
          )}
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold">
            Prüfen
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
      {incompleteCount > 0 && (
        <span className="text-amber-800" data-testid="weekplanner-incomplete-summary">
          · {incompleteCount} ungeplant
        </span>
      )}
    </div>
  );
}

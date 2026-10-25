/**
 * FIN-05D-R2 — presentation-only lane assignment for overview event timeline.
 */

import type { FinanceOverviewEventTimelineEntry } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";

export const FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES = 2;

/** Minimum normalized width reserved for direct labels (collision detection). */
export const FINANCE_OVERVIEW_EVENT_TIMELINE_MIN_LABEL_WIDTH_FRACTION = 0.1;

export type FinanceOverviewEventTimelineLabelSpan = {
  left: number;
  right: number;
};

export type FinanceOverviewEventTimelineLaneAssignment = {
  eventId: string;
  laneIndex: number;
  labelSpan: FinanceOverviewEventTimelineLabelSpan;
};

export type FinanceOverviewEventTimelineLaneLayout = {
  assignments: FinanceOverviewEventTimelineLaneAssignment[];
  /** Chronological ids hidden behind density affordance (lowest materiality first). */
  collapsedEventIds: string[];
  visibleEventIds: string[];
};

function labelSpanForEntry(
  entry: FinanceOverviewEventTimelineEntry,
): FinanceOverviewEventTimelineLabelSpan {
  const minW = FINANCE_OVERVIEW_EVENT_TIMELINE_MIN_LABEL_WIDTH_FRACTION;
  if (entry.visualKind === "EXACT_DATE") {
    const anchor = entry.xStartFraction;
    return {
      left: Math.max(0, anchor - minW * 0.1),
      right: Math.min(1, anchor + minW),
    };
  }
  const left = entry.xStartFraction;
  const naturalRight = entry.xEndFraction;
  const right = Math.min(1, Math.max(naturalRight, left + minW * 0.65));
  return { left, right };
}

function spansOverlap(
  a: FinanceOverviewEventTimelineLabelSpan,
  b: FinanceOverviewEventTimelineLabelSpan,
): boolean {
  return a.left < b.right && b.left < a.right;
}

/**
 * Deterministic collision-aware lanes (max {@link FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES}).
 * DOM / SR order remains caller's chronological list.
 */
export function assignFinanceOverviewEventTimelineLanes(input: {
  entries: FinanceOverviewEventTimelineEntry[];
  materialityByEventId: Record<string, number>;
}): FinanceOverviewEventTimelineLaneLayout {
  const sorted = [...input.entries].sort((a, b) => {
    const diff = a.sortKeyIso.localeCompare(b.sortKeyIso);
    if (diff !== 0) return diff;
    return a.eventId.localeCompare(b.eventId);
  });

  const laneOccupancy: FinanceOverviewEventTimelineLabelSpan[][] = Array.from(
    { length: FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES },
    () => [],
  );
  const assignments: FinanceOverviewEventTimelineLaneAssignment[] = [];
  const deferred: FinanceOverviewEventTimelineEntry[] = [];

  for (const entry of sorted) {
    const labelSpan = labelSpanForEntry(entry);
    let placed = false;
    for (let lane = 0; lane < FINANCE_OVERVIEW_EVENT_TIMELINE_MAX_LANES; lane++) {
      const conflict = laneOccupancy[lane]!.some((existing) => spansOverlap(existing, labelSpan));
      if (!conflict) {
        laneOccupancy[lane]!.push(labelSpan);
        assignments.push({ eventId: entry.eventId, laneIndex: lane, labelSpan });
        placed = true;
        break;
      }
    }
    if (!placed) {
      deferred.push(entry);
    }
  }

  const collapsedEventIds = deferred
    .sort((a, b) => {
      const matA = input.materialityByEventId[a.eventId] ?? 0;
      const matB = input.materialityByEventId[b.eventId] ?? 0;
      if (matA !== matB) return matA - matB;
      const diff = a.sortKeyIso.localeCompare(b.sortKeyIso);
      if (diff !== 0) return diff;
      return a.eventId.localeCompare(b.eventId);
    })
    .map((e) => e.eventId);

  const visibleEventIds = assignments.map((a) => a.eventId);

  return {
    assignments,
    collapsedEventIds,
    visibleEventIds,
  };
}

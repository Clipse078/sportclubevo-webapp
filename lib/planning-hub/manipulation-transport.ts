import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { WeekplannerConflict, WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

/** Thrown when JSON transport dates are missing or not valid ISO instants — mapped to HTTP 400. */
export class ManipulationTransportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManipulationTransportValidationError";
  }
}

/** Coerces ISO strings (RSC/JSON transport) or Date values into Date instances. */
export function coercePlanningInstant(value: unknown, fieldLabel: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ManipulationTransportValidationError(`${fieldLabel}: Ungültiges Datum.`);
    }
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new ManipulationTransportValidationError(`${fieldLabel}: Ungültiges Datum.`);
    }
    return parsed;
  }
  throw new ManipulationTransportValidationError(`${fieldLabel}: Ungültiges Datum.`);
}

function parseOptionalInstant(value: unknown, fieldLabel: string): Date | undefined {
  if (value == null) return undefined;
  return coercePlanningInstant(value, fieldLabel);
}

function reviveWeekplannerConflict(raw: WeekplannerConflict): WeekplannerConflict {
  return {
    ...raw,
    overlapStartAt: parseOptionalInstant(raw.overlapStartAt, "conflict.overlapStartAt"),
    overlapEndAt: parseOptionalInstant(raw.overlapEndAt, "conflict.overlapEndAt"),
    occupancyStartAt: parseOptionalInstant(raw.occupancyStartAt, "conflict.occupancyStartAt"),
    occupancyEndAt: parseOptionalInstant(raw.occupancyEndAt, "conflict.occupancyEndAt"),
  };
}

/**
 * Revives ISO date strings in a week read-model item after JSON transport.
 * Domain planning code expects `Date` semantics on item instants and conflict windows.
 */
export function reviveWeekplannerItemFromTransport(raw: WeekplannerItem): WeekplannerItem {
  return {
    ...raw,
    startAt: coercePlanningInstant(raw.startAt, "startAt"),
    endAt: coercePlanningInstant(raw.endAt, "endAt"),
    canonicalStartAt: coercePlanningInstant(raw.canonicalStartAt, "canonicalStartAt"),
    canonicalEndAt: coercePlanningInstant(raw.canonicalEndAt, "canonicalEndAt"),
    conflicts: (raw.conflicts ?? []).map(reviveWeekplannerConflict),
  };
}

export function reviveWeekplannerWeekFromTransport(raw: WeekplannerWeek): WeekplannerWeek {
  return {
    ...raw,
    days: raw.days.map((day) => ({
      ...day,
      items: reviveWeekplannerItemsFromTransport(day.items),
    })),
  };
}

export function reviveWeekplannerItemsFromTransport(
  items: readonly WeekplannerItem[],
): WeekplannerItem[] {
  return items.map(reviveWeekplannerItemFromTransport);
}

type SchedulerDraftTransport = Omit<
  SchedulerDraftChange,
  "originalStart" | "originalEnd" | "proposedStart" | "proposedEnd" | "item"
> & {
  originalStart: unknown;
  originalEnd: unknown;
  proposedStart: unknown;
  proposedEnd: unknown;
  item: WeekplannerItem;
};

export function parseSchedulerDraftFromTransport(raw: SchedulerDraftTransport): SchedulerDraftChange {
  return {
    ...raw,
    originalStart: coercePlanningInstant(raw.originalStart, "originalStart"),
    originalEnd: coercePlanningInstant(raw.originalEnd, "originalEnd"),
    proposedStart: coercePlanningInstant(raw.proposedStart, "proposedStart"),
    proposedEnd: coercePlanningInstant(raw.proposedEnd, "proposedEnd"),
    item: reviveWeekplannerItemFromTransport(raw.item),
  };
}

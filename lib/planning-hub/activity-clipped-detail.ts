/**
 * SCE-PLANNER-UX-08-07 — geometry + canonical content for clipped activity disclosure.
 * No per-card DOM measurement; uses layout inputs already known at render time.
 */

import {
  itemInspectionDressingLabel,
  itemInspectionPitchLabel,
} from "@/lib/planning-hub/aggregate-inspection";
import {
  weekplannerActivityTypeLabel,
  weekplannerPrimaryLabel,
  weekplannerTeamLine,
  weekplannerTimingDetail,
} from "@/lib/planning-hub/item-presenters";
import { MATCH_END_TIME_ACTION_LABEL, weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";
import { CALENDAR_MIN_ACTIVITY_WIDTH_PX } from "@/lib/planning-hub/scheduler/calendar-day-layout";
import { schedulerDisplayIdentity, schedulerResourceCodes } from "@/lib/planning-hub/scheduler-display-label";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type ActivityClippedDetailGeometry = {
  blockWidthPx: number;
  blockHeightPx: number;
  compact: boolean;
};

export const ACTIVITY_CLIPPED_DETAIL_MIN_HEIGHT_PX = 52;

export function parseBlockDimensionPx(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Offer progressive disclosure when the card cannot show canonical useful detail at once.
 * Compact resource-timeline blocks use width/height thresholds; calendar blocks reuse 08-01 widths.
 */
export function shouldOfferActivityClippedDetailDisclosure(
  geometry: ActivityClippedDetailGeometry,
): boolean {
  const { blockWidthPx, blockHeightPx, compact } = geometry;
  const narrow = blockWidthPx < CALENDAR_MIN_ACTIVITY_WIDTH_PX;
  const short = blockHeightPx < ACTIVITY_CLIPPED_DETAIL_MIN_HEIGHT_PX;

  if (compact) {
    return narrow || short || blockWidthPx < 140;
  }
  return narrow || short;
}

export type ActivityClippedDetailLine = {
  term: string;
  description: string;
};

export type ActivityClippedDetailModel = {
  title: string;
  typeLabel: string;
  lines: ActivityClippedDetailLine[];
  operationalNote: string | null;
};

function primaryVenueLabel(item: WeekplannerItem): string | null {
  const names = [
    ...item.pitchAllocations.map((r) => r.facilityName?.trim()).filter(Boolean),
    ...item.dressingRoomAllocations.map((r) => r.facilityName?.trim()).filter(Boolean),
  ] as string[];
  const unique = [...new Set(names)];
  if (unique.length === 0) return null;
  return unique.join(" · ");
}

export function buildActivityClippedDetailModel(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): ActivityClippedDetailModel {
  const title = schedulerDisplayIdentity(item) || weekplannerPrimaryLabel(item);
  const typeLabel = weekplannerActivityTypeLabel(item.type);
  const lines: ActivityClippedDetailLine[] = [];

  lines.push({
    term: "Zeit",
    description: weekplannerTimingDetail(item, locale, timeZone),
  });

  const teamLine = weekplannerTeamLine(item);
  if (teamLine && item.type !== "TRAINING") {
    lines.push({ term: "Team", description: teamLine });
  }

  if (item.type === "TOURNAMENT") {
    const organiser = item.title?.trim();
    if (organiser && organiser !== title) {
      lines.push({ term: "Turnier", description: organiser });
    }
  }

  const venue = primaryVenueLabel(item);
  if (venue) {
    lines.push({ term: "Anlage", description: venue });
  }

  const pitch = itemInspectionPitchLabel(item);
  if (pitch !== "—") {
    lines.push({ term: "Spielfeld", description: pitch });
  }

  const dressing = itemInspectionDressingLabel(item);
  if (dressing !== "—") {
    lines.push({ term: "Garderobe", description: dressing });
  }

  const resourceFallback = schedulerResourceCodes(item, 6);
  if (resourceFallback && pitch === "—" && dressing === "—") {
    lines.push({ term: "Ressourcen", description: resourceFallback });
  }

  let operationalNote: string | null = null;
  if (item.conflicts.length > 0) {
    operationalNote = "Planungskonflikt";
  } else if (weekplannerMatchRequiresEndTimeAction(item)) {
    operationalNote = MATCH_END_TIME_ACTION_LABEL;
  }

  return { title, typeLabel, lines, operationalNote };
}

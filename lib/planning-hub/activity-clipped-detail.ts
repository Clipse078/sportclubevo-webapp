/**
 * SCE-PLANNER-UX-08-07 — geometry + canonical content for clipped activity disclosure.
 * Render-time layout hints plus optional DOM overflow measurement (08-07R1).
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
import { summarizeAggregateCluster } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type ActivityClippedDetailGeometry = {
  blockWidthPx: number;
  blockHeightPx: number;
  compact: boolean;
  /** Computed lane/column width when CSS `width` is percent/calc (Kalender path). */
  layoutWidthPx?: number;
  layoutHeightPx?: number;
};

export function effectiveBlockDimensions(geometry: ActivityClippedDetailGeometry): {
  widthPx: number;
  heightPx: number;
} {
  return {
    widthPx: geometry.layoutWidthPx ?? geometry.blockWidthPx,
    heightPx: geometry.layoutHeightPx ?? geometry.blockHeightPx,
  };
}

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
  const { widthPx, heightPx } = effectiveBlockDimensions(geometry);
  const { compact } = geometry;
  const narrow = widthPx < CALENDAR_MIN_ACTIVITY_WIDTH_PX;
  const short = heightPx < ACTIVITY_CLIPPED_DETAIL_MIN_HEIGHT_PX;

  if (compact) {
    return narrow || short || widthPx < 140;
  }
  return narrow || short;
}

export type ActivityContentClippingMeasurement = {
  blockWidthPx: number;
  blockHeightPx: number;
  contentOverflow: boolean;
};

/**
 * Detect ellipsis / line-clamp / hidden rows from rendered DOM (one card root).
 */
export function measureActivityContentClipping(root: HTMLElement): ActivityContentClippingMeasurement {
  const blockWidthPx = root.clientWidth;
  const blockHeightPx = root.clientHeight;
  let contentOverflow = false;

  if (blockHeightPx > 0) {
    const contentShell = root.querySelector("[data-planning-hub-activity-content]");
    if (contentShell instanceof HTMLElement && contentShell.scrollHeight > contentShell.clientHeight + 1) {
      contentOverflow = true;
    }
  }

  if (!contentOverflow) {
    const textRegions = root.querySelectorAll("[data-planning-hub-clipped-text], .truncate");
    for (const node of textRegions) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) {
        contentOverflow = true;
        break;
      }
    }
  }

  return { blockWidthPx, blockHeightPx, contentOverflow };
}

export function resolveActivityClippedDetailOffer(
  geometry: ActivityClippedDetailGeometry,
  dom: { blockWidthPx: number; blockHeightPx: number; contentOverflow: boolean } | null,
): boolean {
  if (dom) {
    const merged: ActivityClippedDetailGeometry = {
      ...geometry,
      layoutWidthPx: dom.blockWidthPx > 0 ? dom.blockWidthPx : geometry.layoutWidthPx,
      layoutHeightPx: dom.blockHeightPx > 0 ? dom.blockHeightPx : geometry.layoutHeightPx,
    };
    if (shouldOfferActivityClippedDetailDisclosure(merged)) return true;
    return dom.contentOverflow;
  }
  return shouldOfferActivityClippedDetailDisclosure(geometry);
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
  /** Aggregate clipped-detail uses the headline only — no per-type badge row. */
  suppressActivityTypeHeader?: boolean;
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

export function buildAggregateClippedDetailModel(
  items: readonly WeekplannerItem[],
  locale: string,
  timeZone: string,
  timeLabel: string,
): ActivityClippedDetailModel {
  const summary = summarizeAggregateCluster(items, timeLabel);
  const lines: ActivityClippedDetailLine[] = [];

  lines.push({ term: "Zeit", description: timeLabel });
  lines.push({ term: "Anzahl", description: String(summary.activityCount) });

  const identities = [...new Set(items.map((item) => schedulerDisplayIdentity(item)))].sort((a, b) =>
    a.localeCompare(b, locale),
  );
  lines.push({
    term: identities.length === 1 ? "Team" : "Teams",
    description: identities.join(" · "),
  });

  if (summary.conflictCount > 0 && summary.conflictLabel) {
    lines.push({ term: "Konflikte", description: summary.conflictLabel });
  }

  if (summary.endTimeActionCount > 0 && summary.endTimeActionLabel) {
    lines.push({ term: "Endzeit", description: summary.endTimeActionLabel });
  }

  let operationalNote: string | null = null;
  if (summary.conflictCount > 0) {
    operationalNote = summary.conflictLabel;
  } else if (summary.endTimeActionCount > 0) {
    operationalNote = summary.endTimeActionLabel;
  }

  return {
    title: summary.headline,
    typeLabel: summary.isMixedActivityTypes ? "Aktivitäten" : summary.headline,
    lines,
    operationalNote,
    suppressActivityTypeHeader: true,
  };
}

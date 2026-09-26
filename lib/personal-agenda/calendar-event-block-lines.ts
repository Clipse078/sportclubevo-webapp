import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";

export type CalendarEventBlockLines = {
  /** Primary label after the time column (type or category). */
  primary: string;
  /** Secondary context line (team, fixture, location, task title). */
  secondary?: string;
  /** When true, show a due prefix instead of clock time in the block header. */
  useDueTimePrefix?: boolean;
};

function joinParts(parts: Array<string | undefined | null>, separator = " · "): string | undefined {
  const filtered = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(separator) : undefined;
}

function formatHomeAway(homeAway: string | null | undefined): string | undefined {
  if (!homeAway) return undefined;
  const normalized = homeAway.trim().toUpperCase();
  if (normalized === "HOME" || normalized === "H") return "H";
  if (normalized === "AWAY" || normalized === "A") return "A";
  return homeAway.trim();
}

/**
 * Maps normalized calendar rows to compact two-line block copy for the month workspace.
 */
export function buildCalendarEventBlockLines(item: NormalizedCalendarItem): CalendarEventBlockLines {
  switch (item.semanticType) {
    case "TRAINING": {
      const team = item.team?.name ?? item.subtitle;
      const identity =
        item.title.trim() && item.title.trim().toLowerCase() !== "training"
          ? item.title.trim()
          : undefined;
      return {
        primary: item.typeLabel || "Training",
        secondary: joinParts([identity, team, item.location]),
      };
    }
    case "MATCH": {
      const homeAway = formatHomeAway(item.homeAway);
      const opponent = item.opponentName?.trim();
      const fixture =
        item.title.trim() ||
        joinParts([opponent ? `vs. ${opponent}` : undefined, homeAway], " · ");
      return {
        primary: item.typeLabel || "Spiel",
        secondary: fixture ?? joinParts([item.team?.name, item.subtitle, item.location]),
      };
    }
    case "TOURNAMENT":
      return {
        primary: item.typeLabel || "Turnier",
        secondary: joinParts([item.title, item.team?.name ?? item.subtitle, item.location]),
      };
    case "EVENT":
      return {
        primary: item.title.trim() || item.typeLabel || "Veranstaltung",
        secondary: joinParts([item.location, item.subtitle, item.contextLabel]),
      };
    case "MEETING":
      return {
        primary: item.title.trim() || item.typeLabel || "Meeting",
        secondary: joinParts([item.location, item.contextLabel, item.subtitle]),
      };
    case "TASK":
      return {
        primary: item.typeLabel || "Aufgabe",
        secondary: item.title.trim() || undefined,
        useDueTimePrefix: item.allDay,
      };
    default:
      return {
        primary: item.title.trim() || item.typeLabel,
        secondary: joinParts([item.subtitle, item.contextLabel, item.location]),
      };
  }
}

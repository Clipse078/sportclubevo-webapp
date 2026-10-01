import type { NormalizedCalendarItem } from "./normalized-calendar-item-types";
import { formatSportingActivityCompactPrimaryText } from "@/lib/sporting-activity-presentation/compact";
import { formatSportingActivityStandardSecondaryLines } from "@/lib/sporting-activity-presentation/format";

export type CalendarEventBlockLines = {
  /** Primary label after the time column (type or category). */
  primary: string;
  /** Secondary context line (team, fixture, location, task title). */
  secondary?: string;
  /** When true, show a due prefix instead of clock time in the block header. */
  useDueTimePrefix?: boolean;
};

export type CalendarEventBlockLineOptions = {
  /** Active tenant display names to suppress redundant club context in copy. */
  tenantDisplayNames?: string[];
};

function joinParts(parts: Array<string | undefined | null>, separator = " · "): string | undefined {
  const filtered = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(separator) : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGenericSemanticLabel(value: string | undefined, semanticType: string): boolean {
  if (!value?.trim()) return true;
  const normalized = normalizeComparable(value);
  const generics: Record<string, string[]> = {
    TRAINING: ["training"],
    MATCH: ["spiel", "match"],
    TOURNAMENT: ["turnier", "tournament"],
    EVENT: ["veranstaltung", "event"],
    MEETING: ["meeting"],
    TASK: ["aufgabe", "task"],
  };
  return (generics[semanticType] ?? []).includes(normalized);
}

function stripTenantDisplayNames(text: string, tenantDisplayNames: string[] | undefined): string {
  if (!text.trim() || !tenantDisplayNames?.length) return text.trim();
  let result = text;
  for (const tenantName of tenantDisplayNames) {
    const trimmed = tenantName.trim();
    if (!trimmed) continue;
    result = result.replace(new RegExp(escapeRegExp(trimmed), "gi"), "");
  }
  return result
    .replace(/\s*[–—-]\s*/g, " – ")
    .replace(/\s*·\s*/g, " · ")
    .replace(/^\s*[–—·-]+\s*|\s*[–—·-]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripGenericWords(text: string, words: string[]): string {
  let result = text;
  for (const word of words) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi"), "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function dedupePart(part: string | undefined, existing: string[]): string | undefined {
  if (!part?.trim()) return undefined;
  const normalized = normalizeComparable(part);
  if (existing.some((value) => normalizeComparable(value) === normalized)) {
    return undefined;
  }
  return part.trim();
}

function formatHomeAway(homeAway: string | null | undefined): string | undefined {
  if (!homeAway) return undefined;
  const normalized = homeAway.trim().toUpperCase();
  if (normalized === "HOME" || normalized === "H") return "H";
  if (normalized === "AWAY" || normalized === "A") return "A";
  return homeAway.trim();
}

function trainingDetailFromTitle(
  item: NormalizedCalendarItem,
  teamName: string | undefined,
): string | undefined {
  let detail = item.title.trim();
  if (!detail || isGenericSemanticLabel(detail, "TRAINING")) return undefined;
  if (item.typeLabel && normalizeComparable(detail) === normalizeComparable(item.typeLabel)) {
    return undefined;
  }
  detail = stripGenericWords(detail, ["Training"]);
  if (teamName) {
    detail = detail.replace(new RegExp(escapeRegExp(teamName), "gi"), "");
    const teamPhrase = new RegExp(
      `(?:\\b[\\w./+-]+\\s+)*${escapeRegExp(teamName)}\\b`,
      "gi",
    );
    detail = detail.replace(teamPhrase, "");
  }
  detail = detail.replace(/^[-–·\s]+|[-–·\s]+$/g, "").trim();
  if (/^(junioren|senioren|aktive|damen|herren)$/i.test(detail)) {
    return undefined;
  }
  return detail || undefined;
}

function matchFixtureLine(
  item: NormalizedCalendarItem,
  options: CalendarEventBlockLineOptions,
): string | undefined {
  const homeAway = formatHomeAway(item.homeAway);
  const opponent = item.opponentName?.trim();
  if (opponent) {
    return joinParts([`vs ${opponent}`, homeAway]);
  }

  const sanitizedTitle = stripTenantDisplayNames(item.title, options.tenantDisplayNames);
  if (sanitizedTitle && !isGenericSemanticLabel(sanitizedTitle, "MATCH")) {
    return joinParts([sanitizedTitle, homeAway]);
  }

  return joinParts([item.team?.name, item.subtitle, item.location, homeAway]);
}

function tournamentContextLine(
  item: NormalizedCalendarItem,
  options: CalendarEventBlockLineOptions,
): string | undefined {
  const team = item.team?.name ?? item.subtitle;
  let title = item.title.trim();
  if (isGenericSemanticLabel(title, "TOURNAMENT")) {
    title = "";
  } else {
    title = stripTenantDisplayNames(title, options.tenantDisplayNames);
    title = stripGenericWords(title, ["Turnier", "Tournament"]);
  }
  return joinParts([team, title || undefined, item.location]);
}

function meetingContextLine(item: NormalizedCalendarItem): string | undefined {
  const primary = item.title.trim().toLowerCase();
  const context = item.contextLabel?.trim();
  const contextIsRedundant =
    !!context &&
    !!primary &&
    normalizeComparable(context) === normalizeComparable(item.title.trim());
  return joinParts([
    item.location,
    contextIsRedundant ? undefined : context,
    item.subtitle,
  ]);
}

function scrubContextLabel(
  label: string | undefined,
  options: CalendarEventBlockLineOptions,
): string | undefined {
  if (!label?.trim()) return undefined;
  const cleaned = stripTenantDisplayNames(label, options.tenantDisplayNames);
  return cleaned || undefined;
}

/**
 * Maps normalized calendar rows to compact two-line block copy for the month workspace.
 */
export function buildCalendarEventBlockLines(
  item: NormalizedCalendarItem,
  options: CalendarEventBlockLineOptions = {},
): CalendarEventBlockLines {
  if (item.activityPresentation) {
    const secondaryParts = formatSportingActivityStandardSecondaryLines(
      item.activityPresentation,
      { tenantDisplayNames: options.tenantDisplayNames },
    );
    return {
      primary:
        formatSportingActivityCompactPrimaryText(item.activityPresentation) ||
        item.activityPresentation.identity.typeLabel ||
        item.typeLabel,
      secondary: joinParts(secondaryParts),
    };
  }

  switch (item.semanticType) {
    case "TRAINING": {
      const team = item.team?.name ?? item.subtitle;
      const detail = trainingDetailFromTitle(item, team);
      const location = item.location?.trim();
      const secondaryParts: string[] = [];
      const teamPart = dedupePart(team, secondaryParts);
      if (teamPart) secondaryParts.push(teamPart);
      const detailPart = dedupePart(detail, secondaryParts);
      if (detailPart) secondaryParts.push(detailPart);
      const locationPart = dedupePart(location, secondaryParts);
      if (locationPart) secondaryParts.push(locationPart);
      return {
        primary: item.typeLabel || "Training",
        secondary: joinParts(secondaryParts),
      };
    }
    case "MATCH": {
      return {
        primary: item.typeLabel || "Spiel",
        secondary: matchFixtureLine(item, options),
      };
    }
    case "TOURNAMENT":
      return {
        primary: item.typeLabel || "Turnier",
        secondary: tournamentContextLine(item, options),
      };
    case "EVENT": {
      const primary = item.title.trim() || item.typeLabel || "Veranstaltung";
      const secondary = joinParts([
        item.location,
        scrubContextLabel(item.subtitle, options),
        scrubContextLabel(item.contextLabel, options),
      ]);
      return { primary, secondary };
    }
    case "MEETING": {
      const primary = item.title.trim() || item.typeLabel || "Meeting";
      const secondary = meetingContextLine(item);
      return { primary, secondary };
    }
    case "TASK": {
      const title = item.title.trim();
      return {
        primary: title || item.typeLabel || "Aufgabe",
        secondary: title
          ? scrubContextLabel(item.contextLabel, options)
          : scrubContextLabel(item.subtitle, options),
        useDueTimePrefix: item.allDay,
      };
    }
    default:
      return {
        primary: item.title.trim() || item.typeLabel,
        secondary: joinParts([
          scrubContextLabel(item.subtitle, options),
          scrubContextLabel(item.contextLabel, options),
          item.location,
        ]),
      };
  }
}

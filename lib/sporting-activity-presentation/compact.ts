import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import { formatTodayEventTypeBadge } from "@/lib/dashboard/today-event-card-presentation";
import type { SportingActivityPresentation } from "./types";
import { filterCompactMetadataPartsAgainstPrimary } from "./compact-dedupe";
import { formatSportingActivityLocationLines } from "./location";

export type SportingActivityCompactFormatOptions = {
  tenantDisplayNames?: string[];
  /**
   * Dashboard programme rows show start time in the left column — omit it from metadata.
   */
  schedulePresentation?: "full" | "omit-start";
  fmtCfg?: TenantFormatConfig;
  /**
   * Dashboard → Mein Programm (SCE-ACTIVITY-UX-01R4): club - location secondary,
   * separate home/away context indicator for match and tournament.
   */
  meinProgrammContract?: boolean;
};

function dedupeParts(parts: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function joinMetadataParts(
  presentation: SportingActivityPresentation,
  parts: readonly string[],
): string | undefined {
  const primaryText = formatSportingActivityCompactPrimaryText(presentation);
  const deduped = dedupeParts(parts);
  const filtered = filterCompactMetadataPartsAgainstPrimary(presentation, primaryText, deduped);
  return filtered.length > 0 ? filtered.join(" · ") : undefined;
}

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Compact HOME / AWAY / NEUTRAL label for legacy programme metadata (German). */
export function formatSportingActivityLocationModeCompactLabel(
  mode: SportingActivityPresentation["location"]["mode"],
): string | undefined {
  switch (mode) {
    case "AWAY":
      return "Auswärts";
    case "NEUTRAL":
      return "Neutral";
    case "HOME":
    case "UNKNOWN":
    default:
      return undefined;
  }
}

function formatCompactSchedulePart(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions,
): string | undefined {
  const endRaw = presentation.schedule.endAt;
  if (!endRaw) return undefined;

  const end = new Date(endRaw);
  if (Number.isNaN(end.getTime())) return undefined;

  const cfg = options.fmtCfg ?? {};
  const endLabel = formatTime(end, cfg);

  if (options.schedulePresentation === "omit-start") {
    return `–${endLabel}`;
  }

  const start = new Date(presentation.schedule.startAt);
  if (Number.isNaN(start.getTime())) return endLabel;
  const startLabel = formatTime(start, cfg);
  return `${startLabel}–${endLabel}`;
}

function joinClubAndLocation(club?: string, location?: string): string | undefined {
  if (club && location) return `${club} - ${location}`;
  return club ?? location;
}

function resolveMeinProgrammClubAndLocation(
  presentation: SportingActivityPresentation,
): { club?: string; location?: string } {
  const { location, identity, context } = presentation;

  if (identity.activityKind === "TRAINING") {
    return {
      club: meaningful(location.hostOrOrganiser),
      location: meaningful(location.venueName),
    };
  }

  if (identity.activityKind === "MATCH") {
    return {
      club: meaningful(location.hostOrOrganiser),
      location: meaningful(location.venueName),
    };
  }

  if (identity.activityKind === "TOURNAMENT") {
    return {
      club: meaningful(location.hostOrOrganiser) ?? meaningful(context?.organiser),
      location: meaningful(location.venueName),
    };
  }

  return {
    club: meaningful(location.hostOrOrganiser),
    location: meaningful(location.venueName),
  };
}

/**
 * Dashboard Mein Programm secondary line: CLUB - LOCATION (R4).
 */
export function formatSportingActivityCompactAgendaClubLocationLine(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): string | undefined {
  if (!options.meinProgrammContract) {
    return undefined;
  }

  const { club, location } = resolveMeinProgrammClubAndLocation(presentation);
  return joinClubAndLocation(club, location);
}

export type SportingActivityCompactAgendaTypeLine = {
  typeLabel: string;
  contextIndicator?: string;
};

/**
 * Dashboard Mein Programm line 2: uppercase activity type + optional home/away badge (R6).
 */
export function resolveSportingActivityCompactAgendaTypeLine(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): SportingActivityCompactAgendaTypeLine | undefined {
  if (!options.meinProgrammContract) {
    return undefined;
  }

  const rawType = presentation.identity.typeLabel?.trim();
  if (!rawType) {
    return undefined;
  }

  const contextIndicator = formatSportingActivityCompactAgendaContextIndicator(
    presentation,
    options,
  );

  return {
    typeLabel: formatTodayEventTypeBadge(rawType),
    contextIndicator,
  };
}

/**
 * Dashboard Mein Programm home/away context (match and tournament only).
 */
export function formatSportingActivityCompactAgendaContextIndicator(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): string | undefined {
  if (!options.meinProgrammContract) {
    return undefined;
  }

  const kind = presentation.identity.activityKind;
  if (kind !== "MATCH" && kind !== "TOURNAMENT") {
    return undefined;
  }

  switch (presentation.location.mode) {
    case "HOME":
      return "Eigener Verein";
    case "AWAY":
      return "Auswärts";
    default:
      return undefined;
  }
}

/**
 * Location parts for compact agenda metadata (excludes fields shown elsewhere).
 */
export function formatSportingActivityCompactAgendaLocationParts(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): string[] {
  const { location, identity } = presentation;
  const suppress = new Set(
    (options.tenantDisplayNames ?? [])
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );

  const push = (value: string | undefined, bucket: string[]) => {
    if (!value) return;
    if (suppress.has(value.toLowerCase())) return;
    if (bucket.some((line) => line.toLowerCase() === value.toLowerCase())) return;
    bucket.push(value);
  };

  const parts: string[] = [];

  if (identity.activityKind === "TRAINING") {
    push(meaningful(location.venueName), parts);
    push(meaningful(location.address), parts);
    push(meaningful(location.facilityResource), parts);
    return parts;
  }

  if (identity.activityKind === "TOURNAMENT") {
    push(meaningful(location.venueName), parts);
    push(meaningful(location.address), parts);
    push(meaningful(location.facilityResource), parts);
    return parts;
  }

  if (identity.activityKind === "MATCH" && location.mode === "AWAY") {
    push(meaningful(location.venueName), parts);
    push(meaningful(location.address), parts);
    push(meaningful(location.facilityResource), parts);
    return parts;
  }

  return formatSportingActivityLocationLines(location, options);
}

/**
 * Primary line for compact surfaces (dashboard programme, calendar detail).
 */
export function formatSportingActivityCompactPrimaryText(
  presentation: SportingActivityPresentation,
): string {
  const kind = presentation.identity.activityKind;

  if (kind === "MATCH" && presentation.participants?.fixtureLine?.trim()) {
    return presentation.participants.fixtureLine.trim();
  }

  if (kind === "TOURNAMENT") {
    return presentation.identity.title.trim();
  }

  return presentation.identity.title;
}

/**
 * Secondary metadata for dashboard programme rows (single line, no labels).
 */
export function formatSportingActivityCompactAgendaSecondaryLine(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): string | undefined {
  if (options.meinProgrammContract) {
    return formatSportingActivityCompactAgendaClubLocationLine(presentation, options);
  }

  const kind = presentation.identity.activityKind;
  const parts: string[] = [];

  if (kind === "TRAINING") {
    const schedule = formatCompactSchedulePart(presentation, options);
    if (schedule) parts.push(schedule);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(presentation, parts);
  }

  if (kind === "MATCH") {
    const modeLabel = formatSportingActivityLocationModeCompactLabel(presentation.location.mode);
    if (modeLabel) parts.push(modeLabel);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(presentation, parts);
  }

  if (kind === "TOURNAMENT") {
    const organiser = presentation.context?.organiser?.trim();
    if (organiser) parts.push(organiser);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(presentation, parts);
  }

  parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
  return joinMetadataParts(presentation, parts);
}

export type SportingActivityCompactPresentation = {
  primaryText: string;
  secondaryText?: string;
  contextIndicator?: string;
  metadataParts: string[];
};

export function resolveSportingActivityCompactPresentation(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): SportingActivityCompactPresentation {
  const secondaryText = formatSportingActivityCompactAgendaSecondaryLine(presentation, options);
  const contextIndicator = formatSportingActivityCompactAgendaContextIndicator(
    presentation,
    options,
  );
  const metadataParts = secondaryText
    ? secondaryText.split(" · ").map((part) => part.trim()).filter(Boolean)
    : [];

  return {
    primaryText: formatSportingActivityCompactPrimaryText(presentation),
    secondaryText,
    contextIndicator,
    metadataParts,
  };
}

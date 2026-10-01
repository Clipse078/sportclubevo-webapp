import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import type { SportingActivityPresentation } from "./types";
import { formatSportingActivityLocationLines } from "./location";

export type SportingActivityCompactFormatOptions = {
  tenantDisplayNames?: string[];
  /**
   * Dashboard programme rows show start time in the left column — omit it from metadata.
   */
  schedulePresentation?: "full" | "omit-start";
  fmtCfg?: TenantFormatConfig;
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

function joinMetadataParts(parts: readonly string[]): string | undefined {
  const deduped = dedupeParts(parts);
  return deduped.length > 0 ? deduped.join(" · ") : undefined;
}

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Compact HOME / AWAY / NEUTRAL label for programme metadata (German). */
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
    const title = presentation.identity.title.trim();
    const team = presentation.team?.name?.trim();
    if (team) {
      const lowerTitle = title.toLowerCase();
      const lowerTeam = team.toLowerCase();
      if (lowerTitle.includes(lowerTeam)) return title;
      return `${title} · ${team}`;
    }
    return title;
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
  const kind = presentation.identity.activityKind;
  const parts: string[] = [];

  if (kind === "TRAINING") {
    const schedule = formatCompactSchedulePart(presentation, options);
    if (schedule) parts.push(schedule);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(parts);
  }

  if (kind === "MATCH") {
    const modeLabel = formatSportingActivityLocationModeCompactLabel(presentation.location.mode);
    if (modeLabel) parts.push(modeLabel);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(parts);
  }

  if (kind === "TOURNAMENT") {
    const organiser = presentation.context?.organiser?.trim();
    if (organiser) parts.push(organiser);
    parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
    return joinMetadataParts(parts);
  }

  parts.push(...formatSportingActivityCompactAgendaLocationParts(presentation, options));
  return joinMetadataParts(parts);
}

export type SportingActivityCompactPresentation = {
  primaryText: string;
  secondaryText?: string;
  metadataParts: string[];
};

export function resolveSportingActivityCompactPresentation(
  presentation: SportingActivityPresentation,
  options: SportingActivityCompactFormatOptions = {},
): SportingActivityCompactPresentation {
  const secondaryText = formatSportingActivityCompactAgendaSecondaryLine(presentation, options);
  const metadataParts = secondaryText
    ? secondaryText.split(" · ").map((part) => part.trim()).filter(Boolean)
    : [];

  return {
    primaryText: formatSportingActivityCompactPrimaryText(presentation),
    secondaryText,
    metadataParts,
  };
}

import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatDate, formatTime } from "@/lib/tenant-runtime/formatters";
import type {
  SportingActivityPresentation,
  SportingActivityPresentationDensity,
} from "./types";
import {
  formatSportingActivityCompactAgendaSecondaryLine,
  formatSportingActivityCompactPrimaryText,
} from "./compact";
import { filterCompactMetadataPartsAgainstPrimary } from "./compact-dedupe";
import { formatSportingActivityLocationLines, formatSportingActivityLocationSummary } from "./location";

export type SportingActivityScheduleFormatInput = {
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  fmtCfg: TenantFormatConfig;
  locale?: string;
};

/** Example: Sa, 10. Okt. · 10:00–12:00 */
export function formatSportingActivityScheduleLine(
  input: SportingActivityScheduleFormatInput,
): string {
  if (input.allDay) {
    return formatDate(input.startAt, input.fmtCfg, { weekday: "short" });
  }

  const dayPart = formatDate(input.startAt, input.fmtCfg, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const start = formatTime(input.startAt, input.fmtCfg);
  if (input.endAt) {
    const end = formatTime(input.endAt, input.fmtCfg);
    return `${dayPart} · ${start}–${end}`;
  }
  return `${dayPart} · ${start}`;
}

export function formatSportingActivityCompactTitle(
  presentation: SportingActivityPresentation,
): string {
  return formatSportingActivityCompactPrimaryText(presentation);
}

export function formatSportingActivityCompactContextLine(
  presentation: SportingActivityPresentation,
  options: { tenantDisplayNames?: string[] } = {},
): string | undefined {
  const kind = presentation.identity.activityKind;

  if (kind === "TRAINING") {
    const locationLine = formatSportingActivityLocationSummary(presentation.location, options);
    if (!locationLine) return undefined;
    const primary = formatSportingActivityCompactPrimaryText(presentation);
    const filtered = filterCompactMetadataPartsAgainstPrimary(
      presentation,
      primary,
      locationLine
        .split("\n")
        .map((segment) => segment.trim())
        .filter(Boolean),
    );
    return filtered.length > 0 ? filtered.join(" · ") : undefined;
  }

  if (kind === "MATCH") {
    if (presentation.context?.competitionLabel) {
      return presentation.context.competitionLabel;
    }
    return formatSportingActivityLocationSummary(presentation.location, options)?.replace(
      /\n/g,
      " · ",
    );
  }

  if (kind === "TOURNAMENT") {
    const parts: string[] = [];
    if (presentation.context?.organiser) parts.push(presentation.context.organiser);
    const locationLine = formatSportingActivityLocationSummary(presentation.location, options);
    if (locationLine) parts.push(locationLine.replace(/\n/g, " · "));
    const primary = formatSportingActivityCompactPrimaryText(presentation);
    const filtered = filterCompactMetadataPartsAgainstPrimary(
      presentation,
      primary,
      parts.flatMap((part) => part.split(" · ").map((segment) => segment.trim()).filter(Boolean)),
    );
    return filtered.length > 0 ? filtered.join(" · ") : undefined;
  }

  return formatSportingActivityLocationSummary(presentation.location, options)?.replace(
    /\n/g,
    " · ",
  );
}

export function formatSportingActivityStandardSecondaryLines(
  presentation: SportingActivityPresentation,
  options: { tenantDisplayNames?: string[] } = {},
): string[] {
  const locationLines = formatSportingActivityLocationLines(presentation.location, options);
  if (presentation.identity.activityKind === "MATCH") {
    const lines: string[] = [];
    if (presentation.context?.competitionLabel) {
      lines.push(presentation.context.competitionLabel);
    }
    lines.push(...locationLines);
    return filterStandardSecondaryLines(presentation, lines);
  }
  if (presentation.identity.activityKind === "TOURNAMENT") {
    const lines: string[] = [];
    if (presentation.context?.organiser) lines.push(presentation.context.organiser);
    lines.push(...locationLines);
    return filterStandardSecondaryLines(presentation, lines);
  }
  if (presentation.identity.activityKind === "TRAINING") {
    return filterStandardSecondaryLines(presentation, locationLines);
  }
  return filterStandardSecondaryLines(presentation, locationLines);
}

function filterStandardSecondaryLines(
  presentation: SportingActivityPresentation,
  lines: string[],
): string[] {
  const primary = formatSportingActivityCompactPrimaryText(presentation);
  return filterCompactMetadataPartsAgainstPrimary(presentation, primary, dedupeLines(lines));
}

export function formatSportingActivityPresentation(
  presentation: SportingActivityPresentation,
  density: SportingActivityPresentationDensity,
  options: { tenantDisplayNames?: string[] } = {},
): {
  title: string;
  subtitle?: string;
  locationLines: string[];
  venueSummary?: string;
} {
  const locationLines = formatSportingActivityLocationLines(presentation.location, options);
  const venueSummary =
    locationLines.length > 0 ? locationLines.join("\n") : undefined;

  if (density === "compact") {
    return {
      title: formatSportingActivityCompactTitle(presentation),
      subtitle:
        formatSportingActivityCompactAgendaSecondaryLine(presentation, {
          tenantDisplayNames: options.tenantDisplayNames,
          schedulePresentation: "full",
        }) ?? formatSportingActivityCompactContextLine(presentation, options),
      locationLines,
      venueSummary,
    };
  }

  if (density === "standard") {
    const secondary = formatSportingActivityStandardSecondaryLines(presentation, options);
    return {
      title: formatSportingActivityCompactTitle(presentation),
      subtitle: secondary.length > 0 ? secondary.join(" · ") : undefined,
      locationLines,
      venueSummary,
    };
  }

  return {
    title: presentation.identity.title,
    subtitle: formatSportingActivityCompactContextLine(presentation, options),
    locationLines,
    venueSummary,
  };
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line.trim());
  }
  return out;
}

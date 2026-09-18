import {
  isKnownKickoffForMatch,
  SCE_UNKNOWN_KICKOFF_TIME_LABEL,
} from "@/lib/match/kickoff-semantics";
import type { MatchcenterMatchDetail, MatchcenterMatchSummary } from "./types";
import {
  assessMatchOperationalState,
  type MatchcenterOperationalAssessment,
} from "./operational-state";
import { getMatchcenterLifecycleClassification, getMatchcenterLifecycleLabel } from "./match-lifecycle";

const PROTECTED_SOURCES = new Set(["SFV", "CLUBCORNER_FVNWS", "CSV_EXCEL_IMPORT"]);

export function isSpieleRecordProtectedSource(eventSource: string): boolean {
  return PROTECTED_SOURCES.has(eventSource);
}

export function resolveSpieleRecordSourceLabel(match: Pick<MatchcenterMatchDetail, "source">): string {
  if (match.source.eventSource === "SFV" || match.source.provider === "SFV") {
    return "SFV";
  }
  if (match.source.eventSource === "MANUAL" || match.source.eventSource === "SCE") {
    return "Manuell";
  }
  return (
    match.source.provider ??
    match.source.externalSource ??
    match.source.eventSource ??
    "Unbekannt"
  );
}

export function resolveSpieleRecordLastChangedLabel(
  match: Pick<MatchcenterMatchDetail, "synchronization" | "reviewedAt" | "publishedAt">,
  locale: string,
  timezone: string,
): string {
  const candidates = [
    match.synchronization.detailSyncedAt,
    match.synchronization.eventLastSyncedAt,
    match.reviewedAt,
    match.publishedAt,
  ].filter((value): value is Date => value instanceof Date);

  const latest = candidates.sort((a, b) => b.getTime() - a.getTime())[0];
  if (!latest) {
    return "Nicht hinterlegt";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(latest);
}

export function formatSpieleRecordDate(
  value: Date | null,
  locale: string,
  timezone: string,
): string {
  if (!value) return "Nicht hinterlegt";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(value);
}

export function formatSpieleRecordTime(
  value: Date | null,
  locale: string,
  timezone: string,
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(value);
}

export function formatSpieleRecordDateTimeLine(
  startAt: Date,
  locale: string,
  timezone: string,
): string {
  const date = formatSpieleRecordDate(startAt, locale, timezone);
  const time = formatSpieleRecordTime(startAt, locale, timezone);
  return `${date} · ${time}`;
}

type SpieleKickoffPresentationMatch = Pick<
  MatchcenterMatchSummary,
  "startAt" | "source" | "kickoffKnown"
>;

export function formatSpieleKickoffPresentation(
  match: SpieleKickoffPresentationMatch,
  locale: string,
  timezone: string,
): string {
  if (!match.kickoffKnown) {
    return SCE_UNKNOWN_KICKOFF_TIME_LABEL;
  }
  return formatSpieleRecordTime(match.startAt, locale, timezone);
}

export function formatSpieleRecordDateTimeLineForMatch(
  match: SpieleKickoffPresentationMatch,
  locale: string,
  timezone: string,
): string {
  const date = formatSpieleRecordDate(match.startAt, locale, timezone);
  const time = formatSpieleKickoffPresentation(match, locale, timezone);
  return `${date} · ${time}`;
}

export function formatSpieleOperationalEndPresentation(
  match: Pick<
    MatchcenterMatchSummary,
    "kickoffKnown" | "operationalEndAt" | "operationalEndAtOverride" | "endAt"
  >,
  locale: string,
  timezone: string,
): string | null {
  if (!match.kickoffKnown) {
    return null;
  }
  const end =
    match.operationalEndAtOverride ?? match.operationalEndAt ?? match.endAt;
  if (!end) return null;
  return formatSpieleRecordTime(end, locale, timezone);
}

export function assessSpieleRecordOperationalState(
  match: MatchcenterMatchDetail,
  now?: Date,
): MatchcenterOperationalAssessment {
  return assessMatchOperationalState(match, now);
}

export function resolveSpieleRecordStatusRailLabel(
  match: MatchcenterMatchDetail,
  assessment: MatchcenterOperationalAssessment,
  now?: Date,
): string {
  const lifecycle = getMatchcenterLifecycleClassification(match, now).lifecycle;
  if (lifecycle === "CANCELLED") return "Abgesagt";
  if (lifecycle === "POSTPONED") return "Verschoben";
  if (lifecycle === "COMPLETED") return "Abgeschlossen";
  if (lifecycle === "LIVE") return "Live";
  if (assessment.status === "READY") return "Bereit";
  if (assessment.status === "AWAY") return "Auswärtsspiel";
  if (assessment.status === "OPEN") {
    return `${assessment.actionCount} ${assessment.actionCount === 1 ? "Punkt" : "Punkte"} offen`;
  }
  return getMatchcenterLifecycleLabel(getMatchcenterLifecycleClassification(match, now));
}

/**
 * Readiness pill (Bereit / N Punkte offen) in the record header — not HOME/AWAY identity.
 */
export function shouldShowSpieleRecordHeaderReadinessPill(
  homeAway: string | null,
  assessment: MatchcenterOperationalAssessment,
): boolean {
  const normalized = homeAway?.trim().toUpperCase() ?? null;
  if (normalized === "AWAY" || assessment.status === "AWAY") {
    return false;
  }
  if (assessment.status === "NOT_APPLICABLE") {
    return false;
  }
  return true;
}

export function resolveHomeAwaySemanticLabel(homeAway: string | null): string | null {
  const normalized = homeAway?.trim().toUpperCase() ?? null;
  if (normalized === "HOME") return "Heimspiel";
  if (normalized === "AWAY") return "Auswärtsspiel";
  return null;
}

import { getMatchcenterLifecycleClassification } from "@/lib/matchcenter/match-lifecycle";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { dayKeyInTimeZone } from "@/lib/planning-hub/scheduler/time-zone";
import { referenceDayFromDayKey } from "@/lib/planning-hub/scheduler/calendar-date-shift";
import { buildSceActivityPresentationStatus } from "./status";
import type { SceActivityPresentationStatus } from "./types";

export type ResolveSceMatchLifecycleStatusInput = {
  match: Pick<
    MatchcenterMatchSummary,
    "status" | "startAt" | "synchronization" | "kickoffKnown"
  >;
  now?: Date;
  timezone?: string;
};

function resolveRelativeDayLabel(
  startAt: Date,
  now: Date,
  timezone: string,
): "Heute" | "Morgen" | null {
  const startKey = dayKeyInTimeZone(startAt, timezone);
  const todayKey = dayKeyInTimeZone(now, timezone);
  if (startKey === todayKey) {
    return "Heute";
  }

  const tomorrowRef = referenceDayFromDayKey(todayKey);
  tomorrowRef.setUTCDate(tomorrowRef.getUTCDate() + 1);
  const tomorrowKey = dayKeyInTimeZone(tomorrowRef, timezone);
  if (startKey === tomorrowKey) {
    return "Morgen";
  }

  return null;
}

function resolveLiveStatusLabel(
  match: Pick<MatchcenterMatchSummary, "synchronization">,
): string {
  const stateName = match.synchronization?.providerMatchStateName?.trim();
  if (!stateName) {
    return "Live";
  }

  const minuteMatch = stateName.match(/(\d{1,3})\s*'/);
  if (minuteMatch) {
    return `Live ${minuteMatch[1]}'`;
  }

  if (/live/i.test(stateName)) {
    return stateName;
  }

  return "Live";
}

/** User-facing match lifecycle badge for cards (not operational readiness). */
export function resolveSceMatchLifecycleStatus(
  input: ResolveSceMatchLifecycleStatusInput,
): SceActivityPresentationStatus | undefined {
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? "Europe/Zurich";
  const classification = getMatchcenterLifecycleClassification(input.match, now);
  const { lifecycle } = classification;

  switch (lifecycle) {
    case "LIVE":
      return buildSceActivityPresentationStatus({
        domain: "live",
        label: resolveLiveStatusLabel(input.match),
        semantic: "active",
      });
    case "COMPLETED":
      return buildSceActivityPresentationStatus({
        domain: "completed",
        label: "Beendet",
        semantic: "completed",
      });
    case "CANCELLED":
      return buildSceActivityPresentationStatus({
        domain: "cancelled",
        label: "Abgesagt",
        semantic: "cancelled",
      });
    case "POSTPONED":
      return buildSceActivityPresentationStatus({
        domain: "postponed",
        label: "Verschoben",
        semantic: "warning",
      });
    case "NEEDS_RECONCILIATION":
      return buildSceActivityPresentationStatus({
        domain: "needs_reconciliation",
        label: "Datenprüfung",
        semantic: "warning",
      });
    case "UPCOMING":
    default: {
      const relative = resolveRelativeDayLabel(input.match.startAt, now, timezone);
      if (relative === "Heute") {
        return buildSceActivityPresentationStatus({
          domain: "scheduled",
          label: "Heute",
          semantic: "warning",
        });
      }
      if (relative === "Morgen") {
        return buildSceActivityPresentationStatus({
          domain: "scheduled",
          label: "Morgen",
          semantic: "planned",
        });
      }
      return buildSceActivityPresentationStatus({
        domain: "scheduled",
        label: "Geplant",
        semantic: "planned",
      });
    }
  }
}

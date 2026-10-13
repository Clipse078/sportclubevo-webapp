import { formatFixtureDateLine, formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import {
  formatClubEventDateHeading,
  formatClubEventTimingLabel,
} from "@/lib/events/club-event-scheduling";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { SceClubEventPresentationModel } from "./types";

export function formatSceClubEventDateLine(
  model: SceClubEventPresentationModel,
  fmtCfg: TenantFormatConfig,
): string {
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;

  if (model.schedule.allDay) {
    return formatClubEventDateHeading(
      { allDay: true, startAt, endAt },
      locale,
      timezone,
    );
  }

  return formatFixtureDateLine(startAt, fmtCfg);
}

export function formatSceClubEventTimeLabel(
  model: SceClubEventPresentationModel,
  fmtCfg: TenantFormatConfig,
): string {
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;

  if (model.schedule.allDay) {
    return formatClubEventTimingLabel({ allDay: true, startAt, endAt }, locale, timezone);
  }

  const start = formatFixtureTime(startAt, fmtCfg);
  if (!endAt) return start;
  return (
    formatSportingActivityTimeRange({
      startLabel: start,
      endLabel: formatFixtureTime(endAt, fmtCfg),
    }) ?? start
  );
}

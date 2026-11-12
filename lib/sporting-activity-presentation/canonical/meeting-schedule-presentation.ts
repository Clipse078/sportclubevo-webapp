import { formatFixtureDateLine, formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { SceMeetingPresentationModel } from "./types";

export function formatSceMeetingDateLine(
  model: SceMeetingPresentationModel,
  fmtCfg: TenantFormatConfig,
): string {
  const startAt = new Date(model.schedule.startAt);
  return formatFixtureDateLine(startAt, fmtCfg);
}

export function formatSceMeetingTimeLabel(
  model: SceMeetingPresentationModel,
  fmtCfg: TenantFormatConfig,
): string {
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;
  const start = formatFixtureTime(startAt, fmtCfg);
  if (!endAt) return start;
  return (
    formatSportingActivityTimeRange({
      startLabel: start,
      endLabel: formatFixtureTime(endAt, fmtCfg),
    }) ?? start
  );
}

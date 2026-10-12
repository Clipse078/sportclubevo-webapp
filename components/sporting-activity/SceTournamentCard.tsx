"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFixtureDateLine, formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import {
  formatSceActivityLocationHierarchy,
  isSceActivityDimensionVisible,
} from "@/lib/sporting-activity-presentation/canonical";
import {
  SCE_TOURNAMENT_CARD_SHELL_CLASS,
  isSceTournamentRichCardDensity,
  sceTournamentCardBoundedWidthClass,
  sceTournamentMicroShellClass,
  sceTournamentRichDensityScale,
} from "@/lib/sporting-activity-presentation/canonical/tournament-card-rich-density";
import type {
  SceActivityPresentationDensity,
  SceTournamentPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityScheduleLine } from "@/lib/sporting-activity-presentation/format";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { ActivityTypePill } from "./ActivityTypePill";
import { SceTournamentCardStatus } from "./SceTournamentCardStatus";

export type SceTournamentCardSurface = "standalone" | "detail-embed" | "list-row";

export type SceTournamentCardProps = {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  linkToDetail?: boolean;
  surface?: SceTournamentCardSurface;
  showStatus?: boolean;
  testId?: string;
};

function richScale(density: SceActivityPresentationDensity) {
  return isSceTournamentRichCardDensity(density)
    ? sceTournamentRichDensityScale(density)
    : sceTournamentRichDensityScale("COMPACT");
}

export function buildTournamentAccessibleLabel(model: SceTournamentPresentationModel): string {
  const organiser = model.organiser.displayName?.trim();
  const team = model.hauptteam?.name?.trim();
  const parts = [model.typeLabel, model.tournamentTitle, organiser, team].filter(Boolean);
  return parts.join(" — ");
}

/** Venue/resource only — organiser is rendered separately (01F invariant). */
function resolveTournamentLocationLine(
  model: SceTournamentPresentationModel,
  density: SceActivityPresentationDensity,
): string | undefined {
  if (!isSceActivityDimensionVisible(density, "location")) {
    return undefined;
  }
  const stripped = {
    ...model.location,
    hostOrOrganiser: undefined,
  };
  return formatSceActivityLocationHierarchy(stripped, { includeHostClub: false });
}

function resolveMicroLocationLine(model: SceTournamentPresentationModel): string | undefined {
  const resource = model.location.facilityResource?.trim();
  if (resource) return resource;
  const venue = model.location.venueName?.trim();
  if (venue) return venue;
  return resolveTournamentLocationLine(model, "MICRO");
}

function formatSessionSchedule(model: SceTournamentPresentationModel, fmtCfg: TenantFormatConfig): string {
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;
  return formatSportingActivityScheduleLine({
    startAt,
    endAt,
    allDay: model.schedule.allDay,
    fmtCfg,
  });
}

function formatSessionTimeOnly(model: SceTournamentPresentationModel, fmtCfg: TenantFormatConfig): string {
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

function formatCompactDateToken(model: SceTournamentPresentationModel, fmtCfg: TenantFormatConfig): string {
  const startAt = new Date(model.schedule.startAt);
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: timezone,
  }).format(startAt);
  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(startAt);
  return `${weekday} ${day}`;
}

function SceTournamentTypeHeader({
  model,
  density,
  showStatus,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  showStatus: boolean;
}) {
  const status = model.status;

  return (
    <div
      className="flex min-w-0 items-start justify-between gap-2"
      data-sce-tournament-region="meta"
      data-sce-tournament-header
    >
      <ActivityTypePill activityKind="TOURNAMENT" label={model.typeLabel} className="shrink-0" />
      {showStatus && status?.label ? (
        <div className="shrink-0" data-sce-tournament-region="status">
          <SceTournamentCardStatus status={status} />
        </div>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </div>
  );
}

function SceTournamentOrganiserLine({
  model,
  density,
  testId = "sce-tournament-organiser",
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  testId?: string;
}) {
  const scale = richScale(density);
  const organiser = model.organiser.displayName?.trim();
  if (!organiser) return null;

  return (
    <p
      className={cn("min-w-0 truncate", scale.contextLineClass)}
      data-testid={testId}
      data-sce-tournament-region="organiser"
      title={organiser}
    >
      {organiser}
    </p>
  );
}

function SceTournamentIdentityBlock({
  model,
  density,
  includeHauptteamInSubtitle,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  includeHauptteamInSubtitle?: boolean;
}) {
  const scale = richScale(density);
  const organiser = model.organiser.displayName?.trim();
  const compactSubtitle =
    includeHauptteamInSubtitle && organiser && model.hauptteam?.name
      ? [organiser, model.hauptteam.name].filter(Boolean).join(" · ")
      : includeHauptteamInSubtitle
        ? organiser
        : undefined;

  return (
    <div className="min-w-0 space-y-0.5" data-sce-tournament-region="identity">
      <p
        className={cn(scale.titleClass)}
        data-testid="sce-tournament-title"
        title={model.tournamentTitle}
      >
        {model.tournamentTitle}
      </p>
      {!includeHauptteamInSubtitle ? <SceTournamentOrganiserLine model={model} density={density} /> : null}
      {model.hauptteam?.name && !includeHauptteamInSubtitle ? (
        <p className={cn("min-w-0 truncate", scale.teamClass)} data-testid="sce-tournament-hauptteam">
          {model.hauptteam.name}
        </p>
      ) : null}
      {compactSubtitle ? (
        <p
          className={cn("min-w-0 line-clamp-2", scale.contextLineClass)}
          data-testid="sce-tournament-context-line"
        >
          {compactSubtitle}
        </p>
      ) : null}
    </div>
  );
}

function SceTournamentScheduleRows({
  model,
  fmtCfg,
  density,
}: {
  model: SceTournamentPresentationModel;
  fmtCfg: TenantFormatConfig;
  density: SceActivityPresentationDensity;
}) {
  const scale = richScale(density);
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3"
      data-testid="sce-tournament-schedule"
      data-sce-tournament-region="schedule"
    >
      <span className={cn("inline-flex min-w-0 items-center gap-1.5", scale.scheduleTextClass)}>
        <Calendar className={scale.scheduleIconClass} aria-hidden />
        <span className="truncate">{formatFixtureDateLine(startAt, fmtCfg)}</span>
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 font-mono tabular-nums",
          scale.scheduleTextClass,
        )}
        data-testid="sce-tournament-schedule-time"
      >
        <Clock className={scale.scheduleIconClass} aria-hidden />
        {formatSportingActivityTimeRange({
          startLabel: formatFixtureTime(startAt, fmtCfg),
          endLabel: endAt ? formatFixtureTime(endAt, fmtCfg) : undefined,
        }) ?? formatFixtureTime(startAt, fmtCfg)}
      </span>
    </div>
  );
}

function SceTournamentLocationRow({
  locationLine,
  density,
}: {
  locationLine: string;
  density: SceActivityPresentationDensity;
}) {
  const scale = richScale(density);
  return (
    <div
      className={cn("flex min-w-0 items-start gap-1.5", scale.scheduleTextClass)}
      data-testid="sce-tournament-location"
      data-sce-tournament-region="location"
    >
      <MapPin className={cn(scale.scheduleIconClass, "mt-0.5")} aria-hidden />
      <p className="min-w-0 line-clamp-2">{locationLine}</p>
    </div>
  );
}

function SceTournamentRichCardContent({
  model,
  density,
  fmtCfg,
  showSchedule,
  showLocation,
  showStatus,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  showLocation: boolean;
  showStatus: boolean;
}) {
  const locationLine = showLocation ? resolveTournamentLocationLine(model, density) : undefined;

  return (
    <div className={cn("min-w-0", richScale(density).contentSpaceYClass)}>
      <SceTournamentTypeHeader model={model} density={density} showStatus={showStatus} />
      <SceTournamentIdentityBlock model={model} density={density} />
      {showSchedule ? <SceTournamentScheduleRows model={model} fmtCfg={fmtCfg} density={density} /> : null}
      {locationLine ? <SceTournamentLocationRow locationLine={locationLine} density={density} /> : null}
    </div>
  );
}

function SceTournamentCompactContent({
  model,
  fmtCfg,
  showStatus,
}: {
  model: SceTournamentPresentationModel;
  fmtCfg: TenantFormatConfig;
  showStatus: boolean;
}) {
  const locationLine = resolveTournamentLocationLine(model, "COMPACT");
  const dateToken = formatCompactDateToken(model, fmtCfg);
  const timeLine = formatSessionTimeOnly(model, fmtCfg);

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-start sm:gap-3"
      data-sce-tournament-density="COMPACT"
    >
      <div className="min-w-0 space-y-1">
        <SceTournamentTypeHeader model={model} density="COMPACT" showStatus={false} />
        <SceTournamentIdentityBlock model={model} density="COMPACT" includeHauptteamInSubtitle />
      </div>
      <div className="min-w-0 space-y-1 sm:text-right">
        <p className="text-xs font-medium text-[var(--text-2)]" data-testid="sce-tournament-compact-date">
          {dateToken} · {timeLine}
        </p>
        {locationLine ? (
          <p className="text-xs text-[var(--text-2)]" data-testid="sce-tournament-compact-location">
            {locationLine}
          </p>
        ) : null}
        {showStatus && model.status?.label ? (
          <div className="flex sm:justify-end" data-sce-tournament-region="status">
            <SceTournamentCardStatus status={model.status} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SceTournamentMicroContent({
  model,
  fmtCfg,
  showSchedule,
  narrow,
}: {
  model: SceTournamentPresentationModel;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  narrow?: boolean;
}) {
  const locationLine = resolveMicroLocationLine(model);
  const timeLabel = formatSessionTimeOnly(model, fmtCfg);

  return (
    <div className="min-w-0 space-y-0.5" data-sce-tournament-density="MICRO">
      <p className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {model.typeLabel}
      </p>
      <p
        className="truncate text-[0.8125rem] font-semibold leading-tight text-[var(--foreground)]"
        data-testid="sce-tournament-micro-title"
        title={model.tournamentTitle}
      >
        {model.tournamentTitle}
      </p>
      <SceTournamentOrganiserLine
        model={model}
        density="MICRO"
        testId="sce-tournament-micro-organiser"
      />
      {showSchedule && timeLabel ? (
        <p
          className="truncate font-mono text-[0.75rem] tabular-nums text-[var(--text-2)]"
          data-testid="sce-tournament-micro-time"
        >
          {narrow ? timeLabel.split("–")[0]?.trim() ?? timeLabel : timeLabel}
        </p>
      ) : null}
      {locationLine ? (
        <p
          className="truncate text-[0.6875rem] text-[var(--text-2)]"
          data-testid="sce-tournament-micro-location"
          title={locationLine}
        >
          {locationLine}
        </p>
      ) : null}
    </div>
  );
}

export function SceTournamentCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = true,
  surface = "standalone",
  showStatus = true,
  testId = "sce-tournament-card",
}: SceTournamentCardProps) {
  const embed = surface === "detail-embed";
  const showSchedule = !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const statusVisible = showStatus && isSceActivityDimensionVisible(density, "status");

  const href = linkToDetail ? model.route.consumeHref ?? model.route.manageHref : null;

  const richBounded =
    !embed && isSceTournamentRichCardDensity(density) && density !== "COMPACT"
      ? sceTournamentCardBoundedWidthClass(density)
      : !embed && density === "MICRO"
        ? "w-full max-w-[12rem]"
        : !embed
          ? "w-full max-w-sm"
          : "";

  const richPadding =
    !embed && isSceTournamentRichCardDensity(density)
      ? sceTournamentRichDensityScale(density).shellPaddingClass
      : !embed && density === "MICRO"
        ? sceTournamentMicroShellClass()
        : "";

  const shellClass = cn(
    "relative min-w-0 text-[var(--foreground)]",
    richBounded,
    !embed && density !== "MICRO" && SCE_TOURNAMENT_CARD_SHELL_CLASS,
    !embed && density === "MICRO" && "rounded-md border border-[var(--border)]/80 bg-[var(--surface)]",
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    richPadding,
    className,
  );

  let content: ReactNode;

  if (embed) {
    content = (
      <div className="min-w-0 space-y-2">
        <SceTournamentIdentityBlock model={model} density={density} />
        {statusVisible && model.status?.label ? (
          <SceTournamentCardStatus status={model.status} />
        ) : null}
      </div>
    );
  } else if (density === "MICRO") {
    content = (
      <SceTournamentMicroContent
        model={model}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        narrow={Boolean(className?.includes("sce-tournament-micro-narrow"))}
      />
    );
  } else if (density === "COMPACT") {
    content = <SceTournamentCompactContent model={model} fmtCfg={fmtCfg} showStatus={statusVisible} />;
  } else {
    content = (
      <SceTournamentRichCardContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        showLocation={showLocation}
        showStatus={statusVisible}
      />
    );
  }

  const accessibleLabel = buildTournamentAccessibleLabel(model);

  if (!href) {
    return (
      <article
        className={shellClass}
        data-testid={testId}
        data-density={density}
        data-sce-tournament-card
        data-sce-tournament-density={density}
        data-surface={surface}
        aria-label={accessibleLabel}
      >
        {content}
      </article>
    );
  }

  return (
    <article
      className={cn(shellClass, !embed && "transition-colors hover:border-[var(--border-strong)]")}
      data-testid={testId}
      data-density={density}
      data-sce-tournament-card
      data-sce-tournament-density={density}
      data-surface={surface}
    >
      <Link
        href={href}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        aria-label={`${accessibleLabel} — Details öffnen`}
        data-testid="sce-tournament-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { formatSessionSchedule };

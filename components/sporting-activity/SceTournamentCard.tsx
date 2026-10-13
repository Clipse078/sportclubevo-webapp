"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFixtureDateLine, formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import {
  formatSceActivityLocationHierarchy,
  isSceActivityDimensionVisible,
} from "@/lib/sporting-activity-presentation/canonical";
import { resolveSceTournamentHauptteamDisplayName } from "@/lib/sporting-activity-presentation/canonical/tournament-hauptteam-display";
import {
  SCE_TOURNAMENT_CARD_SHELL_CLASS,
  isSceTournamentRichCardDensity,
  sceTournamentCardBoundedWidthClass,
  sceTournamentMicroShellClass,
  sceTournamentOrganiserCrestVisualSizeForDensity,
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

function resolveHauptteamLabel(model: SceTournamentPresentationModel): string | undefined {
  return resolveSceTournamentHauptteamDisplayName({
    hauptteamName: model.hauptteam?.name,
    organiserDisplayName: model.organiser.displayName,
  });
}

export function buildTournamentAccessibleLabel(model: SceTournamentPresentationModel): string {
  const organiser = model.organiser.displayName?.trim();
  const team = resolveHauptteamLabel(model);
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
  showStatus,
}: {
  model: SceTournamentPresentationModel;
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

function SceTournamentOrganiserCrest({
  model,
  density,
  narrowMicro,
  emphasized,
  listRow,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  narrowMicro?: boolean;
  emphasized?: boolean;
  listRow?: boolean;
}) {
  const crestSize = sceTournamentOrganiserCrestVisualSizeForDensity(density, { narrowMicro, listRow });
  if (!crestSize) {
    return null;
  }

  return (
    <span data-testid="sce-tournament-organiser-crest" className="self-start">
      <ClubCrest
        identity={model.organiser}
        density={crestSize}
        decorative
        emphasized={emphasized}
        className="self-start"
      />
    </span>
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

  const microClass =
    density === "MICRO"
      ? "truncate text-[0.6875rem] font-medium leading-tight text-[var(--text-2)]"
      : scale.organiserNameClass;

  return (
    <p
      className={cn("min-w-0", microClass)}
      data-testid={testId}
      data-sce-tournament-region="organiser"
      title={organiser}
    >
      {organiser}
    </p>
  );
}

function SceTournamentHauptteamLine({
  model,
  density,
  testId = "sce-tournament-hauptteam",
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  testId?: string;
}) {
  const scale = richScale(density);
  const teamLabel = resolveHauptteamLabel(model);
  if (!teamLabel) return null;

  const microTeamClass =
    density === "MICRO"
      ? cn(
          "truncate text-[0.6875rem] font-semibold leading-tight",
          "text-[color-mix(in_srgb,var(--sce-info)_88%,var(--foreground)_12%)]",
        )
      : scale.hauptteamNameClass;
  const microIconClass =
    density === "MICRO" ? "h-3 w-3 shrink-0 opacity-80 text-[var(--text-2)]" : scale.hauptteamIconClass;

  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
      data-testid={testId}
      data-sce-tournament-region="hauptteam"
    >
      <Users className={microIconClass} aria-hidden />
      <p className={cn("min-w-0", microTeamClass)} title={teamLabel}>
        {teamLabel}
      </p>
    </div>
  );
}

function SceTournamentIdentityBlock({
  model,
  density,
  narrowMicro,
  showCrest = true,
  listRow = false,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
  narrowMicro?: boolean;
  showCrest?: boolean;
  listRow?: boolean;
}) {
  const scale = richScale(density);

  return (
    <div
      className={cn("flex min-w-0 gap-2.5", scale.identityStackGapClass)}
      data-sce-tournament-region="identity"
    >
      {showCrest ? (
        <SceTournamentOrganiserCrest
          model={model}
          density={density}
          narrowMicro={narrowMicro}
          listRow={listRow}
          emphasized={density === "HERO" || density === "STANDARD" || listRow}
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(scale.titleClass)}
          data-testid="sce-tournament-title"
          title={model.tournamentTitle}
        >
          {model.tournamentTitle}
        </p>
        <SceTournamentOrganiserLine model={model} density={density} />
        <SceTournamentHauptteamLine model={model} density={density} />
      </div>
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
      className="flex min-w-0 items-center justify-between gap-3 border-t border-[var(--border)]/50 pt-2"
      data-testid="sce-tournament-schedule"
      data-sce-tournament-region="schedule"
    >
      <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-medium", scale.scheduleTextClass)}>
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
      className={cn("flex min-w-0 items-start gap-1.5", scale.locationTextClass)}
      data-testid="sce-tournament-location"
      data-sce-tournament-region="location"
    >
      <MapPin className={cn(scale.locationIconClass, "mt-0.5")} aria-hidden />
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
  const scale = richScale(density);
  const locationLine = showLocation ? resolveTournamentLocationLine(model, density) : undefined;

  return (
    <div className={cn("min-w-0", scale.contentSpaceYClass)}>
      <SceTournamentTypeHeader model={model} showStatus={showStatus} />
      <SceTournamentIdentityBlock model={model} density={density} />
      {showSchedule ? <SceTournamentScheduleRows model={model} fmtCfg={fmtCfg} density={density} /> : null}
      {locationLine ? <SceTournamentLocationRow locationLine={locationLine} density={density} /> : null}
    </div>
  );
}

function SceTournamentListRowIdentityContent({
  model,
  density,
}: {
  model: SceTournamentPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  return (
    <div className="min-w-0 space-y-1" data-sce-tournament-density={density} data-sce-tournament-list-row-identity>
      <SceTournamentTypeHeader model={model} showStatus={false} />
      <SceTournamentIdentityBlock model={model} density={density} listRow />
    </div>
  );
}

function SceTournamentCompactContent({
  model,
  fmtCfg,
  showStatus,
  showSchedule,
  showLocation,
}: {
  model: SceTournamentPresentationModel;
  fmtCfg: TenantFormatConfig;
  showStatus: boolean;
  showSchedule: boolean;
  showLocation: boolean;
}) {
  const scale = richScale("COMPACT");
  const locationLine = showLocation ? resolveTournamentLocationLine(model, "COMPACT") : undefined;
  const dateToken = formatCompactDateToken(model, fmtCfg);
  const timeLine = formatSessionTimeOnly(model, fmtCfg);

  return (
    <div className="min-w-0 space-y-1.5" data-sce-tournament-density="COMPACT">
      <SceTournamentTypeHeader model={model} showStatus={false} />
      <SceTournamentIdentityBlock model={model} density="COMPACT" />
      {showSchedule ? (
        <p
          className={cn(
            "inline-flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs font-medium tabular-nums",
            scale.scheduleTextClass,
          )}
          data-testid="sce-tournament-compact-date"
        >
          <Calendar className={scale.scheduleIconClass} aria-hidden />
          <span>{dateToken}</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <Clock className={scale.scheduleIconClass} aria-hidden />
          <span className="font-mono">{timeLine}</span>
        </p>
      ) : null}
      {locationLine ? (
        <SceTournamentLocationRow locationLine={locationLine} density="COMPACT" />
      ) : null}
      {showStatus && model.status?.label ? (
        <div className="flex pt-0.5" data-sce-tournament-region="status">
          <SceTournamentCardStatus status={model.status} />
        </div>
      ) : null}
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
  const showCrest = !narrow && Boolean(model.organiser.displayName?.trim());

  return (
    <div className="min-w-0 space-y-0.5" data-sce-tournament-density="MICRO">
      <p
        className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--sce-primary)_92%,var(--foreground)_8%)]"
        data-activity-type-pill="tournament-orange"
      >
        {model.typeLabel}
      </p>
      <div className="flex min-w-0 gap-1.5">
        {showCrest ? (
          <SceTournamentOrganiserCrest model={model} density="MICRO" narrowMicro={narrow} />
        ) : null}
        <div className="min-w-0 flex-1 space-y-0.5">
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
          <SceTournamentHauptteamLine
            model={model}
            density="MICRO"
            testId="sce-tournament-micro-hauptteam"
          />
        </div>
      </div>
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
          className="truncate text-[0.6875rem] text-[color-mix(in_srgb,var(--sce-info)_55%,var(--text-2)_45%)]"
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
  const listRow = surface === "list-row";
  const embed = surface === "detail-embed" || listRow;
  const showSchedule = !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const statusVisible = showStatus && isSceActivityDimensionVisible(density, "status");

  const href = linkToDetail ? model.route.consumeHref ?? model.route.manageHref : null;

  const richBounded =
    listRow
      ? "w-full max-w-none"
      : !embed && isSceTournamentRichCardDensity(density) && density !== "COMPACT"
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
    listRow && "shadow-none",
    richPadding,
    className,
  );

  let content: ReactNode;

  if (listRow) {
    content = <SceTournamentListRowIdentityContent model={model} density={density} />;
  } else if (surface === "detail-embed") {
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
    content = (
      <SceTournamentCompactContent
        model={model}
        fmtCfg={fmtCfg}
        showStatus={statusVisible}
        showSchedule={showSchedule}
        showLocation={showLocation}
      />
    );
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

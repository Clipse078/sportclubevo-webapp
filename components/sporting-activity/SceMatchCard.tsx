"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatFixtureDateLine,
  formatFixtureTime,
} from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { isSceActivityDimensionVisible } from "@/lib/sporting-activity-presentation/canonical/match-card-policy";
import type {
  SceActivityPresentationDensity,
  SceMatchPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityScheduleLine } from "@/lib/sporting-activity-presentation/format";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SceMatchCardStatus } from "./SceMatchCardStatus";
import { SceMatchCardResult } from "./SceMatchCardResult";

export type SceMatchCardSurface = "standalone" | "detail-embed" | "list-row";

export type SceMatchCardProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  /** When true (default), primary navigation uses canonical consume route. */
  linkToDetail?: boolean;
  /** Detail header embed — fixture/result/status only (schedule/location elsewhere). */
  surface?: SceMatchCardSurface;
  testId?: string;
};

function crestSizeForDensity(density: SceActivityPresentationDensity): ClubCrestVisualSize {
  switch (density) {
    case "HERO":
      return "detail";
    case "STANDARD":
      return "planner";
    case "COMPACT":
      return "management";
    case "MICRO":
      return "compact";
  }
}

function buildFixtureAccessibleLabel(model: SceMatchPresentationModel): string {
  return `${model.fixture.home.displayName} gegen ${model.fixture.away.displayName}`;
}

function scheduleIconClass(density: SceActivityPresentationDensity): string {
  return cn(
    "shrink-0 text-[var(--muted)]",
    density === "HERO" ? "h-4 w-4" : "h-3.5 w-3.5",
  );
}

function clubNameClassForDensity(density: SceActivityPresentationDensity): string {
  switch (density) {
    case "HERO":
      return "line-clamp-2 text-base font-semibold leading-snug";
    case "STANDARD":
      return "line-clamp-2 text-sm font-semibold leading-snug";
    case "COMPACT":
      return "line-clamp-2 text-[0.8125rem] font-medium leading-snug";
    case "MICRO":
      return "truncate text-[0.8125rem] font-medium";
  }
}

function SceMatchFixtureSeparator({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  if (model.result) {
    return (
      <SceMatchCardResult
        model={model}
        density={density}
        className={cn(
          density === "HERO" && "text-xl",
          density === "STANDARD" && "text-base",
          density === "COMPACT" && "text-sm",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 font-semibold uppercase tracking-wide text-[var(--muted)]",
        density === "HERO" ? "text-sm" : "text-xs",
      )}
      aria-hidden
      data-testid="sce-match-vs"
      data-sce-match-region="separator"
    >
      VS
    </span>
  );
}

function SceMatchStackedIdentityColumn({
  side,
  identity,
  density,
  showCrests,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  density: SceActivityPresentationDensity;
  showCrests: boolean;
}) {
  const crestSize = crestSizeForDensity(density);

  return (
    <div
      data-sce-match-side={side}
      data-sce-match-region={`${side}-identity`}
      className="flex min-w-0 flex-col items-center gap-1.5 text-center"
    >
      {showCrests ? (
        <div data-sce-match-region={`${side}-crest`}>
          <ClubCrest identity={identity} density={crestSize} decorative />
        </div>
      ) : null}
      <span
        className={cn("min-w-0 text-[var(--foreground)]", clubNameClassForDensity(density))}
        title={identity.displayName}
        data-sce-match-region={`${side}-name`}
      >
        {identity.displayName}
      </span>
    </div>
  );
}

function SceMatchStackedFixturePanel({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const fixtureLabel = buildFixtureAccessibleLabel(model);

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2",
        density === "HERO" ? "gap-y-2 py-1" : "gap-y-1",
      )}
      data-testid="sce-match-fixture"
      data-sce-match-region="fixture"
      aria-label={fixtureLabel}
    >
      <SceMatchStackedIdentityColumn
        side="home"
        identity={model.fixture.home}
        density={density}
        showCrests={showCrests}
      />
      <div
        className="flex items-center justify-center px-1"
        data-sce-match-region="center"
      >
        <SceMatchFixtureSeparator model={model} density={density} />
      </div>
      <SceMatchStackedIdentityColumn
        side="away"
        identity={model.fixture.away}
        density={density}
        showCrests={showCrests}
      />
    </div>
  );
}

function SceMatchInlineIdentitySide({
  side,
  identity,
  showCrests,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  showCrests: boolean;
}) {
  return (
    <div
      data-sce-match-side={side}
      data-sce-match-region={`${side}-identity`}
      className={cn(
        "flex min-w-0 max-w-[min(100%,12rem)] items-center gap-1.5",
        side === "away" && "flex-row-reverse text-right",
      )}
    >
      {showCrests ? (
        <div data-sce-match-region={`${side}-crest`}>
          <ClubCrest identity={identity} density="compact" decorative />
        </div>
      ) : null}
      <span
        className={cn("min-w-0 text-[var(--foreground)]", clubNameClassForDensity("MICRO"))}
        title={identity.displayName}
        data-sce-match-region={`${side}-name`}
      >
        {identity.displayName}
      </span>
    </div>
  );
}

function SceMatchScheduleIconRow({
  model,
  fmtCfg,
  density,
}: {
  model: SceMatchPresentationModel;
  fmtCfg: TenantFormatConfig;
  density: SceActivityPresentationDensity;
}) {
  const startAt = new Date(model.schedule.startAt);
  const iconClass = scheduleIconClass(density);
  const textClass =
    density === "HERO"
      ? "text-sm text-[var(--text-2)]"
      : "text-xs text-[var(--text-2)]";

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3"
      data-testid="sce-match-schedule"
      data-sce-match-region="schedule"
    >
      <span
        className={cn("inline-flex min-w-0 items-center gap-1.5", textClass)}
        data-testid="sce-match-schedule-date"
      >
        <Calendar className={iconClass} aria-hidden />
        <span className="truncate">{formatFixtureDateLine(startAt, fmtCfg)}</span>
      </span>
      <span
        className={cn("inline-flex shrink-0 items-center gap-1.5 font-mono tabular-nums", textClass)}
        data-testid="sce-match-schedule-time"
      >
        <Clock className={iconClass} aria-hidden />
        {formatFixtureTime(startAt, fmtCfg)}
      </span>
    </div>
  );
}

function SceMatchLocationRow({
  locationLine,
  density,
}: {
  locationLine: string;
  density: SceActivityPresentationDensity;
}) {
  const iconClass = scheduleIconClass(density);

  return (
    <div
      className="flex min-w-0 items-start gap-1.5 text-xs text-[var(--text-2)]"
      data-testid="sce-match-location"
      data-sce-match-region="location"
    >
      <MapPin className={cn(iconClass, "mt-0.5")} aria-hidden />
      <p className="min-w-0 line-clamp-2">{locationLine}</p>
    </div>
  );
}

function SceMatchRichCardContent({
  model,
  density,
  fmtCfg,
  showCompetition,
  showLocation,
  showSchedule,
  showStatus,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  showCompetition: boolean;
  showLocation: boolean;
  showSchedule: boolean;
  showStatus: boolean;
}) {
  const locationLine =
    showLocation && model.location
      ? formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })
      : undefined;
  const status = model.matchLifecycle ?? model.status;
  const hasMetaHeader =
    (showCompetition && model.competition?.label) || (showStatus && status?.label);

  return (
    <div
      className={cn(
        "min-w-0",
        density === "HERO" ? "space-y-4" : density === "COMPACT" ? "space-y-2" : "space-y-2.5",
      )}
    >
      {hasMetaHeader ? (
        <div
          className="flex min-w-0 items-start justify-between gap-3"
          data-sce-match-region="meta"
        >
          {showCompetition && model.competition?.label ? (
            <p
              className="min-w-0 line-clamp-2 text-xs text-[var(--muted)]"
              data-testid="sce-match-competition"
              data-sce-match-region="competition"
            >
              {model.competition.label}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {showStatus && status?.label ? (
            <div className="shrink-0" data-sce-match-region="status">
              <SceMatchCardStatus status={status} testId="sce-match-status" />
            </div>
          ) : null}
        </div>
      ) : null}

      <SceMatchStackedFixturePanel model={model} density={density} />

      {showSchedule ? (
        <SceMatchScheduleIconRow model={model} fmtCfg={fmtCfg} density={density} />
      ) : null}

      {locationLine ? (
        <SceMatchLocationRow locationLine={locationLine} density={density} />
      ) : null}
    </div>
  );
}

function SceMatchMicroContent({
  model,
  fmtCfg,
  showSchedule,
  showStatus,
}: {
  model: SceMatchPresentationModel;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  showStatus: boolean;
}) {
  const status = model.matchLifecycle ?? model.status;
  const showCrests = isSceActivityDimensionVisible("MICRO", "crests");
  const fixtureLabel = buildFixtureAccessibleLabel(model);
  const startAt = new Date(model.schedule.startAt);

  return (
    <div className="min-w-0 space-y-1.5">
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
        data-testid="sce-match-fixture"
        data-sce-match-region="fixture"
        aria-label={fixtureLabel}
      >
        <SceMatchInlineIdentitySide
          side="home"
          identity={model.fixture.home}
          showCrests={showCrests}
        />
        <SceMatchFixtureSeparator model={model} density="MICRO" />
        <SceMatchInlineIdentitySide
          side="away"
          identity={model.fixture.away}
          showCrests={showCrests}
        />
      </div>

      {showSchedule || (showStatus && status?.label) ? (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {showSchedule ? (
            <p
              className="min-w-0 truncate font-mono text-[0.75rem] tabular-nums text-[var(--text-2)]"
              data-testid="sce-match-schedule"
              data-sce-match-region="schedule"
            >
              {formatSportingActivityScheduleLine({
                startAt,
                endAt: model.schedule.endAt ? new Date(model.schedule.endAt) : null,
                allDay: model.schedule.allDay,
                fmtCfg,
              })}
            </p>
          ) : (
            <span />
          )}
          {showStatus && status?.label ? (
            <div className="shrink-0" data-sce-match-region="status">
              <SceMatchCardStatus status={status} testId="sce-match-status" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SceMatchCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = true,
  surface = "standalone",
  testId = "sce-match-card",
}: SceMatchCardProps) {
  const embed = surface === "detail-embed";
  const listRow = surface === "list-row";
  const showSchedule =
    !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const showStatus = isSceActivityDimensionVisible(density, "status");
  const showCompetition =
    !embed && isSceActivityDimensionVisible(density, "competitionOrResult");

  const href = linkToDetail ? model.route.consumeHref : null;

  const shellClass = cn(
    "relative min-w-0 w-full text-[var(--foreground)]",
    !listRow &&
      !embed &&
      "rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm",
    listRow && "bg-transparent",
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    !listRow && !embed && density === "HERO" && "p-4 sm:p-5",
    !listRow && !embed && density === "STANDARD" && "p-3.5 sm:p-4",
    !listRow && !embed && density === "COMPACT" && "p-3 sm:p-3.5",
    !listRow && !embed && density === "MICRO" && "p-2.5",
    className,
  );

  let content: ReactNode;

  if (embed) {
    content = (
      <div className="min-w-0 space-y-2">
        <SceMatchStackedFixturePanel model={model} density={density} />
        <div className="flex flex-wrap items-center gap-2">
          {showStatus && (model.matchLifecycle ?? model.status)?.label ? (
            <SceMatchCardStatus status={model.matchLifecycle ?? model.status!} />
          ) : null}
        </div>
      </div>
    );
  } else if (density === "MICRO") {
    content = (
      <SceMatchMicroContent
        model={model}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        showStatus={showStatus}
      />
    );
  } else {
    content = (
      <SceMatchRichCardContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        showCompetition={showCompetition}
        showLocation={showLocation}
        showSchedule={showSchedule}
        showStatus={showStatus}
      />
    );
  }

  if (!href) {
    return (
      <article
        className={shellClass}
        data-testid={testId}
        data-density={density}
        data-sce-match-card
        data-surface={surface}
        aria-label={buildFixtureAccessibleLabel(model)}
      >
        {content}
      </article>
    );
  }

  return (
    <article
      className={cn(shellClass, !listRow && "transition-colors hover:border-[var(--border-strong)]")}
      data-testid={testId}
      data-density={density}
      data-sce-match-card
      data-surface={surface}
    >
      <Link
        href={href}
        className={cn(
          "absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          listRow ? "rounded-none" : "rounded-xl",
        )}
        aria-label={`${buildFixtureAccessibleLabel(model)} — Details öffnen`}
        data-testid="sce-match-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { crestSizeForDensity, buildFixtureAccessibleLabel };

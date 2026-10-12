"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  formatFixtureDateLine,
  formatFixtureTime,
} from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { ClubIdentityDisplay } from "@/components/sporting-activity/ClubIdentityDisplay";
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
      return "compact";
    case "COMPACT":
    case "MICRO":
      return "compact";
  }
}

function clubIdentityDensityForMatchCard(
  density: SceActivityPresentationDensity,
): "compact" | "management" | "planner" {
  switch (density) {
    case "HERO":
      return "planner";
    case "STANDARD":
      return "compact";
    case "COMPACT":
    case "MICRO":
      return "compact";
  }
}

function buildFixtureAccessibleLabel(model: SceMatchPresentationModel): string {
  return `${model.fixture.home.displayName} gegen ${model.fixture.away.displayName}`;
}

function SceMatchFixtureSeparator({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  if (model.result) {
    return <SceMatchCardResult model={model} density={density} className="px-0.5" />;
  }

  return (
    <span
      className="shrink-0 px-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]"
      aria-hidden
      data-testid="sce-match-vs"
    >
      vs
    </span>
  );
}

function SceMatchInlineFixtureSide({
  side,
  identity,
  density,
  showCrests,
  align,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  density: SceActivityPresentationDensity;
  showCrests: boolean;
  align: "start" | "end";
}) {
  const crestSize = crestSizeForDensity(density);
  const nameClass =
    density === "HERO"
      ? "line-clamp-2 text-base font-semibold leading-snug"
      : "truncate text-sm font-medium";

  return (
    <div
      data-sce-match-side={side}
      className={cn(
        "flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1.5",
        align === "end" && "flex-row-reverse text-right",
      )}
    >
      {showCrests ? <ClubCrest identity={identity} density={crestSize} decorative /> : null}
      <span className={cn("min-w-0 text-[var(--foreground)]", nameClass)} title={identity.displayName}>
        {identity.displayName}
      </span>
    </div>
  );
}

function SceMatchFixtureCluster({
  model,
  density,
  layout,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  layout: "inline" | "stacked-hero";
}) {
  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const fixtureLabel = buildFixtureAccessibleLabel(model);

  if (density === "MICRO" || !showCrests) {
    return (
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] font-medium"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <SceMatchInlineFixtureSide
          side="home"
          identity={model.fixture.home}
          density={density}
          showCrests={false}
          align="start"
        />
        <SceMatchFixtureSeparator model={model} density={density} />
        <SceMatchInlineFixtureSide
          side="away"
          identity={model.fixture.away}
          density={density}
          showCrests={false}
          align="end"
        />
      </div>
    );
  }

  if (density === "COMPACT") {
    const identityDensity = clubIdentityDensityForMatchCard(density);
    return (
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <div data-sce-match-side="home" className="min-w-0 max-w-[min(100%,12rem)]">
          <ClubIdentityDisplay
            identity={model.fixture.home}
            density={identityDensity}
            className="min-w-0"
          />
        </div>
        <SceMatchFixtureSeparator model={model} density={density} />
        <div data-sce-match-side="away" className="min-w-0 max-w-[min(100%,12rem)]">
          <ClubIdentityDisplay
            identity={model.fixture.away}
            density={identityDensity}
            className="min-w-0 flex-row-reverse justify-end"
            nameClassName="text-right"
          />
        </div>
      </div>
    );
  }

  if (layout === "stacked-hero" && density === "HERO") {
    const crestSize = crestSizeForDensity("HERO");
    return (
      <div
        className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <div data-sce-match-side="home" className="flex min-w-0 max-w-[14rem] items-center gap-2">
          <ClubCrest identity={model.fixture.home} density={crestSize} decorative />
          <span className="min-w-0 line-clamp-2 text-base font-semibold leading-snug">
            {model.fixture.home.displayName}
          </span>
        </div>
        <SceMatchFixtureSeparator model={model} density={density} />
        <div
          data-sce-match-side="away"
          className="flex min-w-0 max-w-[14rem] flex-row-reverse items-center gap-2 text-right"
        >
          <ClubCrest identity={model.fixture.away} density={crestSize} decorative />
          <span className="min-w-0 line-clamp-2 text-base font-semibold leading-snug">
            {model.fixture.away.displayName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
      data-testid="sce-match-fixture"
      aria-label={fixtureLabel}
    >
      <SceMatchInlineFixtureSide
        side="home"
        identity={model.fixture.home}
        density={density}
        showCrests={showCrests}
        align="start"
      />
      <SceMatchFixtureSeparator model={model} density={density} />
      <SceMatchInlineFixtureSide
        side="away"
        identity={model.fixture.away}
        density={density}
        showCrests={showCrests}
        align="end"
      />
    </div>
  );
}

function SceMatchScheduleBlock({
  model,
  fmtCfg,
  density,
  variant,
}: {
  model: SceMatchPresentationModel;
  fmtCfg: TenantFormatConfig;
  density: SceActivityPresentationDensity;
  variant: "split" | "compact-line";
}) {
  const startAt = new Date(model.schedule.startAt);

  if (variant === "compact-line") {
    const line = formatSportingActivityScheduleLine({
      startAt,
      endAt: model.schedule.endAt ? new Date(model.schedule.endAt) : null,
      allDay: model.schedule.allDay,
      fmtCfg,
    });
    return (
      <p
        className={cn(
          "font-mono tabular-nums text-[var(--text-2)]",
          density === "MICRO" ? "text-[0.75rem]" : "text-[0.8125rem]",
        )}
        data-testid="sce-match-schedule"
      >
        {line}
      </p>
    );
  }

  return (
    <div className="min-w-0" data-testid="sce-match-schedule">
      <p
        className="text-sm font-semibold text-[var(--foreground)]"
        data-testid="sce-match-schedule-date"
      >
        {formatFixtureDateLine(startAt, fmtCfg)}
      </p>
      <p className="mt-0.5 text-sm text-[var(--text-2)]" data-testid="sce-match-schedule-time">
        {formatFixtureTime(startAt, fmtCfg)}
      </p>
    </div>
  );
}

function SceMatchStandardRowContent({
  model,
  density,
  fmtCfg,
  embed,
  showCompetition,
  showLocation,
  showSchedule,
  showStatus,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  embed: boolean;
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

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3",
        density === "STANDARD" &&
          "sm:grid-cols-[minmax(0,8.75rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,10.5rem)] lg:items-start lg:gap-5",
        density === "COMPACT" && "gap-2 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:items-start",
      )}
    >
      {showSchedule ? (
        <SceMatchScheduleBlock model={model} fmtCfg={fmtCfg} density={density} variant="split" />
      ) : null}

      <div className="min-w-0 space-y-1">
        <SceMatchFixtureCluster
          model={model}
          density={density}
          layout={density === "HERO" ? "stacked-hero" : "inline"}
        />
        {density === "COMPACT" && showStatus && status?.label ? (
          <SceMatchCardStatus status={status} testId="sce-match-status" />
        ) : null}
      </div>

      {(showCompetition && model.competition?.label) ||
      locationLine ||
      (density !== "COMPACT" && showStatus && status?.label) ? (
        <div className="min-w-0 space-y-0.5 text-xs text-[var(--text-2)] sm:col-span-2 lg:col-span-1 lg:col-start-3">
          {showStatus && status?.label && density !== "COMPACT" ? (
            <SceMatchCardStatus status={status} testId="sce-match-status" className="mb-0.5" />
          ) : null}
          {showCompetition && model.competition?.label ? (
            <p className="line-clamp-2 text-[var(--muted)]" data-testid="sce-match-competition">
              {model.competition.label}
            </p>
          ) : null}
          {locationLine ? (
            <p className="line-clamp-2" data-testid="sce-match-location">
              {locationLine}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SceMatchHeroContent({
  model,
  fmtCfg,
  embed,
  showCompetition,
  showLocation,
  showSchedule,
  showStatus,
}: {
  model: SceMatchPresentationModel;
  fmtCfg: TenantFormatConfig;
  embed: boolean;
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

  return (
    <div className="min-w-0 space-y-3">
      {(showCompetition && model.competition?.label) || (showStatus && status?.label) ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          {showCompetition && model.competition?.label ? (
            <p
              className="line-clamp-1 text-xs font-medium text-[var(--muted)]"
              data-testid="sce-match-competition"
            >
              {model.competition.label}
            </p>
          ) : (
            <span />
          )}
          {showStatus && status?.label ? (
            <SceMatchCardStatus status={status} testId="sce-match-status" />
          ) : null}
        </div>
      ) : null}

      <SceMatchFixtureCluster model={model} density="HERO" layout="stacked-hero" />

      {showSchedule || locationLine ? (
        <div className="space-y-1 text-center sm:text-left">
          {showSchedule ? (
            <SceMatchScheduleBlock model={model} fmtCfg={fmtCfg} density="HERO" variant="split" />
          ) : null}
          {locationLine ? (
            <p className="text-sm text-[var(--text-2)]" data-testid="sce-match-location">
              {locationLine}
            </p>
          ) : null}
        </div>
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

  return (
    <div className="min-w-0 space-y-1.5">
      <SceMatchFixtureCluster model={model} density="MICRO" layout="inline" />
      {showSchedule ? (
        <SceMatchScheduleBlock model={model} fmtCfg={fmtCfg} density="MICRO" variant="compact-line" />
      ) : null}
      {showStatus && status?.label ? (
        <div className="flex justify-end">
          <SceMatchCardStatus status={status} testId="sce-match-status" />
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
    "relative min-w-0 text-[var(--foreground)]",
    !listRow &&
      !embed &&
      "rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm",
    listRow && "bg-transparent",
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    !listRow && !embed && density === "HERO" && "p-4 sm:p-5",
    !listRow && !embed && density === "STANDARD" && "p-3 sm:p-3.5",
    !listRow && !embed && density === "COMPACT" && "p-2.5 sm:p-3",
    !listRow && !embed && density === "MICRO" && "p-2",
    className,
  );

  let content: ReactNode;

  if (embed) {
    content = (
      <div className="min-w-0 space-y-2">
        <SceMatchFixtureCluster model={model} density={density} layout="inline" />
        <div className="flex flex-wrap items-center gap-2">
          <SceMatchCardResult model={model} density={density} />
          {showStatus && (model.matchLifecycle ?? model.status)?.label ? (
            <SceMatchCardStatus status={model.matchLifecycle ?? model.status!} />
          ) : null}
        </div>
      </div>
    );
  } else if (density === "HERO") {
    content = (
      <SceMatchHeroContent
        model={model}
        fmtCfg={fmtCfg}
        embed={embed}
        showCompetition={showCompetition}
        showLocation={showLocation}
        showSchedule={showSchedule}
        showStatus={showStatus}
      />
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
  } else if (density === "STANDARD" || density === "COMPACT") {
    content = (
      <SceMatchStandardRowContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        embed={embed}
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

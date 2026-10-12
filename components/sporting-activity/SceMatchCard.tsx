"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import { ClubIdentityDisplay } from "@/components/sporting-activity/ClubIdentityDisplay";
import { MatchClubPair } from "@/components/sporting-activity/MatchClubPair";
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

export type SceMatchCardSurface = "standalone" | "detail-embed";

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
      return "management";
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
      return "management";
    case "COMPACT":
    case "MICRO":
      return "compact";
  }
}

function buildFixtureAccessibleLabel(model: SceMatchPresentationModel): string {
  return `${model.fixture.home.displayName} gegen ${model.fixture.away.displayName}`;
}

function SceMatchFixtureIdentity({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const identityDensity = clubIdentityDensityForMatchCard(density);
  const fixtureLabel = buildFixtureAccessibleLabel(model);

  if (density === "MICRO" || !showCrests) {
    return (
      <div
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 text-[0.8125rem] font-medium"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <span
          className="min-w-0 truncate text-left"
          data-sce-match-side="home"
          title={model.fixture.home.displayName}
        >
          {model.fixture.home.displayName}
        </span>
        <span
          className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--muted)]"
          aria-hidden
        >
          vs
        </span>
        <span
          className="min-w-0 truncate text-right"
          data-sce-match-side="away"
          title={model.fixture.away.displayName}
        >
          {model.fixture.away.displayName}
        </span>
      </div>
    );
  }

  if (density === "COMPACT") {
    return (
      <div
        className="min-w-0 space-y-1"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <div data-sce-match-side="home" className="min-w-0 justify-self-start">
            <ClubIdentityDisplay
              identity={model.fixture.home}
              density={identityDensity}
              className="min-w-0"
            />
          </div>
          <span
            className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-[var(--muted)]"
            aria-hidden
          >
            vs
          </span>
          <div data-sce-match-side="away" className="min-w-0 justify-self-end">
            <ClubIdentityDisplay
              identity={model.fixture.away}
              density={identityDensity}
              className="min-w-0 flex-row-reverse justify-end"
              nameClassName="text-right"
            />
          </div>
        </div>
      </div>
    );
  }

  if (density === "HERO") {
    const crestSize = crestSizeForDensity("HERO");
    return (
      <div
        className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-3"
        data-testid="sce-match-fixture"
        aria-label={fixtureLabel}
      >
        <div data-sce-match-side="home" className="flex min-w-0 items-center gap-2.5 justify-self-start">
          <ClubCrest identity={model.fixture.home} density={crestSize} decorative />
          <span className="min-w-0 line-clamp-2 text-base font-semibold leading-snug">
            {model.fixture.home.displayName}
          </span>
        </div>
        <span
          className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted)]"
          aria-hidden
        >
          vs
        </span>
        <div
          data-sce-match-side="away"
          className="flex min-w-0 flex-row-reverse items-center gap-2.5 justify-self-end text-right"
        >
          <ClubCrest identity={model.fixture.away} density={crestSize} decorative />
          <span className="min-w-0 line-clamp-2 text-base font-semibold leading-snug text-right">
            {model.fixture.away.displayName}
          </span>
        </div>
      </div>
    );
  }

  const pair = {
    homeClubIdentity: model.fixture.home,
    awayClubIdentity: model.fixture.away,
  };

  return (
    <div data-testid="sce-match-fixture" aria-label={fixtureLabel}>
      <MatchClubPair pair={pair} density={identityDensity} vsLabel="vs" />
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
  const showSchedule =
    !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const showStatus = isSceActivityDimensionVisible(density, "status");
  const showCompetition =
    !embed && isSceActivityDimensionVisible(density, "competitionOrResult");

  const scheduleLabel = showSchedule
    ? formatSportingActivityScheduleLine({
        startAt: new Date(model.schedule.startAt),
        endAt: model.schedule.endAt ? new Date(model.schedule.endAt) : null,
        allDay: model.schedule.allDay,
        fmtCfg,
      })
    : null;

  const locationLine =
    showLocation && model.location
      ? formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })
      : undefined;

  const status = model.matchLifecycle ?? model.status;
  const href = linkToDetail ? model.route.consumeHref : null;

  const shellClass = cn(
    "relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] shadow-sm",
    density === "HERO" && "p-4 sm:p-5",
    density === "STANDARD" && "p-3.5 sm:p-4",
    density === "COMPACT" && "p-2.5 sm:p-3",
    density === "MICRO" && "p-2",
    className,
  );

  const content = (
    <div className="min-w-0 space-y-2">
      {showCompetition && model.competition?.label ? (
        <p className="line-clamp-1 text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
          {model.competition.label}
        </p>
      ) : null}

      <SceMatchFixtureIdentity model={model} density={density} />

      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {scheduleLabel ? (
          <p
            className={cn(
              "font-mono tabular-nums text-[var(--text-2)]",
              density === "MICRO" ? "text-[0.75rem]" : "text-[0.8125rem]",
            )}
            data-testid="sce-match-schedule"
          >
            {scheduleLabel}
          </p>
        ) : null}

        <SceMatchCardResult model={model} density={density} />

        {showStatus && status?.label ? (
          <SceMatchCardStatus status={status} testId="sce-match-status" />
        ) : null}
      </div>

      {locationLine ? (
        <p
          className="line-clamp-2 text-[0.8125rem] text-[var(--text-2)]"
          data-testid="sce-match-location"
        >
          {locationLine}
        </p>
      ) : null}
    </div>
  );

  if (!href) {
    return (
      <article
        className={shellClass}
        data-testid={testId}
        data-density={density}
        data-sce-match-card
        aria-label={buildFixtureAccessibleLabel(model)}
      >
        {content}
      </article>
    );
  }

  return (
    <article
      className={cn(shellClass, "transition-colors hover:border-[var(--border-strong)]")}
      data-testid={testId}
      data-density={density}
      data-sce-match-card
    >
      <Link
        href={href}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        aria-label={`${buildFixtureAccessibleLabel(model)} — Details öffnen`}
        data-testid="sce-match-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { crestSizeForDensity, buildFixtureAccessibleLabel };

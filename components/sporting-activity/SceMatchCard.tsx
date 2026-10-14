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
import { ActivityTypePill } from "./ActivityTypePill";
import { ActivityContextBadge } from "./ActivityContextBadge";
import { SceMatchCardStatus } from "./SceMatchCardStatus";
import { SceMatchCardResult } from "./SceMatchCardResult";
import { resolveSceMatchResultPerspectiveStatus } from "@/lib/sporting-activity-presentation/canonical/match-context-badges";
import { SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";
import {
  isSceMatchRichCardDensity,
  SCE_MATCH_CARD_SHELL_CLASS,
  sceMatchCardBoundedWidthClass,
  sceMatchCenterTypographyScale,
  sceMatchCrestVisualSizeForDensity,
  sceMatchRichDensityScale,
} from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import type { SceMatchContextBadge } from "@/lib/sporting-activity-presentation/canonical/types";
import {
  SCE_ACTIVITY_LIST_ROW_SCALE,
  sceActivityListRowTypePillClass,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";

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
  return sceMatchCrestVisualSizeForDensity(density);
}

function buildFixtureAccessibleLabel(model: SceMatchPresentationModel): string {
  return `${model.fixture.home.displayName} gegen ${model.fixture.away.displayName}`;
}

function richScale(density: SceActivityPresentationDensity) {
  return isSceMatchRichCardDensity(density)
    ? sceMatchRichDensityScale(density)
    : sceMatchRichDensityScale("COMPACT");
}

function clubNameClassForDensity(density: SceActivityPresentationDensity): string {
  if (density === "MICRO") {
    return "truncate text-[0.8125rem] font-medium";
  }
  return richScale(density).clubNameClass;
}

function isCompletedWithoutResult(model: SceMatchPresentationModel): boolean {
  if (model.result) {
    return false;
  }
  const lifecycle = model.matchLifecycle ?? model.status;
  return lifecycle?.semantic === "completed";
}

function SceMatchFixtureSeparator({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  const centerScale = sceMatchCenterTypographyScale(density);

  if (model.result) {
    return (
      <SceMatchCardResult
        model={model}
        density={density}
        className={centerScale.resultTextClass}
      />
    );
  }

  if (isCompletedWithoutResult(model)) {
    return (
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums text-[var(--muted)]",
          centerScale.completedMissingResultClass,
        )}
        data-testid="sce-match-result"
        aria-label="Ergebnis nicht verfügbar"
      >
        –
      </span>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 uppercase text-[var(--muted)]",
        centerScale.vsTextClass,
      )}
      aria-hidden
      data-testid="sce-match-vs"
      data-sce-match-region="separator"
      data-sce-match-center
    >
      VS
    </span>
  );
}

function contextBadgeTestId(badge: SceMatchContextBadge): string {
  if (badge.kind === "tenant-side") {
    return badge.label === "Heim" ? "sce-match-context-heim" : "sce-match-context-auswaerts";
  }
  return "sce-match-context-perspective";
}

function SceMatchContextBadges({
  badges,
}: {
  badges: SceMatchContextBadge[];
}) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1"
      data-sce-match-region="context"
    >
      {badges.map((badge) => {
        if (badge.kind === "tenant-side") {
          return (
            <ActivityContextBadge
              key={`${badge.kind}-${badge.label}`}
              label={badge.label}
              data-testid={contextBadgeTestId(badge)}
            />
          );
        }

        const perspective =
          badge.label === "Sieg"
            ? "WON"
            : badge.label === "Niederlage"
              ? "LOST"
              : badge.label === "Unentschieden"
                ? "DRAW"
                : "UNKNOWN";
        const status = resolveSceMatchResultPerspectiveStatus(perspective);
        if (!status) {
          return null;
        }

        return (
          <SceMatchCardStatus
            key={`${badge.kind}-${badge.label}`}
            status={status}
            testId={contextBadgeTestId(badge)}
          />
        );
      })}
    </div>
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
      className={cn(
        "flex min-w-0 flex-col items-center text-center",
        richScale(density).identityStackGapClass,
      )}
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

  const scale = richScale(density);

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center py-1",
        scale.fixtureGridGapXClass,
        scale.fixtureGapYClass,
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
        data-sce-match-center
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
  listRow = false,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  showCrests: boolean;
  listRow?: boolean;
}) {
  const nameClass = listRow
    ? SCE_ACTIVITY_LIST_ROW_SCALE.fixtureClubNameClass
    : cn("min-w-0 text-[var(--foreground)]", clubNameClassForDensity("MICRO"));

  return (
    <div
      data-sce-match-side={side}
      data-sce-match-region={`${side}-identity`}
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        listRow ? "max-w-none" : "max-w-[min(100%,12rem)]",
        side === "away" && "flex-row-reverse justify-self-end text-right",
      )}
    >
      {showCrests ? (
        <div data-sce-match-region={`${side}-crest`}>
          <ClubCrest
            identity={identity}
            density="compact"
            decorative
            className={listRow ? SCE_ACTIVITY_LIST_ROW_SCALE.crestBoundsClass : undefined}
          />
        </div>
      ) : null}
      <span className={nameClass} title={identity.displayName} data-sce-match-region={`${side}-name`}>
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
  const scale = richScale(density);
  const iconClass = scale.scheduleIconClass;
  const textClass = scale.scheduleTextClass;

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3"
      data-testid="sce-match-schedule"
      data-sce-match-region="schedule"
      data-sce-match-schedule
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
  const iconClass = richScale(density).locationIconClass;

  return (
    <div
      className={cn("flex min-w-0 items-start gap-1.5", richScale(density).locationTextClass)}
      data-testid="sce-match-location"
      data-sce-match-region="location"
      data-sce-match-location
    >
      <MapPin className={cn(iconClass, "mt-0.5")} aria-hidden />
      <p className="min-w-0 line-clamp-2">{locationLine}</p>
    </div>
  );
}

function resolveMatchTenantSideBadge(
  badges: SceMatchContextBadge[] | undefined,
): SceMatchContextBadge | undefined {
  return badges?.find((badge) => badge.kind === "tenant-side");
}

function SceMatchTypeHeader({
  model,
  showStatus,
  listRow = false,
}: {
  model: SceMatchPresentationModel;
  showStatus: boolean;
  listRow?: boolean;
}) {
  const status = model.matchLifecycle ?? model.status;
  const contextBadges = listRow
    ? (model.contextBadges ?? []).filter((badge) => badge.kind !== "tenant-side")
    : (model.contextBadges ?? []);
  const hasTrailingMeta =
    contextBadges.length > 0 || (showStatus && status?.label);

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-2",
        listRow && SCE_ACTIVITY_LIST_ROW_SCALE.metaRowClass,
      )}
      data-sce-match-region="meta"
      data-sce-match-header
    >
      <ActivityTypePill
        activityKind="MATCH"
        label={model.typeLabel}
        className={cn("shrink-0", listRow && sceActivityListRowTypePillClass())}
      />
      {hasTrailingMeta ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {contextBadges.length > 0 ? (
            <SceMatchContextBadges badges={contextBadges} />
          ) : null}
          {showStatus && status?.label ? (
            <div data-sce-match-region="status">
              <SceMatchCardStatus status={status} testId="sce-match-status" />
            </div>
          ) : null}
        </div>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </div>
  );
}

function SceMatchListRowIdentityContent({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const tenantSide = resolveMatchTenantSideBadge(model.contextBadges);

  return (
    <div
      className={cn("min-w-0", SCE_ACTIVITY_LIST_ROW_SCALE.identityStackClass)}
      data-sce-match-density={density}
      data-sce-match-list-row-identity
    >
      <SceMatchTypeHeader model={model} showStatus={false} listRow />
      <div
        className={cn(SCE_ACTIVITY_LIST_ROW_SCALE.fixtureGridClass, tenantSide && "gap-y-1")}
        data-testid="sce-match-fixture"
        data-sce-match-region="fixture"
        aria-label={buildFixtureAccessibleLabel(model)}
      >
        {tenantSide ? (
          <div
            className="col-span-full flex min-w-0 items-center"
            data-sce-match-region="tenant-side-marker"
          >
            <ActivityContextBadge
              label={tenantSide.label}
              data-testid={contextBadgeTestId(tenantSide)}
            />
          </div>
        ) : null}
        <SceMatchInlineIdentitySide
          side="home"
          identity={model.fixture.home}
          showCrests={showCrests}
          listRow
        />
        <div className="flex items-center justify-center px-0.5" data-sce-match-center>
          <span
            className={SCE_ACTIVITY_LIST_ROW_SCALE.fixtureVsClass}
            aria-hidden
            data-testid="sce-match-vs"
            data-sce-match-region="separator"
          >
            VS
          </span>
        </div>
        <SceMatchInlineIdentitySide
          side="away"
          identity={model.fixture.away}
          showCrests={showCrests}
          listRow
        />
      </div>
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
  const scale = richScale(density);

  return (
    <div className={cn("min-w-0", scale.contentSpaceYClass)}>
      <SceMatchTypeHeader model={model} showStatus={showStatus} />

      {showCompetition && model.competition?.label ? (
        <p
          className={cn("min-w-0", scale.competitionTextClass)}
          data-testid="sce-match-competition"
          data-sce-match-region="competition"
        >
          {model.competition.label}
        </p>
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
    <div className="min-w-0 space-y-1.5" data-sce-match-density="MICRO">
      <ActivityTypePill activityKind="MATCH" label={model.typeLabel} className="shrink-0" />
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
              className={cn(
                "min-w-0 truncate font-mono text-[0.75rem] tabular-nums",
                SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
              )}
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
  const listRow = surface === "list-row";
  const embed = surface === "detail-embed" || listRow;
  const showSchedule =
    !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const showStatus = isSceActivityDimensionVisible(density, "status");
  const showCompetition =
    !embed && isSceActivityDimensionVisible(density, "competitionOrResult");

  const href = linkToDetail ? model.route.consumeHref : null;

  const richBounded =
    listRow
      ? "w-full max-w-none"
      : !embed && isSceMatchRichCardDensity(density)
        ? sceMatchCardBoundedWidthClass(density)
        : !embed
          ? "w-full max-w-sm"
          : "";
  const richPadding =
    !embed && isSceMatchRichCardDensity(density)
      ? sceMatchRichDensityScale(density).shellPaddingClass
      : !embed && density === "MICRO"
        ? "p-2.5"
        : "";

  const shellClass = cn(
    "relative min-w-0 text-[var(--foreground)]",
    richBounded,
    !embed && SCE_MATCH_CARD_SHELL_CLASS,
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    listRow && "shadow-none",
    richPadding,
    className,
  );

  let content: ReactNode;

  if (listRow) {
    content = <SceMatchListRowIdentityContent model={model} density={density} />;
  } else if (surface === "detail-embed") {
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
        data-sce-match-density={density}
        data-surface={surface}
        aria-label={buildFixtureAccessibleLabel(model)}
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
      data-sce-match-card
      data-sce-match-density={density}
      data-surface={surface}
    >
      <Link
        href={href}
        className={cn(
          "absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        )}
        aria-label={`${buildFixtureAccessibleLabel(model)} — Details öffnen`}
        data-testid="sce-match-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { crestSizeForDensity, buildFixtureAccessibleLabel };

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
import { SceMatchScorePresentation } from "./SceMatchScorePresentation";
import { SceMatchFixtureReferenceLayout } from "./SceMatchFixtureReferenceLayout";
import { resolveSceMatchResultPerspectiveStatus } from "@/lib/sporting-activity-presentation/canonical/match-context-badges";
import {
  SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";
import { sceActivityCardRegionClass } from "@/lib/design-system/sce-activity-card-layout-contract";
import { SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-shell-contract";
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
import {
  SceActivityListRowLocationMeta,
  SceActivityListRowOperationalMetaRow,
  SceActivityListRowOrganizationalContext,
  SceActivityListRowTimeMeta,
} from "./SceActivityListRowOperationalMeta";
import { SceMatchStackedFixtureIdentity } from "./SceMatchStackedFixtureIdentity";
import { SceTeamName } from "@/components/design-system/typography";
import { sceTeamNameClassName } from "@/lib/design-system/sce-team-name-typography";
export type SceMatchCardSurface = "standalone" | "detail-embed" | "list-row";

export type SceMatchListRowPresentation =
  | "default"
  | "programme-fixture"
  | "programme-personal"
  | "dashboard-opponent";

export type SceMatchCardProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  /** When true (default), primary navigation uses canonical consume route. */
  linkToDetail?: boolean;
  /** Detail header embed — fixture/result/status only (schedule/location elsewhere). */
  surface?: SceMatchCardSurface;
  /** Programme Liste — richer horizontal fixture composition (still list-row surface). */
  listRowPresentation?: SceMatchListRowPresentation;
  /** PERSON / TEAM programme scope — opponent identity for dashboard agenda rows. */
  scopeTeamId?: string | null;
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
    return sceTeamNameClassName({ density: "MICRO", lineClamp: 1, truncate: true });
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
      <SceMatchScorePresentation
        model={model}
        density={density}
        className={centerScale.resultTextClass}
        presentation="legacy-inline"
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

function SceMatchStackedFixturePanel({
  model,
  density,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  return (
    <SceMatchStackedFixtureIdentity
      home={{ identity: model.fixture.home }}
      away={{ identity: model.fixture.away }}
      density={density}
      ariaLabel={buildFixtureAccessibleLabel(model)}
      center={<SceMatchFixtureSeparator model={model} density={density} />}
    />
  );
}

function buildProgrammeMatchOrganizationalContextLabel(
  model: Pick<SceMatchPresentationModel, "teamContext" | "competition">,
): string | undefined {
  const parts = [
    model.teamContext?.name?.trim(),
    model.competition?.label?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function SceMatchInlineIdentitySide({
  side,
  identity,
  showCrests,
  listRow = false,
  microListCrest = false,
  programmeFixture = false,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  showCrests: boolean;
  listRow?: boolean;
  /** MICRO density shares list-row crest bounds (planner list presentation). */
  microListCrest?: boolean;
  programmeFixture?: boolean;
}) {
  const nameClass = programmeFixture
    ? cn(
        sceTeamNameClassName({ density: "MICRO", lineClamp: 2, truncate: true }),
        "leading-snug",
        SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
      )
    : listRow
      ? SCE_ACTIVITY_LIST_ROW_SCALE.fixtureClubNameClass
      : cn("min-w-0 text-[var(--foreground)]", clubNameClassForDensity("MICRO"));

  const useMicroCrestBounds = listRow || microListCrest;
  const crestBoundsClass = programmeFixture
    ? SCE_ACTIVITY_LIST_ROW_SCALE.programmeMatchCrestBoundsClass
    : useMicroCrestBounds
      ? SCE_ACTIVITY_LIST_ROW_SCALE.crestBoundsClass
      : undefined;

  const crestNode = showCrests ? (
    <div data-sce-match-region={`${side}-crest`} className="shrink-0">
      <ClubCrest
        identity={identity}
        density={programmeFixture ? "management" : "compact"}
        decorative
        className={crestBoundsClass}
      />
    </div>
  ) : null;

  const nameNode = (
    <SceTeamName
      as="span"
      className={nameClass}
      title={identity.displayName}
      truncate
      lineClamp={programmeFixture ? 2 : 1}
      density="MICRO"
      data-sce-match-region={`${side}-name`}
    >
      {identity.displayName}
    </SceTeamName>
  );

  return (
    <div
      data-sce-match-side={side}
      data-sce-match-region={`${side}-identity`}
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        programmeFixture
          ? side === "home"
            ? SCE_ACTIVITY_LIST_ROW_SCALE.programmeFixtureSideHomeClass
            : SCE_ACTIVITY_LIST_ROW_SCALE.programmeFixtureSideAwayClass
          : cn(
              listRow ? "max-w-none" : "max-w-[min(100%,12rem)]",
              side === "away" && "flex-row-reverse justify-self-end text-right",
            ),
      )}
    >
      {programmeFixture ? (
        side === "home" ? (
          <>
            {nameNode}
            {crestNode}
          </>
        ) : (
          <>
            {crestNode}
            {nameNode}
          </>
        )
      ) : (
        <>
          {crestNode}
          {nameNode}
        </>
      )}
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
      className={cn(sceActivityCardRegionClass("schedule"), "flex min-w-0 items-center justify-between gap-3")}
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
      className={cn(
        sceActivityCardRegionClass("location"),
        "flex min-w-0 items-start gap-1.5",
        richScale(density).locationTextClass,
      )}
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
        sceActivityCardRegionClass("header"),
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
  fmtCfg,
  listRowPresentation = "default",
  scopeTeamId,
}: {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  listRowPresentation?: SceMatchListRowPresentation;
  scopeTeamId?: string | null;
}) {
  if (listRowPresentation === "dashboard-opponent") {
    return SceMatchListRowIdentityContent({
      model,
      density,
      fmtCfg,
      listRowPresentation: "programme-fixture",
      scopeTeamId,
    });
  }

  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const tenantSide = resolveMatchTenantSideBadge(model.contextBadges);
  const tenantSideAccessibleLabel =
    tenantSide?.label === "Heim"
      ? "Heimspiel"
      : tenantSide?.label === "Auswärts"
        ? "Auswärtsspiel"
        : tenantSide?.label;
  const programmeFixture =
    listRowPresentation === "programme-fixture" || listRowPresentation === "programme-personal";
  const externalReferenceDateTile = listRowPresentation === "programme-personal";
  const lifecycle = model.matchLifecycle ?? model.status;
  const showCancelledStatus =
    lifecycle?.semantic === "cancelled" ||
    lifecycle?.semantic === "warning" ||
    lifecycle?.domain === "postponed" ||
    lifecycle?.domain === "cancelled";
  const teamContextLabel = programmeFixture
    ? buildProgrammeMatchOrganizationalContextLabel(model)
    : undefined;

  if (programmeFixture) {
    return (
      <div
        className="min-w-0 w-full max-w-full space-y-1"
        data-sce-match-density={density}
        data-sce-match-list-row-identity
        data-sce-match-list-row-presentation={listRowPresentation}
      >
        <span className="sr-only">{model.typeLabel}</span>
        {tenantSideAccessibleLabel ? (
          <span className="sr-only">{tenantSideAccessibleLabel}</span>
        ) : null}
        <SceMatchFixtureReferenceLayout
          model={model}
          density={density}
          fmtCfg={fmtCfg}
          fixtureLabel={buildFixtureAccessibleLabel(model)}
          showStatus={showCancelledStatus}
          teamContextLabel={teamContextLabel}
          showDateTile={!externalReferenceDateTile}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("min-w-0 w-full max-w-full", SCE_ACTIVITY_LIST_ROW_SCALE.identityStackClass)}
      data-sce-match-density={density}
      data-sce-match-list-row-identity
      data-sce-match-list-row-presentation={listRowPresentation}
    >
      <SceMatchTypeHeader model={model} showStatus={showCancelledStatus} listRow />
      {tenantSideAccessibleLabel ? (
        <span className="sr-only">{tenantSideAccessibleLabel}</span>
      ) : null}
      <div
        className={SCE_ACTIVITY_LIST_ROW_SCALE.fixtureGridClass}
        data-testid="sce-match-fixture"
        data-sce-match-region="fixture"
        aria-label={buildFixtureAccessibleLabel(model)}
      >
        <SceMatchInlineIdentitySide
          side="home"
          identity={model.fixture.home}
          showCrests={showCrests}
          listRow
        />
        <div
          className="flex min-w-[2.75rem] flex-col items-center justify-center px-0.5 text-center"
          data-sce-match-center
          data-sce-match-region="center"
        >
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
  const startAt = new Date(model.schedule.startAt);
  const kickoffLabel = model.schedule.allDay ? undefined : formatFixtureTime(startAt, fmtCfg);
  const teamContextLabel = buildProgrammeMatchOrganizationalContextLabel(model);
  const status = model.matchLifecycle ?? model.status;
  const contextBadges = model.contextBadges ?? [];

  return (
    <div className="min-w-0">
      <SceMatchFixtureReferenceLayout
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        fixtureLabel={buildFixtureAccessibleLabel(model)}
        showTypePill
        forceCompetitionLine={showCompetition}
        showStatus={showStatus && Boolean(status?.label)}
        teamContextLabel={
          showCompetition || teamContextLabel ? teamContextLabel : undefined
        }
        trailingMeta={
          contextBadges.length > 0 ? <SceMatchContextBadges badges={contextBadges} /> : undefined
        }
        center={
          <SceMatchScorePresentation
            model={model}
            density={density}
            kickoffLabel={kickoffLabel}
          />
        }
      />
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
          microListCrest
        />
        <SceMatchFixtureSeparator model={model} density="MICRO" />
        <SceMatchInlineIdentitySide
          side="away"
          identity={model.fixture.away}
          showCrests={showCrests}
          microListCrest
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
  listRowPresentation = "default",
  scopeTeamId,
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
    content = (
      <SceMatchListRowIdentityContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        listRowPresentation={listRowPresentation}
        scopeTeamId={scopeTeamId}
      />
    );
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
        data-sce-activity-card
        data-sce-activity-category="MATCH"
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
      className={cn(shellClass, !embed && SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS)}
      data-testid={testId}
      data-density={density}
      data-sce-match-card
      data-sce-activity-card
      data-sce-activity-category="MATCH"
      data-sce-match-density={density}
      data-surface={surface}
    >
      <Link
        href={href}
        className={cn(
          "absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
        )}
        aria-label={`${buildFixtureAccessibleLabel(model)} — Details öffnen`}
        data-testid="sce-match-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { crestSizeForDensity, buildFixtureAccessibleLabel };

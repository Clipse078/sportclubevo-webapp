"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import { SceDateTile } from "@/components/design-system/date";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { SceTeamName } from "@/components/design-system/typography";
import { sceTeamNameClassName } from "@/lib/design-system/sce-team-name-typography";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import { SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";
import { isSceActivityDimensionVisible } from "@/lib/sporting-activity-presentation/canonical/match-card-policy";
import type {
  SceActivityPresentationDensity,
  SceMatchPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { ActivityTypePill } from "./ActivityTypePill";
import { SceMatchCardStatus } from "./SceMatchCardStatus";
import { SceMatchScorePresentation } from "./SceMatchScorePresentation";

export type SceMatchFixtureReferenceLayoutProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  fixtureLabel: string;
  showStatus?: boolean;
  teamContextLabel?: string;
  center?: ReactNode;
  trailingMeta?: ReactNode;
  showTypePill?: boolean;
  forceCompetitionLine?: boolean;
  /** When false, date tile is omitted (caller renders external {@link SceDateTile}). */
  showDateTile?: boolean;
};

function ReferenceFixtureSide({
  side,
  identity,
  showCrests,
}: {
  side: "home" | "away";
  identity: SceMatchPresentationModel["fixture"]["home"];
  showCrests: boolean;
}) {
  const nameClass = cn(
    sceTeamNameClassName({ density: "STANDARD", lineClamp: 2, truncate: false }),
    "min-w-0 break-words leading-snug",
    SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS,
  );

  const crestNode = showCrests ? (
    <div data-sce-match-region={`${side}-crest`} className="shrink-0">
      <ClubCrest
        identity={identity}
        density="management"
        decorative
        className={SCE_ACTIVITY_REFERENCE_LAYOUT.programmeMatchCrestBoundsClass}
      />
    </div>
  ) : null;

  const nameNode = (
    <SceTeamName
      as="span"
      className={nameClass}
      title={identity.displayName}
      truncate={false}
      lineClamp={2}
      density="STANDARD"
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
        "min-w-0",
        side === "home"
          ? SCE_ACTIVITY_REFERENCE_LAYOUT.programmeFixtureSideHomeClass
          : SCE_ACTIVITY_REFERENCE_LAYOUT.programmeFixtureSideAwayClass,
      )}
    >
      {side === "home" ? (
        <>
          {nameNode}
          {crestNode}
        </>
      ) : (
        <>
          {crestNode}
          {nameNode}
        </>
      )}
    </div>
  );
}

export function SceMatchFixtureReferenceLayout({
  model,
  density,
  fmtCfg,
  fixtureLabel,
  showStatus = false,
  teamContextLabel,
  center,
  trailingMeta,
  showTypePill = false,
  forceCompetitionLine = false,
  showDateTile = true,
}: SceMatchFixtureReferenceLayoutProps) {
  const startAt = new Date(model.schedule.startAt);
  const showCrests = isSceActivityDimensionVisible(density, "crests");
  const locationLine = model.location
    ? formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })
    : undefined;
  const lifecycle = model.matchLifecycle ?? model.status;
  const kickoffLabel = model.schedule.allDay ? undefined : formatFixtureTime(startAt, fmtCfg);

  const centerNode =
    center ?? (
      <SceMatchScorePresentation
        model={model}
        density={density}
        kickoffLabel={kickoffLabel}
      />
    );

  const showCompetitionLine =
    Boolean(model.competition?.label) &&
    (forceCompetitionLine ||
      !teamContextLabel ||
      !teamContextLabel.includes(model.competition!.label!));

  const fixtureBand = (
    <div
      className={SCE_ACTIVITY_REFERENCE_LAYOUT.fixtureGridClass}
      data-testid="sce-match-fixture"
      data-sce-match-region="fixture"
      data-sce-match-programme-fixture={showDateTile ? "reference-split" : "planner-liste"}
      aria-label={fixtureLabel}
    >
      <ReferenceFixtureSide side="home" identity={model.fixture.home} showCrests={showCrests} />
      <div
        className="flex min-w-[3.25rem] items-center justify-center px-0.5 sm:min-w-[3.5rem]"
        data-sce-match-center
        data-sce-match-region="center"
      >
        {centerNode}
      </div>
      <ReferenceFixtureSide side="away" identity={model.fixture.away} showCrests={showCrests} />
    </div>
  );

  const hasReferenceMeta =
    showDateTile ||
    showTypePill ||
    Boolean(teamContextLabel) ||
    showCompetitionLine ||
    Boolean(locationLine) ||
    (showStatus && Boolean(lifecycle?.label)) ||
    Boolean(trailingMeta);

  const secondaryMeta = hasReferenceMeta ? (
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
          showDateTile ? "flex-col items-stretch gap-1" : SCE_ACTIVITY_REFERENCE_LAYOUT.plannerListeMatchMetaRowClass,
        )}
        data-sce-match-region="reference-meta"
        data-sce-activity-card-region="schedule"
      >
        {showTypePill ? (
          <div data-sce-match-header className="pb-0.5">
            <ActivityTypePill activityKind="MATCH" label={model.typeLabel} className="shrink-0" />
          </div>
        ) : null}
        {showDateTile ? (
          <SceDateTile
            value={startAt}
            fmtCfg={fmtCfg}
            size="compact"
            testId="sce-match-reference-date"
            decorative
          />
        ) : null}
        {teamContextLabel ? (
          <p
            className={SCE_ACTIVITY_REFERENCE_LAYOUT.teamContextClass}
            data-testid="sce-match-list-row-team-context"
          >
            {teamContextLabel}
          </p>
        ) : null}
        {showCompetitionLine ? (
          <p className={SCE_ACTIVITY_REFERENCE_LAYOUT.metaLineClass} data-testid="sce-match-competition">
            {model.competition!.label}
          </p>
        ) : null}
        {locationLine ? (
          <p
            className={cn(
              "flex min-w-0 items-start gap-1.5",
              SCE_ACTIVITY_REFERENCE_LAYOUT.metaLocationClass,
            )}
            data-testid="sce-match-location"
            data-sce-match-region="location"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 line-clamp-2 break-words">{locationLine}</span>
          </p>
        ) : null}
        {showStatus && lifecycle?.label ? (
          <div className={showDateTile ? "pt-0.5" : undefined} data-sce-match-region="status">
            <SceMatchCardStatus status={lifecycle} testId="sce-match-status" />
          </div>
        ) : null}
        {trailingMeta ? (
          <div className="flex flex-wrap items-center gap-1" data-sce-match-region="context">
            {trailingMeta}
          </div>
        ) : null}
      </div>
    ) : null;

  if (!showDateTile) {
    return (
      <div
        className={SCE_ACTIVITY_REFERENCE_LAYOUT.plannerListeMatchRootClass}
        data-sce-match-reference-layout
        data-sce-programme-card-contract="reference-row"
        data-sce-activity-card-layout="horizontal-full-width"
        data-sce-planner-liste-match-row
      >
        <div className={SCE_ACTIVITY_REFERENCE_LAYOUT.matchupColumnClass}>{fixtureBand}</div>
        {secondaryMeta}
      </div>
    );
  }

  return (
    <div
      className={SCE_ACTIVITY_REFERENCE_LAYOUT.rootClass}
      data-sce-match-reference-layout
      data-sce-programme-card-contract="reference-split"
      data-sce-activity-card-layout="horizontal-full-width"
    >
      <aside
        className={SCE_ACTIVITY_REFERENCE_LAYOUT.metaColumnClass}
        data-sce-match-region="reference-meta"
        data-sce-activity-card-region="schedule"
      >
        {secondaryMeta}
      </aside>

      <div className={SCE_ACTIVITY_REFERENCE_LAYOUT.matchupColumnClass}>{fixtureBand}</div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatFixtureDateLine,
  formatFixtureTime,
} from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
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
}: SceMatchFixtureReferenceLayoutProps) {
  const startAt = new Date(model.schedule.startAt);
  const dateLine = formatFixtureDateLine(startAt, fmtCfg);
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
        {showTypePill ? (
          <div data-sce-match-header className="pb-0.5">
            <ActivityTypePill activityKind="MATCH" label={model.typeLabel} className="shrink-0" />
          </div>
        ) : null}
        <p className={SCE_ACTIVITY_REFERENCE_LAYOUT.datePrimaryClass} data-testid="sce-match-reference-date">
          {dateLine}
        </p>
        {teamContextLabel ? (
          <p
            className={SCE_ACTIVITY_REFERENCE_LAYOUT.teamContextClass}
            data-testid="sce-match-list-row-team-context"
          >
            {teamContextLabel}
          </p>
        ) : null}
        {model.competition?.label &&
        (forceCompetitionLine ||
          !teamContextLabel ||
          !teamContextLabel.includes(model.competition.label)) ? (
          <p className={SCE_ACTIVITY_REFERENCE_LAYOUT.metaLineClass} data-testid="sce-match-competition">
            {model.competition.label}
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
            <span className="min-w-0 line-clamp-2">{locationLine}</span>
          </p>
        ) : null}
        {showStatus && lifecycle?.label ? (
          <div className="pt-0.5" data-sce-match-region="status">
            <SceMatchCardStatus status={lifecycle} testId="sce-match-status" />
          </div>
        ) : null}
        {trailingMeta ? (
          <div className="flex flex-wrap items-center gap-1 pt-0.5" data-sce-match-region="context">
            {trailingMeta}
          </div>
        ) : null}
      </aside>

      <div className={SCE_ACTIVITY_REFERENCE_LAYOUT.matchupColumnClass}>
        <div
          className={SCE_ACTIVITY_REFERENCE_LAYOUT.fixtureGridClass}
          data-testid="sce-match-fixture"
          data-sce-match-region="fixture"
          data-sce-match-programme-fixture="reference-split"
          aria-label={fixtureLabel}
        >
          <ReferenceFixtureSide
            side="home"
            identity={model.fixture.home}
            showCrests={showCrests}
          />
          <div
            className="flex items-center justify-center px-0.5"
            data-sce-match-center
            data-sce-match-region="center"
          >
            {centerNode}
          </div>
          <ReferenceFixtureSide
            side="away"
            identity={model.fixture.away}
            showCrests={showCrests}
          />
        </div>
      </div>
    </div>
  );
}

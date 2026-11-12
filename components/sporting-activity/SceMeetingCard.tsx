"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { SCE_ACTIVITY_LIST_ROW_SCALE } from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";
import { SCE_ACTIVITY_REFERENCE_LAYOUT } from "@/lib/sporting-activity-presentation/canonical/activity-card-reference-layout";
import { SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-shell-contract";
import {
  formatSceMeetingDateLine,
  formatSceMeetingTimeLabel,
} from "@/lib/sporting-activity-presentation/canonical/meeting-schedule-presentation";
import type {
  SceActivityPresentationDensity,
  SceMeetingPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import {
  SceActivityListRowLocationMeta,
  SceActivityListRowOperationalMetaRow,
  SceActivityListRowPrimaryIdentityRow,
  SceActivityListRowTimeMeta,
} from "./SceActivityListRowOperationalMeta";

export type SceMeetingCardSurface = "standalone" | "list-row";

export type SceMeetingCardProps = {
  model: SceMeetingPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  linkToDetail?: boolean;
  surface?: SceMeetingCardSurface;
  showStatus?: boolean;
  testId?: string;
};

function resolveMeetingLocationLine(model: SceMeetingPresentationModel): string | undefined {
  return formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })?.trim() || undefined;
}

function MeetingOperationalListRow({
  model,
  fmtCfg,
  testId = "sce-meeting-list-row",
}: {
  model: SceMeetingPresentationModel;
  fmtCfg: TenantFormatConfig;
  testId?: string;
}) {
  const dateLabel = formatSceMeetingDateLine(model, fmtCfg);
  const timeLabel = formatSceMeetingTimeLabel(model, fmtCfg);
  const locationLine = resolveMeetingLocationLine(model);

  return (
    <div
      className={cn("min-w-0 w-full max-w-full", SCE_ACTIVITY_LIST_ROW_SCALE.identityStackClass)}
      data-testid={testId}
      data-sce-meeting-density="COMPACT"
      data-sce-meeting-list-row-identity
      data-sce-meeting-list-row-presentation="operational"
      data-sce-programme-card-contract="meeting-operational"
    >
      <SceActivityListRowPrimaryIdentityRow
        title={model.meetingTitle}
        titleTestId="sce-meeting-title"
        testId="sce-meeting-list-row-primary-identity"
      />
      {model.organisationalContext ? (
        <p
          className={SCE_ACTIVITY_LIST_ROW_SCALE.secondaryContextClass}
          data-testid="sce-meeting-context"
          title={model.organisationalContext}
        >
          {model.organisationalContext}
        </p>
      ) : null}
      <SceActivityListRowOperationalMetaRow testId="sce-meeting-list-row-operational-meta">
        <span
          className={cn(
            SCE_ACTIVITY_LIST_ROW_SCALE.operationalMetaItemClass,
            SCE_ACTIVITY_REFERENCE_LAYOUT.horizontalOperationalDateClass,
          )}
          data-testid="sce-meeting-list-row-date"
        >
          {dateLabel}
        </span>
        {timeLabel ? <SceActivityListRowTimeMeta label={timeLabel} testId="sce-meeting-list-row-time" /> : null}
        {locationLine ? (
          <SceActivityListRowLocationMeta label={locationLine} testId="sce-meeting-list-row-location" />
        ) : null}
      </SceActivityListRowOperationalMetaRow>
      {model.status?.label ? (
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--text-2)]" data-testid="sce-meeting-status">
          {model.status.label}
        </p>
      ) : null}
    </div>
  );
}

export function buildMeetingAccessibleLabel(model: SceMeetingPresentationModel): string {
  const parts = [model.typeLabel, model.meetingTitle, model.organisationalContext].filter(Boolean);
  return parts.join(" — ");
}

export function SceMeetingCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = false,
  surface = "standalone",
  testId = "sce-meeting-card",
}: SceMeetingCardProps) {
  const href = model.route.consumeHref;
  const content =
    surface === "list-row" || density === "COMPACT" || density === "STANDARD" ? (
      <MeetingOperationalListRow model={model} fmtCfg={fmtCfg} testId={`${testId}-operational`} />
    ) : (
      <MeetingOperationalListRow model={model} fmtCfg={fmtCfg} testId={`${testId}-operational`} />
    );

  const shell = (
    <div
      className={cn("min-w-0", className)}
      data-testid={testId}
      data-sce-meeting-card
      data-sce-meeting-density={density}
      data-sce-meeting-surface={surface}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]",
            "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300",
          )}
          data-activity-type-pill="meeting"
        >
          {model.typeLabel}
        </span>
      </div>
      {content}
    </div>
  );

  if (linkToDetail && href) {
    return (
      <Link
        href={href}
        className={cn(SCE_ACTIVITY_CARD_SHELL_INTERACTIVE_CLASS, "block no-underline")}
        aria-label={buildMeetingAccessibleLabel(model)}
      >
        {shell}
      </Link>
    );
  }

  return shell;
}

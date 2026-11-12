"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
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
import { sceActivityListRowTypePillClass } from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";
import { resolveProgrammeActivityDisplayTypeLabel } from "@/lib/personal-agenda/programme-activity-german-labels";

export type SceMeetingListRowPresentation = "default" | "operational" | "programme-personal";

export type SceMeetingCardSurface = "standalone" | "list-row";

export type SceMeetingCardProps = {
  model: SceMeetingPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  linkToDetail?: boolean;
  surface?: SceMeetingCardSurface;
  listRowPresentation?: SceMeetingListRowPresentation;
  showStatus?: boolean;
  testId?: string;
};

function resolveMeetingLocationLine(model: SceMeetingPresentationModel): string | undefined {
  return formatSceActivityLocationHierarchy(model.location, { includeHostClub: false })?.trim() || undefined;
}

function resolveMeetingTypeLabel(model: SceMeetingPresentationModel): string {
  return resolveProgrammeActivityDisplayTypeLabel({
    semanticType: "MEETING",
    typeLabel: model.typeLabel,
  });
}

function MeetingOperationalListRow({
  model,
  fmtCfg,
  listRowPresentation = "operational",
  testId = "sce-meeting-list-row",
}: {
  model: SceMeetingPresentationModel;
  fmtCfg: TenantFormatConfig;
  listRowPresentation?: SceMeetingListRowPresentation;
  testId?: string;
}) {
  const dateLabel = formatSceMeetingDateLine(model, fmtCfg);
  const timeLabel = formatSceMeetingTimeLabel(model, fmtCfg);
  const locationLine = resolveMeetingLocationLine(model);
  const omitDateColumn = listRowPresentation === "programme-personal";
  const rowClass = omitDateColumn
    ? SCE_ACTIVITY_REFERENCE_LAYOUT.programmePersonalContentRowClass
    : SCE_ACTIVITY_REFERENCE_LAYOUT.trainingReferenceRowClass;
  const showExceptionalStatus = Boolean(
    model.status?.label &&
      (model.status.semantic === "cancelled" || model.status.semantic === "warning"),
  );

  return (
    <div
      className={cn("min-w-0 w-full max-w-full", rowClass)}
      data-testid={testId}
      data-sce-meeting-density="COMPACT"
      data-sce-meeting-list-row-identity
      data-sce-meeting-list-row-presentation={listRowPresentation}
      data-sce-programme-card-contract={
        omitDateColumn ? "programme-personal" : "meeting-operational"
      }
      data-sce-activity-card-layout="horizontal-full-width"
    >
      {showExceptionalStatus && model.status?.label ? (
        <div className="sm:col-span-full" data-testid="sce-meeting-status">
          <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--text-2)]">
            {model.status.label}
          </p>
        </div>
      ) : null}
      {!omitDateColumn ? (
        <p
          className={SCE_ACTIVITY_REFERENCE_LAYOUT.horizontalOperationalDateClass}
          data-testid="sce-meeting-list-row-date"
        >
          {dateLabel}
        </p>
      ) : null}
      {timeLabel ? (
        <div className="flex min-w-0 items-center gap-1.5" data-testid="sce-meeting-list-row-time">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
          <span className={SCE_ACTIVITY_REFERENCE_LAYOUT.trainingReferenceTimeClass}>{timeLabel}</span>
        </div>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}
      {model.organisationalContext ? (
        <p
          className={SCE_ACTIVITY_REFERENCE_LAYOUT.horizontalOperationalWrapMetaClass}
          data-testid="sce-meeting-context"
          title={model.organisationalContext}
        >
          {model.organisationalContext}
        </p>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}
      <div
        className={SCE_ACTIVITY_REFERENCE_LAYOUT.trainingReferenceActivityCellClass}
        data-testid="sce-meeting-list-row-primary-identity"
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]",
            "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300",
            sceActivityListRowTypePillClass(),
          )}
          data-activity-type-pill="meeting"
        >
          {resolveMeetingTypeLabel(model)}
        </span>
        <p
          className={SCE_ACTIVITY_REFERENCE_LAYOUT.trainingReferenceTitleClass}
          data-testid="sce-meeting-title"
          title={model.meetingTitle}
        >
          {model.meetingTitle}
        </p>
      </div>
      {locationLine ? (
        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            SCE_ACTIVITY_REFERENCE_LAYOUT.horizontalOperationalWrapMetaClass,
          )}
          data-testid="sce-meeting-list-row-location"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
          <span className="min-w-0 break-words" title={locationLine}>
            {locationLine}
          </span>
        </p>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}
    </div>
  );
}

export function buildMeetingAccessibleLabel(model: SceMeetingPresentationModel): string {
  const parts = [resolveMeetingTypeLabel(model), model.meetingTitle, model.organisationalContext].filter(
    Boolean,
  );
  return parts.join(" — ");
}

export function SceMeetingCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = false,
  surface = "standalone",
  listRowPresentation = "operational",
  testId = "sce-meeting-card",
}: SceMeetingCardProps) {
  const href = model.route.consumeHref;
  const listRow = surface === "list-row";

  const content = (
    <MeetingOperationalListRow
      model={model}
      fmtCfg={fmtCfg}
      listRowPresentation={listRow ? listRowPresentation : "operational"}
      testId={`${testId}-operational`}
    />
  );

  const shell = (
    <div
      className={cn("min-w-0", className)}
      data-testid={testId}
      data-sce-meeting-card
      data-sce-meeting-density={density}
      data-sce-meeting-surface={surface}
    >
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

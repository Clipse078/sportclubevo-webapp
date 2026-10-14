"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatFixtureDateLine, formatFixtureTime } from "@/components/admin/teams/upcoming-matches/team-upcoming-matches-formatters";
import {
  formatSceActivityLocationHierarchy,
  isSceActivityDimensionVisible,
} from "@/lib/sporting-activity-presentation/canonical";
import {
  SCE_TRAINING_CARD_SHELL_CLASS,
  isSceTrainingRichCardDensity,
  sceTrainingCardBoundedWidthClass,
  sceTrainingMicroShellClass,
  sceTrainingRichDensityScale,
} from "@/lib/sporting-activity-presentation/canonical/training-card-rich-density";
import type {
  SceActivityPresentationDensity,
  SceTrainingPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { formatSportingActivityScheduleLine } from "@/lib/sporting-activity-presentation/format";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { ActivityTypePill } from "./ActivityTypePill";
import { SceTrainingCardStatus } from "./SceTrainingCardStatus";

export type SceTrainingCardSurface = "standalone" | "detail-embed" | "list-row";

export type SceTrainingCardProps = {
  model: SceTrainingPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  linkToDetail?: boolean;
  surface?: SceTrainingCardSurface;
  /** When false, status badge is omitted (e.g. management row owns status column). */
  showStatus?: boolean;
  testId?: string;
};

function richScale(density: SceActivityPresentationDensity) {
  return isSceTrainingRichCardDensity(density)
    ? sceTrainingRichDensityScale(density)
    : sceTrainingRichDensityScale("COMPACT");
}

function buildTrainingAccessibleLabel(model: SceTrainingPresentationModel): string {
  const team = model.team?.name?.trim();
  const parts = [model.typeLabel, model.trainingTitle, team].filter(Boolean);
  return parts.join(" — ");
}

function resolveLocationLine(model: SceTrainingPresentationModel, density: SceActivityPresentationDensity) {
  if (!isSceActivityDimensionVisible(density, "location")) {
    return undefined;
  }
  return formatSceActivityLocationHierarchy(model.location, { includeHostClub: true });
}

function resolveMicroLocationLine(model: SceTrainingPresentationModel): string | undefined {
  const resource = model.location.facilityResource?.trim();
  if (resource) return resource;
  return formatSceActivityLocationHierarchy(model.location, { includeHostClub: false });
}

function isRecurringDefinition(model: SceTrainingPresentationModel): boolean {
  return model.schedulePresentation?.kind === "RECURRING_DEFINITION";
}

function formatSessionSchedule(model: SceTrainingPresentationModel, fmtCfg: TenantFormatConfig): string {
  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;
  return formatSportingActivityScheduleLine({
    startAt,
    endAt,
    allDay: model.schedule.allDay,
    fmtCfg,
  });
}

function formatSessionTimeOnly(model: SceTrainingPresentationModel, fmtCfg: TenantFormatConfig): string {
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

function SceTrainingTypeHeader({
  model,
  density,
  showStatus,
}: {
  model: SceTrainingPresentationModel;
  density: SceActivityPresentationDensity;
  showStatus: boolean;
}) {
  const status = model.status;

  return (
    <div
      className="flex min-w-0 items-start justify-between gap-2"
      data-sce-training-region="meta"
      data-sce-training-header
    >
      <ActivityTypePill activityKind="TRAINING" label={model.typeLabel} className="shrink-0" />
      {showStatus && status?.label ? (
        <div className="shrink-0" data-sce-training-region="status">
          <SceTrainingCardStatus status={status} />
        </div>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </div>
  );
}

function SceTrainingIdentityBlock({
  model,
  density,
  includeTeamInSubtitle,
}: {
  model: SceTrainingPresentationModel;
  density: SceActivityPresentationDensity;
  includeTeamInSubtitle?: boolean;
}) {
  const scale = richScale(density);
  const locationLine = resolveLocationLine(model, density);
  const subtitleParts = [
    includeTeamInSubtitle ? model.team?.name : undefined,
    locationLine,
  ].filter(Boolean);

  return (
    <div className="min-w-0 space-y-0.5" data-sce-training-region="identity">
      <p
        className={cn(scale.titleClass)}
        data-testid="sce-training-title"
        title={model.trainingTitle}
      >
        {model.trainingTitle}
      </p>
      {model.team?.name && !includeTeamInSubtitle ? (
        <p className={cn("min-w-0 truncate", scale.teamClass)} data-testid="sce-training-team">
          {model.team.name}
        </p>
      ) : null}
      {subtitleParts.length > 0 ? (
        <p
          className={cn("min-w-0 line-clamp-2", scale.contextLineClass)}
          data-testid="sce-training-context-line"
        >
          {subtitleParts.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function SceTrainingScheduleRows({
  model,
  fmtCfg,
  density,
}: {
  model: SceTrainingPresentationModel;
  fmtCfg: TenantFormatConfig;
  density: SceActivityPresentationDensity;
}) {
  const scale = richScale(density);
  const recurring = isRecurringDefinition(model) ? model.schedulePresentation : null;

  if (recurring?.kind === "RECURRING_DEFINITION") {
    const { recurrence } = recurring;
    const weekdayLine =
      recurrence.rhythmLabel?.trim() ||
      recurrence.weekdayShortLabels.join(" ");
    const timeLine = recurrence.timeLabel;
    const isVariable = timeLine === "Unterschiedliche Zeiten";

    return (
      <div
        className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        data-testid="sce-training-schedule"
        data-sce-training-region="schedule"
      >
        <span
          className={cn("inline-flex min-w-0 items-center gap-1.5 font-medium", scale.scheduleTextClass)}
          data-testid="sce-training-schedule-weekdays"
        >
          <Calendar className={scale.scheduleIconClass} aria-hidden />
          <span className="truncate">{weekdayLine}</span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 font-mono tabular-nums",
            scale.scheduleTextClass,
          )}
          data-testid="sce-training-schedule-time"
          title={recurrence.timeDetailLines?.join(" · ") ?? undefined}
        >
          <Clock className={scale.scheduleIconClass} aria-hidden />
          {isVariable ? (
            <span>{timeLine}</span>
          ) : (
            <span>{timeLine}</span>
          )}
        </span>
      </div>
    );
  }

  const startAt = new Date(model.schedule.startAt);
  const endAt = model.schedule.endAt ? new Date(model.schedule.endAt) : null;

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3"
      data-testid="sce-training-schedule"
      data-sce-training-region="schedule"
    >
      <span className={cn("inline-flex min-w-0 items-center gap-1.5", scale.scheduleTextClass)}>
        <Calendar className={scale.scheduleIconClass} aria-hidden />
        <span className="truncate">{formatFixtureDateLine(startAt, fmtCfg)}</span>
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 font-mono tabular-nums",
          scale.scheduleTextClass,
        )}
        data-testid="sce-training-schedule-time"
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

function SceTrainingLocationRow({
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
      data-testid="sce-training-location"
      data-sce-training-region="location"
    >
      <MapPin className={cn(scale.locationIconClass, "mt-0.5")} aria-hidden />
      <p className="min-w-0 line-clamp-2">{locationLine}</p>
    </div>
  );
}

function SceTrainingRichCardContent({
  model,
  density,
  fmtCfg,
  showSchedule,
  showLocation,
  showStatus,
}: {
  model: SceTrainingPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  showLocation: boolean;
  showStatus: boolean;
}) {
  const scale = richScale(density);
  const locationLine = showLocation ? resolveLocationLine(model, density) : undefined;

  return (
    <div className={cn("min-w-0", scale.contentSpaceYClass)}>
      <SceTrainingTypeHeader model={model} density={density} showStatus={showStatus} />
      <SceTrainingIdentityBlock model={model} density={density} />
      {showSchedule ? <SceTrainingScheduleRows model={model} fmtCfg={fmtCfg} density={density} /> : null}
      {locationLine ? <SceTrainingLocationRow locationLine={locationLine} density={density} /> : null}
    </div>
  );
}

function SceTrainingCompactContent({
  model,
  fmtCfg,
  showStatus,
  surface,
}: {
  model: SceTrainingPresentationModel;
  fmtCfg: TenantFormatConfig;
  showStatus: boolean;
  surface: SceTrainingCardSurface;
}) {
  const locationLine = resolveLocationLine(model, "COMPACT");
  const recurring = isRecurringDefinition(model) ? model.schedulePresentation : null;
  const managementListRowRecurring =
    surface === "list-row" && recurring?.kind === "RECURRING_DEFINITION";
  const hideWeekdayRhythm = managementListRowRecurring;
  const hideCompactTime = managementListRowRecurring;
  const weekdayLine =
    recurring?.kind === "RECURRING_DEFINITION"
      ? recurring.recurrence.rhythmLabel?.trim() ||
        recurring.recurrence.weekdayShortLabels.join(" ")
      : formatFixtureDateLine(new Date(model.schedule.startAt), fmtCfg);
  const timeLine =
    recurring?.kind === "RECURRING_DEFINITION"
      ? recurring.recurrence.timeLabel
      : formatSessionTimeOnly(model, fmtCfg);
  const timeDetailTitle =
    recurring?.kind === "RECURRING_DEFINITION"
      ? recurring.recurrence.timeDetailLines?.join(" · ") ?? undefined
      : undefined;

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-start sm:gap-3"
      data-sce-training-density="COMPACT"
    >
      <div className="min-w-0 space-y-1">
        <SceTrainingTypeHeader model={model} density="COMPACT" showStatus={false} />
        <SceTrainingIdentityBlock model={model} density="COMPACT" includeTeamInSubtitle />
        {!locationLine && model.team?.name ? (
          <p className="sr-only">{model.team.name}</p>
        ) : null}
      </div>
      <div className="min-w-0 space-y-1 sm:text-right">
        {!hideWeekdayRhythm ? (
          <p
            className="text-xs font-medium text-[var(--text-2)]"
            data-testid="sce-training-compact-weekdays"
          >
            {weekdayLine}
          </p>
        ) : null}
        {!hideCompactTime ? (
          <p
            className="font-mono text-xs tabular-nums text-[var(--foreground)]"
            data-testid="sce-training-compact-time"
            title={timeDetailTitle}
            aria-label={
              timeDetailTitle && timeLine === "Unterschiedliche Zeiten"
                ? `${timeLine}: ${timeDetailTitle}`
                : undefined
            }
          >
            {timeLine}
          </p>
        ) : null}
        {showStatus && model.status?.label ? (
          <div className="flex sm:justify-end" data-sce-training-region="status">
            <SceTrainingCardStatus status={model.status} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SceTrainingMicroContent({
  model,
  fmtCfg,
  showSchedule,
  narrow,
}: {
  model: SceTrainingPresentationModel;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  narrow?: boolean;
}) {
  const identityLabel = model.team?.name?.trim() || model.trainingTitle;
  const locationLine = resolveMicroLocationLine(model);
  const timeLabel = isRecurringDefinition(model)
    ? model.schedulePresentation?.kind === "RECURRING_DEFINITION"
      ? model.schedulePresentation.recurrence.timeLabel.split(" · ")[0]?.trim() ??
        model.schedulePresentation.recurrence.timeLabel
      : undefined
    : formatSessionTimeOnly(model, fmtCfg);

  return (
    <div className="min-w-0 space-y-0.5" data-sce-training-density="MICRO">
      <p className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {model.typeLabel}
      </p>
      <p
        className="truncate text-[0.8125rem] font-semibold leading-tight text-[var(--foreground)]"
        data-testid="sce-training-micro-identity"
        title={identityLabel}
      >
        {identityLabel}
      </p>
      {showSchedule && timeLabel ? (
        <p
          className="truncate font-mono text-[0.75rem] tabular-nums text-[var(--text-2)]"
          data-testid="sce-training-micro-time"
        >
          {narrow ? timeLabel.split("–")[0]?.trim() ?? timeLabel : timeLabel}
        </p>
      ) : null}
      {locationLine ? (
        <p
          className="truncate text-[0.6875rem] text-[var(--text-2)]"
          data-testid="sce-training-micro-location"
          title={locationLine}
        >
          {locationLine}
        </p>
      ) : null}
    </div>
  );
}

export function SceTrainingCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = true,
  surface = "standalone",
  showStatus = true,
  testId = "sce-training-card",
}: SceTrainingCardProps) {
  const embed = surface === "detail-embed";
  const showSchedule = !embed && isSceActivityDimensionVisible(density, "schedule");
  const showLocation = !embed && isSceActivityDimensionVisible(density, "location");
  const statusVisible = showStatus && isSceActivityDimensionVisible(density, "status");

  const href = linkToDetail ? model.route.consumeHref : null;

  const richBounded =
    !embed && isSceTrainingRichCardDensity(density) && density !== "COMPACT"
      ? sceTrainingCardBoundedWidthClass(density)
      : !embed && density === "MICRO"
        ? "w-full max-w-[12rem]"
        : !embed
          ? "w-full max-w-sm"
          : "";

  const richPadding =
    !embed && isSceTrainingRichCardDensity(density)
      ? sceTrainingRichDensityScale(density).shellPaddingClass
      : !embed && density === "MICRO"
        ? sceTrainingMicroShellClass()
        : "";

  const shellClass = cn(
    "relative min-w-0 text-[var(--foreground)]",
    richBounded,
    !embed && density !== "MICRO" && SCE_TRAINING_CARD_SHELL_CLASS,
    !embed && density === "MICRO" && "rounded-md border border-[var(--border)]/80 bg-[var(--surface)]",
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    richPadding,
    className,
  );

  let content: ReactNode;

  if (embed) {
    content = (
      <div className="min-w-0 space-y-2">
        <SceTrainingIdentityBlock model={model} density={density} />
        {statusVisible && model.status?.label ? (
          <SceTrainingCardStatus status={model.status} />
        ) : null}
      </div>
    );
  } else if (density === "MICRO") {
    content = (
      <SceTrainingMicroContent
        model={model}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        narrow={Boolean(className?.includes("sce-training-micro-narrow"))}
      />
    );
  } else if (density === "COMPACT") {
    content = (
      <SceTrainingCompactContent
        model={model}
        fmtCfg={fmtCfg}
        showStatus={statusVisible}
        surface={surface}
      />
    );
  } else {
    content = (
      <SceTrainingRichCardContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        showLocation={showLocation}
        showStatus={statusVisible}
      />
    );
  }

  const accessibleLabel = buildTrainingAccessibleLabel(model);

  if (!href) {
    return (
      <article
        className={shellClass}
        data-testid={testId}
        data-density={density}
        data-sce-training-card
        data-sce-training-density={density}
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
      data-sce-training-card
      data-sce-training-density={density}
      data-surface={surface}
    >
      <Link
        href={href}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        aria-label={`${accessibleLabel} — Details öffnen`}
        data-testid="sce-training-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

export { buildTrainingAccessibleLabel, formatSessionSchedule };

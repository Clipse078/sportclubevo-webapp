"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import {
  formatSceActivityLocationHierarchy,
  isSceActivityDimensionVisible,
} from "@/lib/sporting-activity-presentation/canonical";
import {
  formatSceClubEventDateLine,
  formatSceClubEventTimeLabel,
} from "@/lib/sporting-activity-presentation/canonical/club-event-schedule-presentation";
import {
  SCE_CLUB_EVENT_CARD_SHELL_CLASS,
  isSceClubEventRichCardDensity,
  sceClubEventCardBoundedWidthClass,
  sceClubEventMicroShellClass,
  sceClubEventOrganiserCrestVisualSizeForDensity,
  sceClubEventRichDensityScale,
} from "@/lib/sporting-activity-presentation/canonical/club-event-card-rich-density";
import {
  SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS,
  SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens";
import {
  formatSceClubEventAudienceCompactLabel,
  sceClubEventAudienceAccessibleDetail,
} from "@/lib/sporting-activity-presentation/canonical/club-event-audience-presentation";
import type {
  SceActivityPresentationDensity,
  SceClubEventPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import {
  SCE_ACTIVITY_LIST_ROW_SCALE,
  sceActivityListRowTypePillClass,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-list-row-scale";
import { ActivityTypePill } from "./ActivityTypePill";
import { SceClubEventCardStatus } from "./SceClubEventCardStatus";

export type SceClubEventCardSurface =
  | "standalone"
  | "detail-embed"
  | "context-header"
  | "list-row";

export type SceClubEventCardProps = {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  className?: string;
  linkToDetail?: boolean;
  surface?: SceClubEventCardSurface;
  showStatus?: boolean;
  testId?: string;
};

function richScale(density: SceActivityPresentationDensity) {
  return isSceClubEventRichCardDensity(density)
    ? sceClubEventRichDensityScale(density)
    : sceClubEventRichDensityScale("COMPACT");
}

export function buildClubEventAccessibleLabel(model: SceClubEventPresentationModel): string {
  const organiser = model.organiser?.displayName?.trim();
  const audience = model.audience?.primaryLabel?.trim();
  const parts = [model.typeLabel, model.eventTitle, audience, organiser].filter(Boolean);
  return parts.join(" — ");
}

function resolveClubEventLocationLine(
  model: SceClubEventPresentationModel,
  density: SceActivityPresentationDensity,
): string | undefined {
  if (!isSceActivityDimensionVisible(density, "location")) {
    return undefined;
  }
  const stripped = {
    ...model.location,
    hostOrOrganiser: undefined,
  };
  return formatSceActivityLocationHierarchy(stripped, { includeHostClub: false });
}

function resolveMicroLocationLine(model: SceClubEventPresentationModel): string | undefined {
  const resource = model.location.facilityResource?.trim();
  if (resource) return resource;
  const venue = model.location.venueName?.trim();
  if (venue) return venue;
  return resolveClubEventLocationLine(model, "MICRO");
}

function formatCompactDateToken(model: SceClubEventPresentationModel, fmtCfg: TenantFormatConfig): string {
  const startAt = new Date(model.schedule.startAt);
  const locale = fmtCfg.locale ?? "de-CH";
  const timezone = fmtCfg.timezone ?? "Europe/Zurich";
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: timezone,
  }).format(startAt);
  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(startAt);
  return `${weekday} ${day}`;
}

function sceClubEventTypePillClass(density: SceActivityPresentationDensity): string | undefined {
  if (density === "HERO") {
    return "text-[0.6875rem] px-2 py-1";
  }
  if (density === "STANDARD") {
    return "text-[0.6875rem]";
  }
  return undefined;
}

function SceClubEventTypeHeader({
  model,
  showStatus,
  density = "STANDARD",
  listRow = false,
}: {
  model: SceClubEventPresentationModel;
  showStatus: boolean;
  density?: SceActivityPresentationDensity;
  listRow?: boolean;
}) {
  const status = model.status;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-2",
        listRow && SCE_ACTIVITY_LIST_ROW_SCALE.metaRowClass,
      )}
      data-sce-club-event-region="meta"
      data-sce-club-event-header
    >
      <ActivityTypePill
        activityKind="EVENT"
        label={model.typeLabel}
        className={cn(
          "shrink-0",
          listRow ? sceActivityListRowTypePillClass() : sceClubEventTypePillClass(density),
        )}
      />
      {showStatus && status?.label ? (
        <div className="shrink-0" data-sce-club-event-region="status">
          <SceClubEventCardStatus status={status} />
        </div>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </div>
  );
}

function SceClubEventOrganiserCrest({
  model,
  density,
  narrowMicro,
  listRow,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  narrowMicro?: boolean;
  listRow?: boolean;
}) {
  const hasLogo = Boolean(model.organiser?.logoUrl?.trim());
  const crestSize = sceClubEventOrganiserCrestVisualSizeForDensity(density, {
    narrowMicro,
    listRow,
    hasLogo,
  });
  if (!crestSize || !model.organiser) return null;

  return (
    <span data-testid="sce-club-event-organiser-crest" className="self-start">
      <ClubCrest identity={model.organiser} density={crestSize} decorative className="self-start" />
    </span>
  );
}

function SceClubEventAudienceLine({
  model,
  density,
  listRow = false,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  listRow?: boolean;
}) {
  const audience = model.audience;
  if (!audience?.primaryLabel?.trim()) return null;

  const useCompact =
    listRow || density === "MICRO" || density === "COMPACT";
  const label = useCompact
    ? formatSceClubEventAudienceCompactLabel(audience)
    : audience.primaryLabel.trim();
  const detail = sceClubEventAudienceAccessibleDetail(audience);

  return (
    <p
      className={cn(
        "min-w-0 truncate text-xs font-medium leading-snug",
        SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS,
        density === "MICRO" && "text-[0.6875rem]",
      )}
      data-testid="sce-club-event-audience"
      data-sce-club-event-region="audience"
      title={detail && detail !== label ? detail : label}
    >
      {label}
    </p>
  );
}

function SceClubEventOrganiserLine({
  model,
  density,
  testId = "sce-club-event-organiser",
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  testId?: string;
}) {
  const scale = richScale(density);
  const organiser = model.organiser?.displayName?.trim();
  if (!organiser) return null;

  const microClass =
    density === "MICRO"
      ? "truncate text-[0.6875rem] font-medium leading-tight text-[var(--text-2)]"
      : scale.organiserNameClass;

  return (
    <p
      className={cn("min-w-0", microClass)}
      data-testid={testId}
      data-sce-club-event-region="organiser"
      title={organiser}
    >
      {organiser}
    </p>
  );
}

function SceClubEventIdentityBlock({
  model,
  density,
  narrowMicro,
  showCrest = true,
  listRow = false,
  titleAsHeading = false,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  narrowMicro?: boolean;
  showCrest?: boolean;
  listRow?: boolean;
  titleAsHeading?: boolean;
}) {
  const scale = richScale(density);
  const titleClass = cn(scale.titleClass, listRow && "line-clamp-2");
  const hideOrganiserText =
    listRow && showCrest && Boolean(model.organiser?.logoUrl?.trim());

  const titleNode = titleAsHeading ? (
    <h1 className={titleClass} data-testid="sce-club-event-title" title={model.eventTitle}>
      {model.eventTitle}
    </h1>
  ) : (
    <p className={titleClass} data-testid="sce-club-event-title" title={model.eventTitle}>
      {model.eventTitle}
    </p>
  );

  return (
    <div
      className={cn("flex min-w-0 gap-2.5", scale.identityStackGapClass)}
      data-sce-club-event-region="identity"
    >
      {showCrest ? (
        <SceClubEventOrganiserCrest
          model={model}
          density={density}
          narrowMicro={narrowMicro}
          listRow={listRow}
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        {titleNode}
        <SceClubEventAudienceLine model={model} density={density} listRow={listRow} />
        {!hideOrganiserText ? <SceClubEventOrganiserLine model={model} density={density} /> : null}
      </div>
    </div>
  );
}

function SceClubEventScheduleRows({
  model,
  fmtCfg,
  density,
}: {
  model: SceClubEventPresentationModel;
  fmtCfg: TenantFormatConfig;
  density: SceActivityPresentationDensity;
}) {
  const scale = richScale(density);
  const dateLine = formatSceClubEventDateLine(model, fmtCfg);
  const timeLine = formatSceClubEventTimeLabel(model, fmtCfg);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 border-t border-[var(--border)]/50 pt-2",
        model.schedule.allDay && "items-start",
      )}
      data-testid="sce-club-event-schedule"
      data-sce-club-event-region="schedule"
    >
      <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-medium", scale.scheduleTextClass)}>
        <Calendar className={scale.scheduleIconClass} aria-hidden />
        <span className="min-w-0 line-clamp-2">{dateLine}</span>
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5",
          model.schedule.allDay ? "font-medium" : "font-mono tabular-nums",
          scale.scheduleTextClass,
        )}
        data-testid="sce-club-event-schedule-time"
      >
        <Clock className={scale.scheduleIconClass} aria-hidden />
        {timeLine}
      </span>
    </div>
  );
}

function SceClubEventLocationRow({
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
      data-testid="sce-club-event-location"
      data-sce-club-event-region="location"
    >
      <MapPin className={cn(scale.locationIconClass, "mt-0.5")} aria-hidden />
      <p className="min-w-0 line-clamp-2">{locationLine}</p>
    </div>
  );
}

function SceClubEventRichCardContent({
  model,
  density,
  fmtCfg,
  showSchedule,
  showLocation,
  showStatus,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  showLocation: boolean;
  showStatus: boolean;
}) {
  const scale = richScale(density);
  const locationLine = showLocation ? resolveClubEventLocationLine(model, density) : undefined;

  return (
    <div className={cn("min-w-0", scale.contentSpaceYClass)}>
      <SceClubEventTypeHeader model={model} showStatus={showStatus} density={density} />
      <SceClubEventIdentityBlock model={model} density={density} />
      {showSchedule ? <SceClubEventScheduleRows model={model} fmtCfg={fmtCfg} density={density} /> : null}
      {locationLine ? <SceClubEventLocationRow locationLine={locationLine} density={density} /> : null}
    </div>
  );
}

function SceClubEventListRowIdentityContent({
  model,
  density,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
}) {
  return (
    <div
      className={cn("min-w-0", SCE_ACTIVITY_LIST_ROW_SCALE.identityStackClass)}
      data-sce-club-event-density={density}
      data-sce-club-event-list-row-identity
    >
      <SceClubEventTypeHeader model={model} showStatus={false} density={density} listRow />
      <div className="min-w-0 space-y-0.5" data-sce-club-event-region="identity">
        <p
          className={SCE_ACTIVITY_LIST_ROW_SCALE.primaryTitleClass}
          data-testid="sce-club-event-title"
          title={model.eventTitle}
        >
          {model.eventTitle}
        </p>
        <SceClubEventAudienceLine model={model} density={density} listRow />
      </div>
    </div>
  );
}

function SceClubEventCompactContent({
  model,
  fmtCfg,
  showStatus,
  showSchedule,
  showLocation,
}: {
  model: SceClubEventPresentationModel;
  fmtCfg: TenantFormatConfig;
  showStatus: boolean;
  showSchedule: boolean;
  showLocation: boolean;
}) {
  const scale = richScale("COMPACT");
  const locationLine = showLocation ? resolveClubEventLocationLine(model, "COMPACT") : undefined;
  const dateToken = formatCompactDateToken(model, fmtCfg);
  const timeLine = formatSceClubEventTimeLabel(model, fmtCfg);

  return (
    <div className="min-w-0 space-y-1.5" data-sce-club-event-density="COMPACT">
      <SceClubEventTypeHeader model={model} showStatus={false} density="COMPACT" />
      <SceClubEventIdentityBlock model={model} density="COMPACT" />
      {showSchedule ? (
        <p
          className={cn(
            "inline-flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs font-medium tabular-nums",
            scale.scheduleTextClass,
          )}
          data-testid="sce-club-event-compact-date"
        >
          <Calendar className={scale.scheduleIconClass} aria-hidden />
          <span>{dateToken}</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <Clock className={scale.scheduleIconClass} aria-hidden />
          <span className={model.schedule.allDay ? "font-medium" : "font-mono"}>{timeLine}</span>
        </p>
      ) : null}
      {locationLine ? <SceClubEventLocationRow locationLine={locationLine} density="COMPACT" /> : null}
      {showStatus && model.status?.label ? (
        <div className="flex pt-0.5" data-sce-club-event-region="status">
          <SceClubEventCardStatus status={model.status} />
        </div>
      ) : null}
    </div>
  );
}

function SceClubEventMicroContent({
  model,
  fmtCfg,
  showSchedule,
  narrow,
}: {
  model: SceClubEventPresentationModel;
  fmtCfg: TenantFormatConfig;
  showSchedule: boolean;
  narrow?: boolean;
}) {
  const locationLine = resolveMicroLocationLine(model);
  const timeLabel = formatSceClubEventTimeLabel(model, fmtCfg);
  const hasLogo = Boolean(model.organiser?.logoUrl?.trim());
  const showCrest = !narrow && hasLogo;

  return (
    <div className="min-w-0 space-y-0.5" data-sce-club-event-density="MICRO">
      <ActivityTypePill activityKind="EVENT" label={model.typeLabel} className="shrink-0" />
      <div className="flex min-w-0 gap-1.5">
        {showCrest && model.organiser ? (
          <SceClubEventOrganiserCrest model={model} density="MICRO" narrowMicro={narrow} />
        ) : null}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className="truncate text-[0.8125rem] font-semibold leading-tight text-[var(--foreground)]"
            data-testid="sce-club-event-micro-title"
            title={model.eventTitle}
          >
            {model.eventTitle}
          </p>
          <SceClubEventAudienceLine model={model} density="MICRO" />
          <SceClubEventOrganiserLine
            model={model}
            density="MICRO"
            testId="sce-club-event-micro-organiser"
          />
        </div>
      </div>
      {showSchedule && timeLabel ? (
        <p
          className={cn(
            "truncate text-[0.75rem] tabular-nums text-[var(--text-2)]",
            model.schedule.allDay ? "font-medium" : "font-mono",
          )}
          data-testid="sce-club-event-micro-time"
        >
          {narrow && !model.schedule.allDay ? timeLabel.split("–")[0]?.trim() ?? timeLabel : timeLabel}
        </p>
      ) : null}
      {locationLine ? (
        <p
          className={cn("truncate text-[0.6875rem]", SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS)}
          data-testid="sce-club-event-micro-location"
          title={locationLine}
        >
          {locationLine}
        </p>
      ) : null}
    </div>
  );
}

function SceClubEventContextHeaderContent({
  model,
  density,
  fmtCfg,
  showStatus,
}: {
  model: SceClubEventPresentationModel;
  density: SceActivityPresentationDensity;
  fmtCfg: TenantFormatConfig;
  showStatus: boolean;
}) {
  const locationLine = resolveClubEventLocationLine(model, density);

  return (
    <div
      className="min-w-0 space-y-2.5 rounded-lg border border-[var(--border)]/70 bg-[var(--surface)]/40 px-3 py-2.5 sm:px-4"
      data-sce-club-event-density={density}
      data-sce-club-event-context-header
    >
      <SceClubEventTypeHeader model={model} showStatus={showStatus} density={density} />
      <SceClubEventIdentityBlock model={model} density={density} titleAsHeading />
      <SceClubEventScheduleRows model={model} fmtCfg={fmtCfg} density={density} />
      {locationLine ? <SceClubEventLocationRow locationLine={locationLine} density={density} /> : null}
    </div>
  );
}

export function SceClubEventCard({
  model,
  density,
  fmtCfg,
  className,
  linkToDetail = true,
  surface = "standalone",
  showStatus = true,
  testId = "sce-club-event-card",
}: SceClubEventCardProps) {
  const listRow = surface === "list-row";
  const contextHeader = surface === "context-header" || surface === "detail-embed";
  const embed = contextHeader || listRow;
  const showSchedule =
    contextHeader || (!embed && isSceActivityDimensionVisible(density, "schedule"));
  const showLocation =
    contextHeader || (!embed && isSceActivityDimensionVisible(density, "location"));
  const statusVisible =
    showStatus &&
    (contextHeader || isSceActivityDimensionVisible(density, "status"));

  const href = linkToDetail ? model.route.consumeHref ?? model.route.manageHref : null;

  const richBounded =
    listRow
      ? "w-full max-w-none"
      : !embed && isSceClubEventRichCardDensity(density) && density !== "COMPACT"
        ? sceClubEventCardBoundedWidthClass(density)
        : !embed && density === "MICRO"
          ? "w-full max-w-[12rem]"
          : !embed
            ? "w-full max-w-sm"
            : "";

  const richPadding =
    !embed && isSceClubEventRichCardDensity(density)
      ? sceClubEventRichDensityScale(density).shellPaddingClass
      : !embed && density === "MICRO"
        ? sceClubEventMicroShellClass()
        : "";

  const shellClass = cn(
    "relative min-w-0 text-[var(--foreground)]",
    richBounded,
    !embed && density !== "MICRO" && SCE_CLUB_EVENT_CARD_SHELL_CLASS,
    !embed && density === "MICRO" && "rounded-md border border-[var(--border)]/80 bg-[var(--surface)]",
    embed && "rounded-none border-0 bg-transparent p-0 shadow-none",
    listRow && "shadow-none",
    richPadding,
    className,
  );

  let content: ReactNode;

  if (listRow) {
    content = <SceClubEventListRowIdentityContent model={model} density={density} />;
  } else if (contextHeader) {
    content = (
      <SceClubEventContextHeaderContent
        model={model}
        density={density === "MICRO" ? "STANDARD" : density}
        fmtCfg={fmtCfg}
        showStatus={statusVisible}
      />
    );
  } else if (density === "MICRO") {
    content = (
      <SceClubEventMicroContent
        model={model}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        narrow={Boolean(className?.includes("sce-club-event-micro-narrow"))}
      />
    );
  } else if (density === "COMPACT") {
    content = (
      <SceClubEventCompactContent
        model={model}
        fmtCfg={fmtCfg}
        showStatus={statusVisible}
        showSchedule={showSchedule}
        showLocation={showLocation}
      />
    );
  } else {
    content = (
      <SceClubEventRichCardContent
        model={model}
        density={density}
        fmtCfg={fmtCfg}
        showSchedule={showSchedule}
        showLocation={showLocation}
        showStatus={statusVisible}
      />
    );
  }

  const accessibleLabel = buildClubEventAccessibleLabel(model);

  if (!href) {
    return (
      <article
        className={shellClass}
        data-testid={testId}
        data-density={density}
        data-sce-club-event-card
        data-sce-club-event-density={density}
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
      data-sce-club-event-card
      data-sce-club-event-density={density}
      data-surface={surface}
    >
      <Link
        href={href}
        className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        aria-label={`${accessibleLabel} — Details öffnen`}
        data-testid="sce-club-event-card-link"
      />
      <div className="relative z-[1] pointer-events-none">{content}</div>
    </article>
  );
}

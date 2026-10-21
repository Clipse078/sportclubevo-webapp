"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { ClubEvent } from "@/lib/events/club-events-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { cn } from "@/lib/cn";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { resolveSceClubEventPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/club-event";
import { resolveClubEventPublicationPresentationLabel } from "@/lib/sporting-activity-presentation/canonical/club-event-status-presentation";
import {
  formatSceClubEventDateLine,
  formatSceClubEventTimeLabel,
} from "@/lib/sporting-activity-presentation/canonical/club-event-schedule-presentation";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import type { SceClubEventPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import {
  VERANSTALTUNGEN_ROW_CONTEXT_CELL,
  VERANSTALTUNGEN_ROW_DATE_CELL,
  VERANSTALTUNGEN_ROW_DESKTOP_GRID,
  VERANSTALTUNGEN_ROW_IDENTITY_CELL,
  VERANSTALTUNGEN_ROW_INTERMEDIATE_GRID,
} from "./veranstaltungen-management-layout";

type VeranstaltungListRowProps = {
  event: ClubEvent;
  timeZone?: string | null;
  canManage: boolean;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
};

function resolveRowLocationLine(model: SceClubEventPresentationModel): string | undefined {
  const stripped = { ...model.location, hostOrOrganiser: undefined };
  return formatSceActivityLocationHierarchy(stripped, { includeHostClub: false }) || undefined;
}

function VeranstaltungRowContextZone({
  model,
  locale,
  timezone,
  statusLabel,
  publicationLabel,
}: {
  model: SceClubEventPresentationModel;
  locale: string;
  timezone: string;
  statusLabel: string | undefined;
  publicationLabel: string;
}) {
  const fmtCfg = { locale, timezone };
  const dateLine = formatSceClubEventDateLine(model, fmtCfg);
  const timeLine = formatSceClubEventTimeLabel(model, fmtCfg);
  const locationLine = resolveRowLocationLine(model);

  return (
    <div
      className="flex min-w-0 flex-col gap-2"
      data-testid="veranstaltung-row-context-zone"
      data-sce-club-event-list-row-context
    >
      <div className="flex min-w-0 flex-col gap-1 text-xs text-[var(--text-2)]">
        <p
          className="inline-flex min-w-0 items-center gap-1.5 font-medium"
          data-testid="veranstaltung-row-context-date"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 line-clamp-2">{dateLine}</span>
        </p>
        <p
          className={cn(
            "inline-flex min-w-0 items-center gap-1.5 tabular-nums",
            model.schedule.allDay ? "font-medium" : "font-mono",
          )}
          data-testid="veranstaltung-row-context-time"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span>{timeLine}</span>
        </p>
        {locationLine ? (
          <p
            className="inline-flex min-w-0 items-start gap-1.5 text-[color-mix(in_srgb,var(--sce-info)_55%,var(--text-2)_45%)]"
            data-testid="veranstaltung-row-context-location"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="min-w-0 line-clamp-2">{locationLine}</span>
          </p>
        ) : null}
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="veranstaltung-row-status-zone"
        data-sce-club-event-list-row-status
      >
        {statusLabel ? (
          <span className="inline-flex shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--muted)]">
            {statusLabel}
          </span>
        ) : null}
        <span
          className="inline-flex shrink-0 rounded-full border border-[var(--border)]/80 bg-[var(--surface)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]"
          data-testid="veranstaltung-row-publication"
        >
          {publicationLabel}
        </span>
      </div>
    </div>
  );
}

export default function VeranstaltungListRow({
  event,
  timeZone,
  canManage,
  tenantClubName = null,
  tenantLogoUrl = null,
}: VeranstaltungListRowProps) {
  const tz = resolveTenantEventTimezone(timeZone);
  const locale = "de-CH";
  const start = new Date(event.startAt);

  const weekdayShort = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: tz,
  }).format(start);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: tz }).format(start);
  const monthShort = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: tz,
  }).format(start);

  const publicationLabel = resolveClubEventPublicationPresentationLabel(event);
  const sceModel = resolveSceClubEventPresentation({
    event,
    tenantClubName,
    tenantLogoUrl,
  });
  const statusLabel = sceModel.status?.label;

  return (
    <article
      data-testid={`veranstaltung-row-${event.id}`}
      data-sce-club-event-list-row
      className={cn(
        "relative grid gap-3 border-b border-[var(--border)]/60 px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--surface-2)]/40",
        VERANSTALTUNGEN_ROW_INTERMEDIATE_GRID,
        VERANSTALTUNGEN_ROW_DESKTOP_GRID,
      )}
    >
      <div
        className={cn(
          "flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center",
          VERANSTALTUNGEN_ROW_DATE_CELL,
        )}
        aria-hidden
        data-testid="veranstaltung-row-date-block"
        data-sce-activity-date-block="date-only"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {weekdayShort}
        </span>
        <span
          className="text-xl font-bold leading-none text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {day}
        </span>
        <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
          {monthShort}
        </span>
      </div>

      <div
        className={cn("relative z-[1] min-w-0", VERANSTALTUNGEN_ROW_IDENTITY_CELL)}
        data-testid={`veranstaltung-row-identity-${event.id}`}
      >
        <SceClubEventCard
          model={sceModel}
          density="COMPACT"
          fmtCfg={{ locale, timezone: tz }}
          linkToDetail={false}
          surface="list-row"
          showStatus={false}
          testId={`veranstaltung-row-card-${event.id}`}
        />
      </div>

      <div className={cn(VERANSTALTUNGEN_ROW_CONTEXT_CELL)}>
        <VeranstaltungRowContextZone
          model={sceModel}
          locale={locale}
          timezone={tz}
          statusLabel={statusLabel}
          publicationLabel={publicationLabel}
        />
      </div>

      <Link
        href={canManage ? getVeranstaltungHref(event.id) : "#"}
        aria-label={`Veranstaltung ${event.title} öffnen`}
        className={cn(
          "absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
          !canManage && "pointer-events-none",
        )}
        data-testid={`veranstaltung-row-link-${event.id}`}
      >
        <span className="sr-only">
          {event.title}
          {statusLabel ? ` · ${statusLabel}` : ""} · {publicationLabel}
        </span>
      </Link>
    </article>
  );
}

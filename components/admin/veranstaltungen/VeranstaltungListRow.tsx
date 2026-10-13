"use client";

import Link from "next/link";
import type { ClubEvent } from "@/lib/events/club-events-service";
import {
  formatClubEventDateHeading,
  formatClubEventTimingLabel,
} from "@/lib/events/club-event-scheduling";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { cn } from "@/lib/cn";
import { EventDomainMetaRail } from "@/components/sporting-activity/EventDomainMetaRail";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { resolveSceClubEventPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/club-event";
import { resolveClubEventPublicationPresentationLabel } from "@/lib/sporting-activity-presentation/canonical/club-event-status-presentation";

type VeranstaltungListRowProps = {
  event: ClubEvent;
  timeZone?: string | null;
  canManage: boolean;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
};

export default function VeranstaltungListRow({
  event,
  timeZone,
  canManage,
  tenantClubName = null,
  tenantLogoUrl = null,
}: VeranstaltungListRowProps) {
  const tz = resolveTenantEventTimezone(timeZone);
  const start = new Date(event.startAt);
  const timing = formatClubEventTimingLabel(
    { allDay: event.allDay, startAt: event.startAt, endAt: event.endAt },
    "de-CH",
    tz,
  );
  const longDate = formatClubEventDateHeading(
    { allDay: event.allDay, startAt: event.startAt, endAt: event.endAt },
    "de-CH",
    tz,
  );

  const weekdayShort = new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    timeZone: tz,
  }).format(start);
  const day = new Intl.DateTimeFormat("de-CH", { day: "numeric", timeZone: tz }).format(start);
  const monthShort = new Intl.DateTimeFormat("de-CH", {
    month: "short",
    timeZone: tz,
  }).format(start);

  const publicationLabel = resolveClubEventPublicationPresentationLabel(event);
  const sceModel = resolveSceClubEventPresentation({
    event,
    tenantClubName,
    tenantLogoUrl,
  });

  return (
    <Link
      href={canManage ? getVeranstaltungHref(event.id) : "#"}
      className={cn(
        "grid gap-2 border-b border-[var(--border)]/60 px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--surface-2)]/40 md:grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,9rem)] md:items-center md:gap-x-4",
        !canManage && "pointer-events-none",
      )}
      data-testid={`veranstaltung-row-${event.id}`}
      data-sce-club-event-list-row
    >
      <EventDomainMetaRail
        domainLabel="VERANSTALTUNG"
        dateStack={{ weekdayShort, day, monthShort }}
      />
      <div className="min-w-0">
        <SceClubEventCard
          model={sceModel}
          density="COMPACT"
          fmtCfg={{ locale: "de-CH", timezone: tz }}
          linkToDetail={false}
          surface="list-row"
          showStatus={false}
          testId={`veranstaltung-row-card-${event.id}`}
        />
        <span className="sr-only">
          {longDate} · {timing}
          {event.location ? ` · ${event.location}` : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {sceModel.status?.label ? (
          <span className="inline-flex shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--muted)]">
            {sceModel.status.label}
          </span>
        ) : null}
        <span
          className="inline-flex shrink-0 rounded-full border border-[var(--border)]/80 bg-[var(--surface)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]"
          data-testid={`veranstaltung-row-publication-${event.id}`}
        >
          {publicationLabel}
        </span>
      </div>
    </Link>
  );
}

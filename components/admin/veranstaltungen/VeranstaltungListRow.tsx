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

const REVIEW_STAGE_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Zur Prüfung",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  PUBLISHED: "Veröffentlicht",
};

type VeranstaltungListRowProps = {
  event: ClubEvent;
  timeZone?: string | null;
  canManage: boolean;
};

function operationalState(event: ClubEvent): string {
  if (event.reviewStage === "PUBLISHED") return "Veröffentlicht";
  if (!event.websiteVisible && !event.homepageVisible && !event.wochenplanVisible) {
    return "Intern";
  }
  return REVIEW_STAGE_LABEL[event.reviewStage] ?? event.reviewStage;
}

export default function VeranstaltungListRow({
  event,
  timeZone,
  canManage,
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

  return (
    <Link
      href={canManage ? getVeranstaltungHref(event.id) : "#"}
      className={cn(
        "grid gap-2 border-b border-[var(--border)]/60 px-4 py-2.5 transition last:border-b-0 hover:bg-[var(--surface-2)]/40 md:grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,9rem)] md:items-center md:gap-x-4",
        !canManage && "pointer-events-none",
      )}
      data-testid={`veranstaltung-row-${event.id}`}
    >
      <div
        className="flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center"
        aria-hidden
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {weekdayShort}
        </span>
        <span className="text-xl font-bold leading-none text-[var(--foreground)]">{day}</span>
        <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
          {monthShort}
        </span>
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{event.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-2)]">
          <span>{timing}</span>
          {event.organizerName ? <span className="truncate">{event.organizerName}</span> : null}
        </div>
        {event.location ? (
          <p className="truncate text-[0.6875rem] text-[var(--muted)]">{event.location}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className="inline-flex shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--muted)]">
          {operationalState(event)}
        </span>
      </div>
      <span className="sr-only">{longDate}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import type { ClubEvent } from "@/lib/events/club-events-service";
import {
  formatClubEventDateHeading,
  formatClubEventTimingLabel,
} from "@/lib/events/club-event-scheduling";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
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
  const dayNum = new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "short",
    timeZone: tz,
  }).format(start);
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

  return (
    <Link
      href={canManage ? `/dashboard/veranstaltungen/${event.id}/edit` : "#"}
      className={cn(
        "grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)]/60 px-1 py-2.5 transition hover:bg-[var(--surface-2)] sm:grid-cols-[5rem_minmax(0,1.4fr)_minmax(0,1fr)_auto]",
        !canManage && "pointer-events-none",
      )}
      data-testid={`veranstaltung-row-${event.id}`}
    >
      <div className="text-center">
        <p className="text-lg font-semibold tabular-nums leading-none text-[var(--foreground)]">
          {dayNum.split(" ")[0]}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {dayNum.split(" ")[1] ?? ""}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{event.title}</p>
        <p className="truncate text-xs text-[var(--muted)]">{timing}</p>
      </div>
      <p className="hidden truncate text-xs text-[var(--text-2)] sm:block">
        {event.location ?? "—"}
      </p>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {operationalState(event)}
      </span>
      <span className="sr-only">{longDate}</span>
    </Link>
  );
}

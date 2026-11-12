/**
 * DB-backed meetings list. Data is fetched server-side in meetings/page.tsx
 * and passed as props.
 *
 * VISIBILITY NOTE: The meetings array passed here is visibility-filtered on the
 * server. RESTRICTED and PRIVATE meetings are excluded when the actor cannot see them.
 * The empty state MUST NOT reveal whether hidden meetings exist.
 */

import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import Link from "next/link";
import { ChevronRight, Clock3, Edit, MapPin } from "lucide-react";
import ReviewStageBadge from "@/components/admin/shared/ReviewStageBadge";
import VisibilityScopeBadge from "@/components/admin/shared/VisibilityScopeBadge";
import { Badge } from "@/components/ui";
import { SceDateTile } from "@/components/design-system/date";
import type { MeetingListItem } from "@/lib/meetings/queries";
import { formatTime, type TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

const STATUS_LABELS: Record<MeetingListItem["status"], string> = {
  PLANNED: "Geplant",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

type StatusVariant = "default" | "success" | "danger";

const STATUS_VARIANTS: Record<MeetingListItem["status"], StatusVariant> = {
  PLANNED: "default",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function formatPlannedDuration(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

type VereinsleitungMeetingsListProps = {
  meetings: MeetingListItem[];
  canManage?: boolean;
  locale?: string;
  timezone?: string;
};

export default function VereinsleitungMeetingsList({
  meetings,
  canManage = false,
  locale = "de-CH",
  timezone = "Europe/Zurich",
}: VereinsleitungMeetingsListProps) {
  const fmtCfg: TenantFormatConfig = { locale, timezone };
  return (
    <ul className="list-none space-y-3">
      {meetings.map((meeting) => {
        const detailHref = `/vereinsleitung/meetings/${meeting.slug}`;
        const editHref = `/vereinsleitung/meetings/${meeting.slug}/edit`;
        const durationLabel = formatPlannedDuration(meeting.plannedDurationMin);

        return (
          <li key={meeting.slug}>
            <article
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition motion-safe:hover:-translate-y-[1px] motion-safe:hover:border-[var(--border-strong,var(--border))] motion-safe:hover:shadow-md"
              data-testid={`vereinsleitung-meeting-card-${meeting.slug}`}
            >
              <Link
                href={detailHref}
                className="absolute inset-0 z-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring,var(--blue))]"
                aria-label={`${meeting.title} — Sitzung öffnen`}
                data-testid="vereinsleitung-meeting-card-link"
              />

              <div className="pointer-events-none relative z-[1] flex items-start gap-4">
                <SceDateTile
                  value={meeting.meetingDate}
                  fmtCfg={fmtCfg}
                  testId={`vereinsleitung-meeting-date-${meeting.slug}`}
                  decorative
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <h3
                    className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--blue)] motion-safe:transition-colors"
                    data-testid="vereinsleitung-meeting-card-title"
                  >
                    {meeting.title}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[var(--text-2)]">
                    <span
                      className="inline-flex items-center gap-1.5 tabular-nums"
                      data-testid={`vereinsleitung-meeting-time-${meeting.slug}`}
                    >
                      <Clock3 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {formatTime(meeting.meetingDate, fmtCfg)} Uhr
                    </span>

                    {durationLabel ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
                        <Clock3 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        {durationLabel} geplant
                      </span>
                    ) : null}

                    {meeting.attendeeCount ? (
                      <span className="inline-flex items-center gap-1.5">
                        <ProductDomainSceIcon name="people" size={16} />
                        {meeting.attendeeCount} Teilnehmer
                      </span>
                    ) : null}

                    {meeting.location ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 text-[var(--muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{meeting.location}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Badge variant={STATUS_VARIANTS[meeting.status]} size="sm">
                      {STATUS_LABELS[meeting.status]}
                    </Badge>
                    <ReviewStageBadge stage={meeting.reviewStage} size="sm" />
                    <VisibilityScopeBadge scope={meeting.visibilityScope} />
                  </div>

                  <div className="flex items-center gap-3">
                    {canManage ? (
                      <Link
                        href={editHref}
                        className="pointer-events-auto relative z-[2] inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring,var(--blue))]"
                        data-testid="vereinsleitung-meeting-card-edit"
                      >
                        <Edit className="h-3.5 w-3.5" aria-hidden />
                        Bearbeiten
                      </Link>
                    ) : null}
                    <span
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--blue)]"
                      data-testid="vereinsleitung-meeting-card-open-label"
                      aria-hidden
                    >
                      Öffnen
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

// Re-export shape alias for tests and legacy imports
export type MeetingListItemShape = MeetingListItem;

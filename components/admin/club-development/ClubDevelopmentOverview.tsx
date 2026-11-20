import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import { SCE_CD_RECORD_ROW_CLASS } from "./sce-club-development-surface-styles";
import { formatMeetingLocationDisplay } from "@/lib/meetings/meeting-presence-location";
import type { VereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";
import { CD_LEADERSHIP_DASHBOARD_COPY } from "@/lib/club-development/product-copy";
import { buildConnectedWorkspaceHref } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

type ClubDevelopmentOverviewProps = {
  dashboard: VereinsentwicklungLeadershipDashboard;
  orgEinheitQuery?: Record<string, string>;
  canSeeMeetings: boolean;
};

function formatSwissDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatSwissDateTime(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(new Date(date));
}

function ScopeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-md border border-[var(--border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-2)]">
      {label}
    </span>
  );
}

function ProgressStrip({
  percent,
  caption,
  ariaLabel,
}: {
  percent: number;
  caption: string;
  ariaLabel: string;
}) {
  if (caption === "Noch keine Aufgaben") {
    return <p className="text-xs text-[var(--text-2)]">{caption}</p>;
  }
  return (
    <div>
      <p className="text-xs font-medium text-[var(--foreground)]">{caption}</p>
      <div
        className="mt-1.5 h-2 w-full max-w-md overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="h-full bg-[var(--sce-primary)]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--text-2)]">{hint}</p> : null}
    </div>
  );
}

export default function ClubDevelopmentOverview({
  dashboard,
  orgEinheitQuery = {},
  canSeeMeetings,
}: ClubDevelopmentOverviewProps) {
  const { membership, umsetzung, actionRows, nextMeeting, meetingsListHref } = dashboard;
  const zieleHref = buildConnectedWorkspaceHref("ziele", orgEinheitQuery);

  const trendIcon =
    membership.trendKind === "up" ? (
      <TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />
    ) : membership.trendKind === "down" ? (
      <TrendingDown className="h-4 w-4 text-amber-700" aria-hidden />
    ) : null;

  return (
    <div className="space-y-8" data-testid="vereinsentwicklung-leadership-dashboard">
      <SceClubDevelopmentSectionShell
        title="Verein in Zahlen"
        headerAside={<ScopeBadge label={membership.scopeLabel} />}
        testId="vereinsentwicklung-section-membership"
      >
        {!membership.accessible ? (
          <SceClubDevelopmentEmptyState message="Keine Berechtigung für Mitgliederzahlen." />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-2)]">
              Zahlen gelten für den gewählten Bereich ({membership.scopeLabel}). Die Personen-Übersicht
              übernimmt keinen automatischen Org-Einheit- oder Zeitraumfilter.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBlock
                label="Mitgliederbestand"
                value={String(membership.headcount ?? "—")}
                hint={
                  membership.standDateIso
                    ? `Stand ${formatSwissDate(new Date(membership.standDateIso))}`
                    : undefined
                }
              />
              <StatBlock
                label="Eintritte"
                value={membership.entriesCurrent === null ? "—" : String(membership.entriesCurrent)}
                hint={membership.currentPeriodLabel}
              />
              <StatBlock
                label="Austritte"
                value={membership.exitsCurrent === null ? "—" : String(membership.exitsCurrent)}
                hint={membership.currentPeriodLabel}
              />
            </div>
            {membership.trendKind === "unavailable" ? (
              <p className="text-xs text-[var(--text-2)]">Keine Verlaufsdaten</p>
            ) : membership.trendLabel ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                {trendIcon}
                <span>{membership.trendLabel}</span>
              </p>
            ) : null}
            <Link
              href={membership.drillDownHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
              data-testid="vereinsentwicklung-membership-open-persons"
            >
              {CD_LEADERSHIP_DASHBOARD_COPY.openPersonsAction}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        )}
      </SceClubDevelopmentSectionShell>

      <SceClubDevelopmentSectionShell
        title="Umsetzung"
        href={umsetzung.drillDownHref}
        linkLabel="Aufgaben"
        headerAside={
          <span className="text-xs text-[var(--text-2)]">
            {umsetzung.activeTargetCount} aktive Ziele
          </span>
        }
        testId="vereinsentwicklung-section-umsetzung"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {CD_LEADERSHIP_DASHBOARD_COPY.umsetzungProgressLabel}
            </p>
            <ProgressStrip
              percent={umsetzung.aggregate.percent}
              caption={umsetzung.aggregateCaption}
              ariaLabel={`${CD_LEADERSHIP_DASHBOARD_COPY.umsetzungProgressLabel}: ${umsetzung.aggregateCaption}`}
            />
          </div>
          {umsetzung.targetRows.length === 0 ? (
            <SceClubDevelopmentEmptyState message="Keine aktiven Ziele sichtbar." />
          ) : (
            <ul className="space-y-2">
              {umsetzung.targetRows.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className={SCE_CD_RECORD_ROW_CLASS}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{row.title}</p>
                      <span className="text-xs text-[var(--text-2)] shrink-0">{row.progressCaption}</span>
                    </div>
                    {row.progressCaption !== "Noch keine Aufgaben" ? (
                      <div
                        className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]"
                        role="progressbar"
                        aria-valuenow={row.progress.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${row.title}: ${row.progressCaption}`}
                      >
                        <div
                          className="h-full bg-[var(--sce-primary)]"
                          style={{ width: `${Math.min(100, Math.max(0, row.progress.percent))}%` }}
                        />
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={zieleHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
          >
            Alle Ziele
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </SceClubDevelopmentSectionShell>

      <SceClubDevelopmentSectionShell
        title="Handlungsbedarf"
        testId="vereinsentwicklung-section-handlungsbedarf"
      >
        {actionRows.length === 0 ? (
          <SceClubDevelopmentEmptyState message="Keine offenen Punkte, die Ihre Aufmerksamkeit brauchen." />
        ) : (
          <ul className="space-y-2">
            {actionRows.map((row) => (
              <li key={row.id}>
                <Link href={row.href} className={`flex gap-3 ${SCE_CD_RECORD_ROW_CLASS}`}>
                  <AlertCircle
                    className="h-4 w-4 shrink-0 text-[var(--foreground)]"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {row.title}
                    </p>
                    <p className="text-xs text-[var(--text-2)] mt-0.5">{row.meta}</p>
                  </div>
                  <ScopeBadge label={row.scope === "me" ? "Meine Aufgaben" : "Vereinsweit"} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SceClubDevelopmentSectionShell>

      {canSeeMeetings ? (
        <SceClubDevelopmentSectionShell
          title="Nächste Sitzung"
          href={meetingsListHref}
          linkLabel="Alle Sitzungen"
          testId="vereinsentwicklung-section-meetings"
        >
          {!nextMeeting ? (
            <SceClubDevelopmentEmptyState message="Keine geplanten Sitzungen in Sicht." />
          ) : (
            <Link href={nextMeeting.href} className={SCE_CD_RECORD_ROW_CLASS}>
              <p className="text-sm font-semibold text-[var(--foreground)]">{nextMeeting.meeting.title}</p>
              <p className="mt-1 text-xs text-[var(--text-2)] flex flex-wrap items-center gap-x-2 gap-y-1">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{formatSwissDateTime(new Date(nextMeeting.meeting.meetingDate))}</span>
                {nextMeeting.meeting.location ? (
                  <span>· {formatMeetingLocationDisplay(nextMeeting.meeting.location)}</span>
                ) : null}
              </p>
            </Link>
          )}
        </SceClubDevelopmentSectionShell>
      ) : null}
    </div>
  );
}
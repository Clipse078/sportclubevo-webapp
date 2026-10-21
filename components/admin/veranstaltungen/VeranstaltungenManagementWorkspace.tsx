import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, Plus } from "lucide-react";
import type { ClubEvent } from "@/lib/events/club-events-service";
import ClubEventComposerDraftList, {
  type ClubEventComposerDraftListItem,
} from "./ClubEventComposerDraftList";
import {
  formatMonthLabel,
  resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import PlanningManagementOperationalSummary from "@/components/admin/planning/PlanningManagementOperationalSummary";
import { buildVeranstaltungenOperationalSummaryItems } from "@/lib/veranstaltungen/veranstaltungen-operational-summary";
import { SceDenseToolbar } from "@/components/sce/dense/SceDenseToolbar";
import {
  PLANNING_WORKSPACE_MAIN_RAIL_GRID,
  PLANNING_WORKSPACE_RAIL_ASIDE,
  PLANNING_WORKSPACE_RAIL_STACK } from "@/components/admin/planning/planning-management-layout";
import SpieleManagementMonthCalendar from "@/components/admin/matchcenter/SpieleManagementMonthCalendar";
import VeranstaltungenManagementToolbar from "./VeranstaltungenManagementToolbar";
import VeranstaltungenManagementFilterRail from "./VeranstaltungenManagementFilterRail";
import VeranstaltungListRow from "./VeranstaltungListRow";
import {
  buildVeranstaltungenHref,
  type VeranstaltungenPublicationFilter,
  type VeranstaltungenReviewFilter } from "@/lib/veranstaltungen/navigation";
import {
  collectVeranstaltungenCalendarDayKeys,
  computeVeranstaltungenKpis,
  filterVeranstaltungenEvents,
  groupVeranstaltungenByMonth,
  listVeranstaltungenLocationOptions,
  partitionVeranstaltungenByTab } from "@/lib/veranstaltungen/management-view";
import type { VeranstaltungenTab } from "@/lib/veranstaltungen/navigation";

export { normalizeVeranstaltungenTab } from "@/lib/veranstaltungen/navigation";
export type { VeranstaltungenTab };

const DOMAIN_TABS: { key: VeranstaltungenTab; label: string }[] = [
  { key: "BEVORSTEHEND", label: "Bevorstehend" },
  { key: "VERGANGEN", label: "Vergangen" },
  { key: "ARCHIV", label: "Archiv" },
];

type Props = {
  events: ClubEvent[];
  tab: VeranstaltungenTab;
  canManage: boolean;
  timeZone?: string | null;
  basePath?: string;
  /** Explicit list filter month (`YYYY-MM`), null = all months in tab scope. */
  monthParam?: string | null;
  /** Calendar rail browse month when no list filter is active. */
  calMonthParam?: string | null;
  currentMonthParam?: string;
  searchQuery?: string;
  locationFilter?: string | null;
  reviewFilter?: VeranstaltungenReviewFilter;
  publicationFilter?: VeranstaltungenPublicationFilter;
  composerDrafts?: ClubEventComposerDraftListItem[];
  activityCreateTrigger?: ReactNode;
  activityCreateQuickAccessTrigger?: ReactNode;
};

export default function VeranstaltungenManagementWorkspace({
  events,
  tab,
  canManage,
  timeZone,
  basePath = "/dashboard/veranstaltungen",
  monthParam = null,
  calMonthParam = null,
  currentMonthParam,
  searchQuery = "",
  locationFilter = null,
  reviewFilter = "ALLE",
  publicationFilter = "ALLE",
  composerDrafts = [],
  activityCreateTrigger = null,
  activityCreateQuickAccessTrigger: _activityCreateQuickAccessTrigger = null,
}: Props) {
  void _activityCreateQuickAccessTrigger;
  const tz = timeZone ?? "Europe/Zurich";
  const now = new Date();

  const listMonthWindow = monthParam
    ? resolveMatchcenterMonthWindow({ monthParam, timeZone: tz })
    : null;

  const calendarMonthWindow = resolveMatchcenterMonthWindow({
    monthParam: monthParam ?? calMonthParam ?? undefined,
    timeZone: tz });

  const urlState = {
    tab,
    month: monthParam,
    cal: monthParam ? null : calMonthParam,
    search: searchQuery,
    location: locationFilter,
    review: reviewFilter,
    publication: publicationFilter };

  const buildHref = (overrides: Partial<typeof urlState>) =>
    buildVeranstaltungenHref(basePath, { ...urlState, ...overrides });

  const kpis = computeVeranstaltungenKpis(events, now);
  const tabEvents = partitionVeranstaltungenByTab(events, tab, now);
  const filtered = filterVeranstaltungenEvents(tabEvents, {
    search: searchQuery,
    location: locationFilter,
    review: reviewFilter,
    publication: publicationFilter,
    monthFrom: listMonthWindow?.from,
    monthTo: listMonthWindow?.to,
    timeZone: tz });
  const groups = groupVeranstaltungenByMonth(filtered, tz);
  const calendarDayKeys = collectVeranstaltungenCalendarDayKeys(tabEvents, tz);
  const locationOptions = listVeranstaltungenLocationOptions(events);

  const todayHref = monthParam
    ? buildHref({ month: currentMonthParam ?? calendarMonthWindow.param })
    : buildHref({ cal: currentMonthParam ?? calendarMonthWindow.param, month: null });

  const resetHref = buildHref({
    search: "",
    location: null,
    review: "ALLE",
    publication: "ALLE",
    month: null,
    cal: null });

  const calendarPreviousHref = monthParam
    ? buildHref({ month: calendarMonthWindow.previousParam })
    : buildHref({ cal: calendarMonthWindow.previousParam, month: null });

  const calendarNextHref = monthParam
    ? buildHref({ month: calendarMonthWindow.nextParam })
    : buildHref({ cal: calendarMonthWindow.nextParam, month: null });

  const locationHrefByValue: Record<string, string> = {
    "": buildHref({ location: null }),
    ...Object.fromEntries(locationOptions.map((loc) => [loc, buildHref({ location: loc })])) };

  const reviewHrefByValue: Record<VeranstaltungenReviewFilter, string> = {
    ALLE: buildHref({ review: "ALLE" }),
    DRAFT: buildHref({ review: "DRAFT" }),
    APPROVED: buildHref({ review: "APPROVED" }),
    PUBLISHED: buildHref({ review: "PUBLISHED" }) };

  const publicationHrefByValue: Record<VeranstaltungenPublicationFilter, string> = {
    ALLE: buildHref({ publication: "ALLE" }),
    PUBLIC: buildHref({ publication: "PUBLIC" }),
    INTERNAL: buildHref({ publication: "INTERNAL" }) };

  const filtersActive =
    Boolean(searchQuery.trim()) ||
    Boolean(locationFilter) ||
    Boolean(monthParam) ||
    reviewFilter !== "ALLE" ||
    publicationFilter !== "ALLE";

  return (
    <div className="w-full space-y-4" data-testid="veranstaltungen-management-workspace">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Veranstaltungen"
        title="Veranstaltungen"
        subtitle="Tenant-verwaltete Vereinsanlässe wie Generalversammlung, Trainersitzung, Sponsorenanlass und weitere Vereinsevents."
        subtitleTestId="veranstaltungen-header-subtitle"
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/veranstaltungen/freigaben"
                className="fca-button-secondary text-sm"
                data-testid="veranstaltungen-approvals-link"
              >
                Freigaben
              </Link>
              {activityCreateTrigger ?? (
                <Link
                  href="/dashboard/veranstaltungen/new"
                  className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
                  data-testid="veranstaltungen-create-link"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Veranstaltung erstellen
                </Link>
              )}
            </div>
          ) : null
        }
      />

      <nav
        aria-label="Veranstaltungen-Bereiche"
        className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[var(--border)]/70"
      >
        {DOMAIN_TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <Link
              key={item.key}
              href={buildHref({ tab: item.key })}
              aria-current={isActive ? "page" : undefined}
              data-testid={`veranstaltungen-tab-${item.key.toLowerCase()}`}
              className={cn(
                "border-b-2 pb-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-[var(--sce-primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text-2)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {canManage && composerDrafts.length > 0 ? (
        <ClubEventComposerDraftList drafts={composerDrafts} />
      ) : null}

      <PlanningManagementOperationalSummary
        items={buildVeranstaltungenOperationalSummaryItems(kpis, tab, (nextTab) =>
          buildHref({ tab: nextTab }),
        )}
        testId="veranstaltungen-operational-summary"
      />

      <div className={PLANNING_WORKSPACE_MAIN_RAIL_GRID}>
        <div className="min-w-0 space-y-4">
          <SceDenseToolbar
            className="rounded-xl border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)]/40 py-3"
            data-testid="veranstaltungen-operational-toolbar"
          >
            <VeranstaltungenManagementToolbar searchValue={searchQuery} />
          </SceDenseToolbar>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <EmptyState
                icon={<CalendarClock className="h-8 w-8" />}
                heading={
                  filtersActive
                    ? "Keine Veranstaltungen entsprechen den Filtern"
                    : tab === "ARCHIV"
                      ? "Kein Archiv vorhanden"
                      : tab === "VERGANGEN"
                        ? "Keine vergangenen Veranstaltungen"
                        : "Keine bevorstehenden Veranstaltungen"
                }
                description={
                  filtersActive
                    ? "Passen Sie Suche oder Filter an."
                    : "Erstellen Sie eine Veranstaltung für Ihren Verein."
                }
                action={
                  filtersActive ? (
                    <Link href={resetHref} className="fca-button-secondary text-sm">
                      Filter zurücksetzen
                    </Link>
                  ) : tab === "BEVORSTEHEND" && canManage && activityCreateTrigger
                    ? activityCreateTrigger
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-6" data-testid={`veranstaltungen-list-${tab.toLowerCase()}`}>
              {groups.map((group) => (
                <section key={group.key} className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    {group.heading}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    {group.events.map((event) => (
                      <VeranstaltungListRow
                        key={event.id}
                        event={event}
                        timeZone={timeZone}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside
          className={cn(PLANNING_WORKSPACE_RAIL_ASIDE, PLANNING_WORKSPACE_RAIL_STACK)}
          data-testid="veranstaltungen-management-rail"
        >
          <SpieleManagementMonthCalendar
            monthParam={calendarMonthWindow.param}
            timezone={tz}
            matchDayKeys={calendarDayKeys}
            todayHref={todayHref}
            previousMonthHref={calendarPreviousHref}
            nextMonthHref={calendarNextHref}
          />
          <VeranstaltungenManagementFilterRail
            resetHref={resetHref}
            monthParam={monthParam}
            currentMonthLabel={formatMonthLabel(calendarMonthWindow, "de-CH", tz)}
            monthAllHref={buildHref({ month: null, cal: calendarMonthWindow.param })}
            monthCurrentHref={buildHref({
              month: calendarMonthWindow.param,
              cal: null })}
            locationFilter={locationFilter}
            locationOptions={locationOptions}
            reviewFilter={reviewFilter}
            publicationFilter={publicationFilter}
            locationHrefByValue={locationHrefByValue}
            reviewHrefByValue={reviewHrefByValue}
            publicationHrefByValue={publicationHrefByValue}
          />
        </aside>
      </div>
    </div>
  );
}

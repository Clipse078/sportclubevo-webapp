import Link from "next/link";
import { FacilitySceIcon, HistorySceIcon } from "@/components/icons/domain-sce-icon-components";
import { CalendarClock, MapPin, Plus, Trophy } from "lucide-react";
import type { ClubEvent } from "@/lib/events/club-events-service";
import {
  formatMonthLabel,
  resolveMatchcenterMonthWindow } from "@/lib/matchcenter/month-range";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import PlanningManagementKpiCards from "@/components/admin/planning/PlanningManagementKpiCards";
import {
  PLANNING_WORKSPACE_MAIN_RAIL_GRID,
  PLANNING_WORKSPACE_RAIL_ASIDE,
  PLANNING_WORKSPACE_RAIL_STACK } from "@/components/admin/planning/planning-management-layout";
import SpieleManagementMonthCalendar from "@/components/admin/matchcenter/SpieleManagementMonthCalendar";
import VeranstaltungenManagementToolbar from "./VeranstaltungenManagementToolbar";
import VeranstaltungenManagementFilterRail from "./VeranstaltungenManagementFilterRail";
import VeranstaltungenManagementQuickAccess from "./VeranstaltungenManagementQuickAccess";
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
  publicationFilter = "ALLE" }: Props) {
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
            <Link
              href="/dashboard/veranstaltungen/new"
              className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
              data-testid="veranstaltungen-create-link"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Veranstaltung erstellen
            </Link>
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

      <PlanningManagementKpiCards
        testId="veranstaltungen-kpi-cards"
        metrics={[
          {
            key: "upcoming",
            label: "Bevorstehend",
            value: kpis.upcoming,
            hint: "aktive Anlässe",
            href: buildHref({ tab: "BEVORSTEHEND" }),
            active: tab === "BEVORSTEHEND",
            icon: CalendarClock,
            surface: "border-sky-500/25 bg-sky-950/40",
            iconTile: "bg-sky-500/15 text-sky-400",
            "data-testid": "veranstaltungen-kpi-upcoming" },
          {
            key: "past",
            label: "Vergangen",
            value: kpis.past,
            hint: "abgeschlossen",
            href: buildHref({ tab: "VERGANGEN" }),
            active: tab === "VERGANGEN",
            icon: HistorySceIcon,
            surface: "border-[var(--border)] bg-[var(--surface)]/80",
            iconTile: "bg-[var(--surface-2)] text-[var(--muted)]",
            "data-testid": "veranstaltungen-kpi-past" },
          {
            key: "total",
            label: "Total",
            value: kpis.total,
            hint: "ohne Archiv",
            icon: Trophy,
            surface: "border-emerald-500/25 bg-emerald-950/35",
            iconTile: "bg-emerald-500/15 text-emerald-400",
            "data-testid": "veranstaltungen-kpi-total" },
          {
            key: "venues",
            label: "Veranstaltungsorte",
            value: kpis.uniqueVenues,
            hint: "mit Standortangabe",
            icon: FacilitySceIcon,
            surface: "border-[var(--border)] bg-[var(--surface)]/80",
            iconTile: "bg-[var(--surface-2)] text-[var(--muted)]",
            "data-testid": "veranstaltungen-kpi-venues" },
        ]}
      />

      <div className={PLANNING_WORKSPACE_MAIN_RAIL_GRID}>
        <div className="min-w-0 space-y-4">
          <VeranstaltungenManagementToolbar searchValue={searchQuery} />

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
                  ) : tab === "BEVORSTEHEND" && canManage ? (
                    <Link href="/dashboard/veranstaltungen/new" className="fca-button-primary">
                      <Plus className="h-4 w-4" />
                      Veranstaltung erstellen
                    </Link>
                  ) : undefined
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
          <VeranstaltungenManagementQuickAccess canManage={canManage} />
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

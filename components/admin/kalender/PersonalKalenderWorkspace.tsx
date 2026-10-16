import PersonalKalenderMonthWorkspace from "./PersonalKalenderMonthWorkspace";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import type { PersonalKalenderUrlState } from "@/lib/personal-agenda/kalender-url";
import { buildPersonalKalenderHref } from "@/lib/personal-agenda/kalender-url";
import { formatMonthParam, parseMonthParam } from "@/lib/personal-agenda/calendar-range";

type Props = {
  itemsByDayKey: Record<string, NormalizedCalendarItem[]>;
  timeLabelById: Record<string, string>;
  timeZone: string;
  urlState: PersonalKalenderUrlState;
  supported: boolean;
  todayHref?: string;
  tenantDisplayNames?: string[];
};

type PersonalKalenderWorkspaceProps = Props & {
  /** Base route for month/source navigation (default Mein Kalender). */
  basePath?: string;
  /** Override link builder (e.g. Mein Programm canonical route with view state). */
  buildNavigationHref?: (
    patch: Partial<PersonalKalenderUrlState>,
    current: PersonalKalenderUrlState,
  ) => string;
};

export default function PersonalKalenderWorkspace({
  itemsByDayKey,
  timeLabelById,
  timeZone,
  urlState,
  supported,
  todayHref,
  tenantDisplayNames,
  basePath = "/dashboard/kalender",
  buildNavigationHref,
}: PersonalKalenderWorkspaceProps) {
  const hrefFor = (patch: Partial<PersonalKalenderUrlState>) =>
    buildNavigationHref
      ? buildNavigationHref(patch, urlState)
      : buildPersonalKalenderHref(basePath, patch, urlState);

  const monthStart = parseMonthParam(urlState.month, new Date());
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const filterLinks: { key: PersonalKalenderUrlState["quelle"]; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "termine", label: "Termine" },
    { key: "aufgaben", label: "Aufgaben" },
  ];

  if (!supported) {
    return (
      <p className="text-sm text-[var(--text-2)]">
        Keine persönliche Zuordnung — verknüpfe dein Konto mit einer Person oder nutze Aufgaben
        mit Fälligkeit.
      </p>
    );
  }

  return (
    <PersonalKalenderMonthWorkspace
      monthParam={urlState.month}
      timeZone={timeZone}
      itemsByDayKey={itemsByDayKey}
      timeLabelById={timeLabelById}
      navigation={{
        previousMonthHref: hrefFor({ month: formatMonthParam(prevMonth) }),
        nextMonthHref: hrefFor({ month: formatMonthParam(nextMonth) }),
        todayHref,
      }}
      filterLinks={filterLinks.map((filter) => ({
        key: filter.key,
        label: filter.label,
        href: hrefFor({ quelle: filter.key }),
        active: urlState.quelle === filter.key,
      }))}
      tenantDisplayNames={tenantDisplayNames}
    />
  );
}

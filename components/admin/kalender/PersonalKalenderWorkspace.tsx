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

const BASE = "/dashboard/kalender";

export default function PersonalKalenderWorkspace({
  itemsByDayKey,
  timeLabelById,
  timeZone,
  urlState,
  supported,
  todayHref,
  tenantDisplayNames,
}: Props) {
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
        previousMonthHref: buildPersonalKalenderHref(
          BASE,
          { month: formatMonthParam(prevMonth) },
          urlState,
        ),
        nextMonthHref: buildPersonalKalenderHref(
          BASE,
          { month: formatMonthParam(nextMonth) },
          urlState,
        ),
        todayHref,
      }}
      filterLinks={filterLinks.map((filter) => ({
        key: filter.key,
        label: filter.label,
        href: buildPersonalKalenderHref(BASE, { quelle: filter.key }, urlState),
        active: urlState.quelle === filter.key,
      }))}
      tenantDisplayNames={tenantDisplayNames}
    />
  );
}

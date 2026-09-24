import Link from "next/link";
import { CalendarDays } from "lucide-react";
import PersonalKalenderMonthView from "./PersonalKalenderMonthView";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type { PersonalCalendarItem } from "@/lib/personal-agenda/types";
import type { PersonalKalenderUrlState } from "@/lib/personal-agenda/kalender-url";
import { buildPersonalKalenderHref } from "@/lib/personal-agenda/kalender-url";
import { formatMonthParam, parseMonthParam } from "@/lib/personal-agenda/calendar-range";
import { cn } from "@/lib/cn";

type Props = {
  programmeItems: PersonalProgrammeItem[];
  taskItems: PersonalCalendarItem[];
  timeZone: string;
  urlState: PersonalKalenderUrlState;
  supported: boolean;
  todayHref?: string;
};

const BASE = "/dashboard/kalender";

export default function PersonalKalenderWorkspace({
  programmeItems,
  taskItems,
  timeZone,
  urlState,
  supported,
  todayHref,
}: Props) {
  const monthStart = parseMonthParam(urlState.month, new Date());
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  const filterLinks: { key: PersonalKalenderUrlState["quelle"]; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "termine", label: "Termine" },
    { key: "aufgaben", label: "Aufgaben" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--primary)]" aria-hidden />
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Mein Kalender</h1>
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-0.5"
          role="group"
          aria-label="Kalenderquellen filtern"
        >
          {filterLinks.map((filter) => {
            const active = urlState.quelle === filter.key;
            return (
              <Link
                key={filter.key}
                href={buildPersonalKalenderHref(BASE, { quelle: filter.key }, urlState)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[0.8125rem] font-medium no-underline",
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                )}
                aria-current={active ? "true" : undefined}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      {!supported ? (
        <p className="text-sm text-[var(--text-2)]">
          Keine persönliche Zuordnung — verknüpfe dein Konto mit einer Person oder nutze Aufgaben
          mit Fälligkeit.
        </p>
      ) : (
        <PersonalKalenderMonthView
          monthParam={urlState.month}
          timeZone={timeZone}
          programmeItems={programmeItems}
          taskItems={taskItems}
          previousMonthHref={buildPersonalKalenderHref(
            BASE,
            { month: formatMonthParam(prevMonth) },
            urlState,
          )}
          nextMonthHref={buildPersonalKalenderHref(
            BASE,
            { month: formatMonthParam(nextMonth) },
            urlState,
          )}
          todayHref={todayHref}
        />
      )}
    </div>
  );
}

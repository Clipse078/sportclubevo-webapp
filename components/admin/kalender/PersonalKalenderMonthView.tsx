"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import PersonalProgrammeMonthCalendar from "@/components/ui/calendar/PersonalProgrammeMonthCalendar";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type { PersonalCalendarItem } from "@/lib/personal-agenda/types";
import { groupPersonalProgrammeItemsByDay } from "@/lib/personal-agenda/programme-day-key";

type Props = {
  monthParam: string;
  timeZone: string;
  programmeItems: PersonalProgrammeItem[];
  taskItems?: PersonalCalendarItem[];
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

function taskDayKey(item: PersonalCalendarItem, timeZone: string): string {
  return matchDayKeyInTimezone(item.startAt, timeZone);
}

export default function PersonalKalenderMonthView({
  monthParam,
  timeZone,
  programmeItems,
  taskItems = [],
  previousMonthHref,
  nextMonthHref,
  todayHref,
}: Props) {
  const t = useTranslations("PersonalDashboard.calendar");
  const todayKey = matchDayKeyInTimezone(new Date(), timeZone);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, PersonalCalendarItem[]>();
    for (const task of taskItems) {
      const key = taskDayKey(task, timeZone);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [taskItems, timeZone]);

  const programmeByDay = useMemo(
    () => groupPersonalProgrammeItemsByDay(programmeItems, timeZone),
    [programmeItems, timeZone],
  );

  const activityCountByDay = useMemo(() => {
    const keys = new Set<string>([...programmeByDay.keys(), ...tasksByDay.keys()]);
    const counts = new Map<string, number>();
    for (const key of keys) {
      counts.set(key, (programmeByDay.get(key)?.length ?? 0) + (tasksByDay.get(key)?.length ?? 0));
    }
    return counts;
  }, [programmeByDay, tasksByDay]);

  const selectedTasks = tasksByDay.get(selectedDayKey) ?? [];

  return (
    <div data-testid="personal-kalender-month">
      <PersonalProgrammeMonthCalendar
        monthParam={monthParam}
        timeZone={timeZone}
        items={programmeItems}
        activityCountByDay={activityCountByDay}
        selectedDayKey={selectedDayKey}
        onSelectedDayChange={setSelectedDayKey}
        navigation={{
          previousMonthHref,
          nextMonthHref,
          todayHref,
        }}
        todayDayKey={todayKey}
        headingLevel="h2"
      />

      {selectedTasks.length > 0 ? (
        <section
          className="mt-3"
          aria-label={t("selectedDayTasks")}
          data-testid="personal-kalender-selected-tasks"
        >
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{t("tasksHeading")}</h3>
          <ul className="space-y-1">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                {task.href ? (
                  <Link
                    href={task.href}
                    className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    aria-label={task.ariaLabel}
                  >
                    <ListChecks className="h-3.5 w-3.5 shrink-0 text-[var(--text-2)]" aria-hidden />
                    <span className="truncate">{task.title}</span>
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-1 px-1 py-0.5 text-[0.8125rem]"
                    aria-label={task.ariaLabel}
                  >
                    <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {task.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

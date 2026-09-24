"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PersonalProgrammeMonthCalendar from "@/components/ui/calendar/PersonalProgrammeMonthCalendar";
import type { ProgrammeFeedGroup } from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { PersonalProgrammeFeed } from "./PersonalProgrammeFeed";
import { cn } from "@/lib/cn";

export type PersonalDashboardWorkspaceProps = {
  groups: ProgrammeFeedGroup[];
  programmeItems: PersonalProgrammeItem[];
  programmeSupported: boolean;
  timeLabelById: Record<string, string>;
  monthParam: string;
  timeZone: string;
  navigation: {
    previousMonthHref: string;
    nextMonthHref: string;
    todayHref: string;
  };
  className?: string;
};

/**
 * Primary personal workspace: Mein Programm + Mein Kalender with selected-day highlight coordination.
 * Calendar selection scrolls/highlights matching programme day groups (no full-list filter).
 */
export function PersonalDashboardWorkspace({
  groups,
  programmeItems,
  programmeSupported,
  timeLabelById,
  monthParam,
  timeZone,
  navigation,
  className,
}: PersonalDashboardWorkspaceProps) {
  const todayKey = useMemo(
    () => matchDayKeyInTimezone(new Date(), timeZone),
    [timeZone],
  );
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const feedRef = useRef<HTMLDivElement>(null);

  const handleSelectedDayChange = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
  }, []);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(`[data-day-key="${selectedDayKey}"]`);
    target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [selectedDayKey]);

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-4 xl:gap-5",
        className,
      )}
      data-testid="personal-dashboard-workspace"
    >
      <div ref={feedRef} className="min-w-0 lg:col-span-7 xl:col-span-7 2xl:col-span-8">
        <PersonalProgrammeFeed
          groups={groups}
          supported={programmeSupported}
          highlightedDayKey={selectedDayKey}
          timeLabelById={timeLabelById}
        />
      </div>

      <div
        className="min-w-0 lg:col-span-5 xl:col-span-5 2xl:col-span-4"
        data-testid="personal-dashboard-calendar-column"
      >
        <PersonalProgrammeMonthCalendar
          monthParam={monthParam}
          timeZone={timeZone}
          items={programmeItems}
          selectedDayKey={selectedDayKey}
          onSelectedDayChange={handleSelectedDayChange}
          navigation={navigation}
          todayDayKey={todayKey}
          headingLevel="h2"
          showSelectedDayPanel={false}
          className="lg:sticky lg:top-4"
        />
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { DashboardTodayTimeline } from "./DashboardTodayTimeline";
import type { DashboardTodayTimelineItem } from "./DashboardTodayTimeline";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

type TodayFilter = "all" | "training" | "match" | "events";

const FILTER_OPTIONS: { key: TodayFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "training", label: "Trainings" },
  { key: "match", label: "Spiele" },
  { key: "events", label: "Events" },
];

function matchesFilter(item: TodayScheduleItem, filter: TodayFilter): boolean {
  if (filter === "all") return true;
  if (filter === "training") return item.eventType === "TRAINING";
  if (filter === "match") return item.eventType === "MATCH";
  return (
    item.eventType === "TOURNAMENT" ||
    item.eventType === "OTHER" ||
    item.eventType === "VACATION_PERIOD" ||
    item.eventType === "MEETING"
  );
}

function getAvailableFilters(items: TodayScheduleItem[]): TodayFilter[] {
  const categories = new Set<TodayFilter>();

  for (const item of items) {
    if (item.eventType === "TRAINING") categories.add("training");
    else if (item.eventType === "MATCH") categories.add("match");
    else categories.add("events");
  }

  if (categories.size <= 1) return ["all"];
  return ["all", ...FILTER_OPTIONS.map((option) => option.key).filter((key) => key !== "all" && categories.has(key))];
}

export type DashboardTodayScheduleProps = {
  items: DashboardTodayTimelineItem[];
  emptyState?: React.ReactNode;
  className?: string;
};

export function DashboardTodaySchedule({
  items,
  emptyState,
  className,
}: DashboardTodayScheduleProps) {
  const availableFilters = useMemo(() => getAvailableFilters(items), [items]);
  const [activeFilter, setActiveFilter] = useState<TodayFilter>("all");

  const showFilters = availableFilters.length > 1;
  const safeFilter = availableFilters.includes(activeFilter) ? activeFilter : "all";

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, safeFilter)),
    [items, safeFilter],
  );

  return (
    <div className={className}>
      {showFilters && (
        <div className="mb-3 flex justify-end">
          <div
            className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-[var(--surface-2)] p-0.5"
            role="tablist"
            aria-label="Heutige Termine filtern"
          >
            {availableFilters.map((filterKey) => {
              const option = FILTER_OPTIONS.find((entry) => entry.key === filterKey);
              if (!option) return null;

              const isActive = safeFilter === filterKey;

              return (
                <button
                  key={filterKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(filterKey)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[0.6875rem] font-medium transition-colors duration-150 sm:text-xs",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                    isActive
                      ? "bg-[var(--surface-3)] text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                      : "text-[var(--text-2)] hover:text-[var(--foreground)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DashboardTodayTimeline items={filteredItems} emptyState={emptyState} />
    </div>
  );
}

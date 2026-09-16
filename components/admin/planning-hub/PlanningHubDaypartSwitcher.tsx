"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  daypartAccessibleLabelDe,
  daypartLabelDe,
  daypartTimeLabelDe,
  PLANNING_HUB_DAYPART_ORDER,
  type PlanningHubCalendarDaypart,
  type PlanningHubCalendarZeitParam,
} from "@/lib/planning-hub/planning-dayparts";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

type PlanningHubDaypartSwitcherProps = {
  urlState: PlanningHubUrlState;
  activeDaypart: PlanningHubCalendarDaypart;
  showAdvancedFullDay?: boolean;
  /** PLANNING-HUB-02E — client `zeit` updates without RSC navigation. */
  onSelectDaypart?: (daypart: PlanningHubCalendarDaypart) => void;
  onSelectFullDay?: () => void;
};

export default function PlanningHubDaypartSwitcher({
  urlState,
  activeDaypart,
  showAdvancedFullDay = false,
  onSelectDaypart,
  onSelectFullDay,
}: PlanningHubDaypartSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const node = segmentRefs.current[activeDaypart];
    const container = containerRef.current;
    if (!node || !container) return;
    const containerRect = container.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    setIndicator({
      left: rect.left - containerRect.left,
      width: rect.width,
    });
  }, [activeDaypart]);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/60 px-1 py-1.5"
      data-testid="planning-hub-daypart-switcher"
    >
      <div
        ref={containerRef}
        className="relative inline-flex min-w-0 flex-1 rounded-md bg-[var(--surface-2)]/60 p-0.5"
        role="tablist"
        aria-label="Tagesabschnitt"
      >
        {indicator && (
          <div
            className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-[5px] bg-[var(--surface)] shadow-sm transition-[left,width] duration-[175ms] ease-out"
            style={{ left: indicator.left, width: indicator.width }}
            aria-hidden
          />
        )}
        {PLANNING_HUB_DAYPART_ORDER.map((daypart) => {
          const selected = daypart === activeDaypart;
          return (
            <button
              key={daypart}
              type="button"
              ref={(el) => {
                segmentRefs.current[daypart] = el;
              }}
              onClick={() => onSelectDaypart?.(daypart)}
              role="tab"
              aria-selected={selected}
              aria-label={daypartAccessibleLabelDe(daypart)}
              data-testid={`planning-hub-daypart-${daypart}`}
              className={cn(
                "relative z-[1] flex min-w-[4.5rem] flex-1 flex-col items-center rounded-[5px] px-2 py-1 text-center outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]",
                selected ? "text-[var(--foreground)]" : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              <span className="text-[11px] font-semibold leading-tight">{daypartLabelDe(daypart)}</span>
              <span className="text-[10px] tabular-nums leading-tight text-[var(--muted)]">
                {daypartTimeLabelDe(daypart)}
              </span>
            </button>
          );
        })}
      </div>
      {showAdvancedFullDay && (
        <button
          type="button"
          onClick={() => onSelectFullDay?.()}
          className="shrink-0 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text-2)]"
          data-testid="planning-hub-daypart-advanced-full"
        >
          Ganzer Tag
        </button>
      )}
    </div>
  );
}

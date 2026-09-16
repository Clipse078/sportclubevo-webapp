"use client";

import { cn } from "@/lib/cn";
import {
  daypartAccessibleLabelDe,
  daypartLabelDe,
  daypartTimeLabelDe,
  PLANNING_HUB_DAYPART_ORDER,
  type PlanningHubCalendarDaypart,
} from "@/lib/planning-hub/planning-dayparts";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";

type PlanningHubDaypartSwitcherProps = {
  urlState: PlanningHubUrlState;
  activeDaypart: PlanningHubCalendarDaypart;
  /** When `zeit=ganz`, the full-day segment is active instead of a daypart. */
  fullDayActive?: boolean;
  /** Subtle “now” cue on the active daypart when today falls in that window. */
  showNowCueInActiveDaypart?: boolean;
  showAdvancedFullDay?: boolean;
  onSelectDaypart?: (daypart: PlanningHubCalendarDaypart) => void;
  onSelectFullDay?: () => void;
};

function ActiveIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-[var(--sce-primary)]",
        className,
      )}
      aria-hidden
    />
  );
}

export default function PlanningHubDaypartSwitcher({
  urlState: _urlState,
  activeDaypart,
  fullDayActive = false,
  showNowCueInActiveDaypart = false,
  showAdvancedFullDay = false,
  onSelectDaypart,
  onSelectFullDay,
}: PlanningHubDaypartSwitcherProps) {
  return (
    <div
      className="border-b border-[var(--border)]/50 px-1.5 py-1"
      data-testid="planning-hub-daypart-switcher"
    >
      <div
        className="flex min-w-0 items-stretch overflow-x-auto rounded-md bg-[var(--surface-2)]/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Tagesabschnitt"
        data-testid="planning-hub-daypart-rail"
      >
        <div className="flex min-w-0 flex-1 items-stretch justify-between gap-0.5 px-0.5 py-0.5">
          {PLANNING_HUB_DAYPART_ORDER.map((daypart) => {
            const selected = !fullDayActive && daypart === activeDaypart;
            return (
              <button
                key={daypart}
                type="button"
                onClick={() => onSelectDaypart?.(daypart)}
                role="tab"
                aria-selected={selected}
                aria-current={selected ? "true" : undefined}
                aria-label={daypartAccessibleLabelDe(daypart)}
                data-testid={`planning-hub-daypart-${daypart}`}
                className={cn(
                  "relative flex min-w-[4.25rem] flex-1 cursor-pointer flex-col items-center rounded-[4px] px-2 py-0.5 text-center outline-none transition-[color,background-color] duration-150 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]",
                  selected
                    ? "bg-[var(--surface)]/85 text-[var(--foreground)] shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
                    : "bg-transparent text-[var(--muted)] hover:bg-[var(--surface)]/35 hover:text-[var(--text-2)]",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] leading-tight",
                    selected ? "font-medium" : "font-normal",
                  )}
                >
                  {daypartLabelDe(daypart)}
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums leading-tight",
                    selected ? "text-[var(--text-2)]" : "text-[var(--muted)]/75",
                  )}
                >
                  {daypartTimeLabelDe(daypart)}
                </span>
                {selected && <ActiveIndicator />}
                {selected && showNowCueInActiveDaypart && (
                  <span
                    className="pointer-events-none absolute bottom-1.5 right-[38%] h-1 w-1 rounded-full bg-[var(--sce-primary)]/80"
                    aria-hidden
                    title="Aktuelle Uhrzeit in diesem Abschnitt"
                  />
                )}
              </button>
            );
          })}
        </div>

        {showAdvancedFullDay && (
          <>
            <div
              className="my-1 w-px shrink-0 self-stretch bg-[var(--border)]/55"
              aria-hidden
              data-testid="planning-hub-daypart-rail-separator"
            />
            <button
              type="button"
              role="tab"
              aria-selected={fullDayActive}
              aria-current={fullDayActive ? "true" : undefined}
              onClick={() => onSelectFullDay?.()}
              data-testid="planning-hub-daypart-advanced-full"
              className={cn(
                "relative shrink-0 cursor-pointer self-center rounded-[4px] px-3 py-1.5 text-[11px] outline-none transition-[color,background-color] duration-150 ease-out",
                "focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]",
                fullDayActive
                  ? "bg-[var(--surface)]/85 font-medium text-[var(--foreground)]"
                  : "bg-transparent font-normal text-[var(--muted)] hover:bg-[var(--surface)]/35 hover:text-[var(--text-2)]",
              )}
            >
              Ganzer Tag
              {fullDayActive && (
                <ActiveIndicator className="bottom-0.5 w-8" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";
import {
  schedulerDisplayIdentity,
  schedulerResourceCodes,
  schedulerResourceLabel,
} from "@/lib/planning-hub/scheduler-display-label";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { computeResourceOccupancyWindow } from "@/lib/facilities/resource-occupancy-window";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { activityVisualStyle } from "@/lib/planning-hub/activity-visual-style";

type PlanningHubListeViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
  planName?: string | null;
  onItemActivate: (item: WeekplannerItem) => void;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function formatDayHeading(dayKey: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone,
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

function dressingOccupancyShort(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string | null {
  const hasRoom =
    item.dressingRoomAllocations.length > 0 ||
    (item.type === "MATCH" && item.awayDressingRoomAllocations.length > 0);
  if (!hasRoom || item.type === "VERANSTALTUNG") return null;

  const window = computeResourceOccupancyWindow(
    item.startAt,
    item.endAt,
    item.dressingRoomResolvedBeforeMinutes,
    item.dressingRoomResolvedAfterMinutes,
  );
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  const room = item.dressingRoomAllocations.map((r) => schedulerResourceLabel(r)).join(", ");
  return `${room} ${fmt.format(window.effectiveStartAt)}–${fmt.format(window.effectiveEndAt)}`;
}

function isItemOverridden(item: WeekplannerItem): boolean {
  const resourceOverridden =
    item.pitchOverridden ||
    item.dressingRoomOverridden ||
    (item.type === "TOURNAMENT" &&
      item.participantAllocations.some((p) => p.dressingRoomOverridden));
  return item.timeOverridden || resourceOverridden;
}

export default function PlanningHubListeView({
  week,
  urlState,
  locale,
  timezone,
  planName,
  onItemActivate,
}: PlanningHubListeViewProps) {
  const filtered = applyPlanningHubFilters(week, urlState);

  return (
    <div className="space-y-3" data-testid="planning-hub-liste">
      {filtered.days.map((day) => (
        <section key={day.dayKey}>
          <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {formatDayHeading(day.dayKey, locale, timezone)}
          </h3>
          {day.items.length === 0 ? (
            <p className="px-1 text-sm text-[var(--muted)]">Keine Einträge</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]/50 rounded-md border border-[var(--border)]/80">
              {day.items.map((item) => {
                const hasConflict = item.conflicts.length > 0;
                const resources = schedulerResourceCodes(item, 4);
                const dressing = dressingOccupancyShort(item, locale, timezone);
                const typeLabel =
                  item.type === "TRAINING" ? null : weekplannerActivityTypeLabel(item.type);
                const semantic = activityVisualStyle(item.type);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onItemActivate(item)}
                      data-testid={`weekplanner-item-${item.type.toLowerCase()}`}
                      className={cn(
                        "grid w-full grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-l-[3px] px-2 py-1.5 text-left transition hover:bg-[var(--surface-2)] sm:grid-cols-[5rem_minmax(0,1.2fr)_minmax(0,1fr)_4rem]",
                        semantic.listLeftEdgeClass,
                        hasConflict && "ring-1 ring-inset ring-amber-500/20",
                      )}
                    >
                      <span className="text-xs tabular-nums text-[var(--text-2)]">
                        {formatTimeRange(item.startAt, item.endAt, locale, timezone)}
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
                        {schedulerDisplayIdentity(item)}
                        {typeLabel && (
                          <span className="ml-1 font-normal text-[var(--muted)]">· {typeLabel}</span>
                        )}
                      </span>
                      <span className="min-w-0 truncate text-xs text-[var(--muted)]">
                        {resources || dressing || "—"}
                      </span>
                      <span className="flex items-center justify-end gap-1">
                        {planName && isItemOverridden(item) && (
                          <span
                            className="max-w-[7rem] truncate text-[10px] text-[var(--muted)]"
                            data-testid="weekplanner-override-indicator"
                          >
                            {planName} angepasst
                          </span>
                        )}
                        {hasConflict && (
                          <AlertTriangle
                            className="h-3.5 w-3.5 shrink-0 text-amber-600/80"
                            aria-label="Konflikt"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

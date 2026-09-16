"use client";

import { AlertTriangle, DoorOpen, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";
import {
  weekplannerActivityTypeLabel,
  weekplannerPrimaryLabel,
  weekplannerResourceSummary,
} from "@/lib/planning-hub/item-presenters";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { computeResourceOccupancyWindow } from "@/lib/facilities/resource-occupancy-window";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

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

function dressingOccupancyDetail(
  item: WeekplannerItem,
  locale: string,
  timeZone: string,
): string | null {
  const hasRoom =
    item.dressingRoomAllocations.length > 0 ||
    (item.type === "MATCH" && item.awayDressingRoomAllocations.length > 0) ||
    (item.type === "TOURNAMENT" &&
      item.participantAllocations.some((p) => p.dressingRoomAllocations.length > 0));
  if (!hasRoom || item.type === "VERANSTALTUNG") return null;

  const window = computeResourceOccupancyWindow(
    item.startAt,
    item.endAt,
    item.dressingRoomResolvedBeforeMinutes,
    item.dressingRoomResolvedAfterMinutes,
  );
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  const roomLabel = item.dressingRoomAllocations.map((r) => r.code).join(", ");
  return `Garderobe ${roomLabel} · Belegung ${fmt.format(window.effectiveStartAt)}–${fmt.format(window.effectiveEndAt)}`;
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
    <div className="space-y-6" data-testid="planning-hub-liste">
      {filtered.days.map((day) => (
        <section key={day.dayKey}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {formatDayHeading(day.dayKey, locale, timezone)}
          </h3>
          {day.items.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Einträge</p>
          ) : (
            <ul className="space-y-2">
              {day.items.map((item) => {
                const hasConflict = item.conflicts.length > 0;
                const dressingDetail = dressingOccupancyDetail(item, locale, timezone);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onItemActivate(item)}
                      data-testid={`weekplanner-item-${item.type.toLowerCase()}`}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-left transition hover:border-[var(--sce-primary)]/30",
                        hasConflict ? "border-amber-300/60" : "border-[var(--border)]",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {weekplannerPrimaryLabel(item)}
                        </span>
                        <span className="text-xs tabular-nums text-[var(--text-2)]">
                          {formatTimeRange(item.startAt, item.endAt, locale, timezone)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
                        <span>{weekplannerActivityTypeLabel(item.type)}</span>
                        {weekplannerResourceSummary(item) && (
                          <>
                            <span className="text-[var(--muted)]">·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {weekplannerResourceSummary(item)}
                            </span>
                          </>
                        )}
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 text-amber-800">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            Konflikt
                          </span>
                        )}
                      </div>
                      {item.type === "MATCH" && item.awayDressingRoomAllocations.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
                          <DoorOpen className="h-3 w-3" />
                          Gast: {item.awayDressingRoomAllocations.map((r) => r.name).join(", ")}
                        </span>
                      )}
                      {dressingDetail && (
                        <span
                          className="text-[11px] text-[var(--muted)]"
                          data-testid="planning-hub-liste-dressing-occupancy"
                        >
                          {dressingDetail}
                        </span>
                      )}
                      {planName && isItemOverridden(item) && (
                        <p
                          className="text-[10px] text-[var(--muted)]"
                          data-testid="weekplanner-override-indicator"
                        >
                          {planName} angepasst
                        </p>
                      )}
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

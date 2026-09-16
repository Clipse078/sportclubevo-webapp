"use client";

import { cn } from "@/lib/cn";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import type { PlanningHubUrlState } from "@/lib/planning-hub/planner-url";
import { applyPlanningHubFilters } from "@/lib/planning-hub/filters";

type PlanningHubResourceWeekViewProps = {
  week: WeekplannerWeek;
  urlState: PlanningHubUrlState;
  locale: string;
  timezone: string;
};

function formatTime(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function itemLabel(item: WeekplannerItem): string {
  if (item.type === "TRAINING") return item.teamNames[0] ?? item.title;
  if (item.type === "MATCH") return item.teamNames[0] ?? item.title;
  if (item.type === "VERANSTALTUNG") return item.title;
  return item.title;
}

function resourcesForItem(item: WeekplannerItem, category: PlanningHubUrlState["resourceCategory"]) {
  if (category === "pitch") return item.pitchAllocations;
  const refs = [...item.dressingRoomAllocations];
  if (item.type === "MATCH") refs.push(...item.awayDressingRoomAllocations);
  if (item.type === "TOURNAMENT") {
    for (const participant of item.participantAllocations) {
      refs.push(...participant.dressingRoomAllocations);
    }
  }
  const unique = new Map<string, (typeof refs)[number]>();
  for (const ref of refs) unique.set(ref.facilityResourceId, ref);
  return [...unique.values()];
}

export default function PlanningHubResourceWeekView({
  week,
  urlState,
  locale,
  timezone,
}: PlanningHubResourceWeekViewProps) {
  const filtered = applyPlanningHubFilters(week, urlState);

  const resourceMap = new Map<
    string,
    { id: string; name: string; facilityName: string; cells: Map<string, WeekplannerItem[]> }
  >();

  for (const day of filtered.days) {
    for (const item of day.items) {
      for (const resource of resourcesForItem(item, urlState.resourceCategory)) {
        const lane = resourceMap.get(resource.facilityResourceId) ?? {
          id: resource.facilityResourceId,
          name: resource.name,
          facilityName: resource.facilityName,
          cells: new Map(),
        };
        const list = lane.cells.get(day.dayKey) ?? [];
        list.push(item);
        lane.cells.set(day.dayKey, list);
        resourceMap.set(resource.facilityResourceId, lane);
      }
    }
  }

  const lanes = [...resourceMap.values()].sort((a, b) =>
    `${a.facilityName} ${a.name}`.localeCompare(`${b.facilityName} ${b.name}`, "de-CH"),
  );

  if (lanes.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
        Keine Ressourcenbelegungen für diese Filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto px-2 pb-4" data-testid="planning-hub-resource-week">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left font-semibold text-[var(--text-2)]">
              Ressource
            </th>
            {filtered.days.map((day) => (
              <th
                key={day.dayKey}
                className="min-w-[140px] border-b border-[var(--border)] px-2 py-2 text-left font-semibold text-[var(--text-2)]"
              >
                {new Intl.DateTimeFormat(locale, {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  timeZone: timezone,
                }).format(new Date(`${day.dayKey}T12:00:00.000Z`))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lanes.map((lane) => (
            <tr key={lane.id} className="border-b border-[var(--border)]/60">
              <td className="sticky left-0 z-10 bg-[var(--surface)] px-3 py-2 align-top">
                <p className="font-semibold text-[var(--foreground)]">{lane.name}</p>
                <p className="text-[10px] text-[var(--muted)]">{lane.facilityName}</p>
              </td>
              {filtered.days.map((day) => {
                const items = lane.cells.get(day.dayKey) ?? [];
                return (
                  <td key={day.dayKey} className="px-2 py-2 align-top">
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-md border px-2 py-1",
                            item.conflicts.some((c) => c.facilityResourceId === lane.id)
                              ? "border-rose-300 bg-rose-50"
                              : "border-[var(--border)] bg-[var(--surface-2)]",
                          )}
                        >
                          <p className="font-medium text-[var(--foreground)]">{itemLabel(item)}</p>
                          <p className="text-[10px] text-[var(--muted)]">
                            {formatTime(item.startAt, item.endAt, locale, timezone)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

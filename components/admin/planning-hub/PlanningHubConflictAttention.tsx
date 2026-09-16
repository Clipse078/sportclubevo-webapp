"use client";

import { AlertTriangle, Check } from "lucide-react";
import {
  buildPlanningConflictIncidents,
  countConflictsByKind,
  type PlanningConflictIncident,
} from "@/lib/planning-hub/conflict-attention";
import type { WeekplannerWeek } from "@/lib/weekplanner/types";
import { cn } from "@/lib/cn";

type PlanningHubConflictAttentionProps = {
  week: WeekplannerWeek;
  locale: string;
  timezone: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectIncident?: (incident: PlanningConflictIncident) => void;
  maxPreview?: number;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function formatDayShort(dayKey: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone,
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

export default function PlanningHubConflictAttention({
  week,
  locale,
  timezone,
  expanded,
  onToggleExpanded,
  onSelectIncident,
  maxPreview = 3,
}: PlanningHubConflictAttentionProps) {
  const incidents = buildPlanningConflictIncidents(week);
  const total = incidents.length;

  if (total === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800"
        data-testid="planning-hub-conflict-none"
      >
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>Keine Planungskonflikte diese Woche</span>
      </div>
    );
  }

  const { pitch, dressing } = countConflictsByKind(incidents);
  const parts: string[] = [];
  if (pitch > 0) parts.push(`${pitch} Spielfeld-Konflikt${pitch === 1 ? "" : "e"}`);
  if (dressing > 0) parts.push(`${dressing} Garderoben-Konflikt${dressing === 1 ? "" : "e"}`);

  const preview = expanded ? incidents : incidents.slice(0, maxPreview);

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3"
      data-testid="planning-hub-conflict-attention"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            {total} Konflikt{total === 1 ? "" : "e"}
          </p>
          {parts.length > 0 && (
            <p className="mt-0.5 text-xs text-amber-800">{parts.join(" · ")}</p>
          )}
        </div>
        {incidents.length > maxPreview && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="text-xs font-semibold text-amber-900 underline underline-offset-2"
          >
            {expanded ? "Weniger anzeigen" : "Alle Konflikte anzeigen"}
          </button>
        )}
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {preview.map((incident) => (
          <li key={incident.id}>
            <button
              type="button"
              onClick={() => onSelectIncident?.(incident)}
              className={cn(
                "flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 text-left text-xs transition",
                onSelectIncident ? "hover:bg-amber-100/80" : "",
              )}
            >
              <span className="font-semibold text-amber-950">
                {formatDayShort(incident.dayKey, locale, timezone)}{" "}
                {formatTimeRange(incident.startAt, incident.endAt, locale, timezone)}
              </span>
              <span className="text-amber-900">{incident.facilityResourceName}</span>
              <span className="text-amber-800">{incident.occupancyCount} Belegungen</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

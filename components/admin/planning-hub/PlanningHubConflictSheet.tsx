"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import {
  weekplannerActivityTypeLabel,
  weekplannerPrimaryLabel,
  weekplannerTeamLine,
} from "@/lib/planning-hub/item-presenters";
import { canInlineReassignItem, type PlanningHubReassignContext } from "@/lib/planning-hub/reassignment";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type PlanningHubConflictSheetProps = {
  incident: PlanningConflictIncident | null;
  itemsById: Map<string, WeekplannerItem>;
  locale: string;
  timezone: string;
  reassignContext?: PlanningHubReassignContext;
  onClose: () => void;
  onReassignItem?: (item: WeekplannerItem) => void;
};

function formatWhen(incident: PlanningConflictIncident, locale: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone,
  }).format(new Date(`${incident.dayKey}T12:00:00.000Z`));
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  const time = `${fmt.format(incident.startAt)}–${fmt.format(incident.endAt)}`;
  return `${day}, ${time}`;
}

function formatItemTime(item: WeekplannerItem, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(item.startAt)}–${fmt.format(item.endAt)}`;
}

function itemHref(item: WeekplannerItem): string | null {
  return getPlanningHubItemHref(item);
}

function resourceSummary(item: WeekplannerItem): string {
  const pitch = item.pitchAllocations.map((r) => r.name).join(", ");
  const rooms = item.dressingRoomAllocations.map((r) => r.name).join(", ");
  return [pitch, rooms].filter(Boolean).join(" · ") || "—";
}

export default function PlanningHubConflictSheet({
  incident,
  itemsById,
  locale,
  timezone,
  reassignContext,
  onClose,
  onReassignItem,
}: PlanningHubConflictSheetProps) {
  if (!incident) return null;

  const involved = incident.itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is WeekplannerItem => Boolean(item));

  const kindLabel =
    incident.resourceKind === "PITCH_HALL" ? "Spielfeldkonflikt" : "Garderobenkonflikt";
  const overlapFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
  const overlapLabel = `${overlapFmt.format(incident.startAt)}–${overlapFmt.format(incident.endAt)}`;

  return (
    <Sheet open={Boolean(incident)} onClose={onClose} title="Planungskonflikt">
      <div className="space-y-4 p-1" data-testid="planning-hub-conflict-sheet">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{kindLabel}</p>
            <p className="text-sm text-[var(--text-2)]">{formatWhen(incident, locale, timezone)}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {incident.facilityResourceName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Überlappende Belegung {overlapLabel} · {incident.occupancyCount}{" "}
              {incident.occupancyCount === 1 ? "Aktivität" : "Aktivitäten"}
            </p>
            {incident.resourceKind === "DRESSING_ROOM" ? (
              <p className="mt-1 text-xs text-[var(--text-2)]">
                Belegungsfenster inkl. Garderoben-Puffer vor/nach der Spielzeit.
              </p>
            ) : null}
          </div>
        </div>

        <ul className="space-y-3">
          {involved.map((item) => {
            const href = itemHref(item);
            const canReassign = canInlineReassignItem(item, reassignContext);
            const teamLine = weekplannerTeamLine(item);

            return (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-2)]">
                    {weekplannerActivityTypeLabel(item.type)}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatItemTime(item, locale, timezone)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                  {weekplannerPrimaryLabel(item)}
                </p>
                {teamLine && <p className="text-xs text-[var(--text-2)]">{teamLine}</p>}
                <p className="mt-1 text-xs text-[var(--muted)]">{resourceSummary(item)}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {canReassign && onReassignItem && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                      onClick={() => onReassignItem(item)}
                    >
                      Neu zuweisen
                    </button>
                  )}
                  {href && (
                    <Link href={href} className="text-xs font-medium text-[var(--text-2)] hover:underline">
                      {item.type === "VERANSTALTUNG" ? "Veranstaltung bearbeiten →" : "Bearbeiten →"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import type { PlanningConflictIncident } from "@/lib/planning-hub/conflict-attention";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type PlanningHubConflictSheetProps = {
  incident: PlanningConflictIncident | null;
  itemsById: Map<string, WeekplannerItem>;
  locale: string;
  timezone: string;
  onClose: () => void;
  onEditItem?: (item: WeekplannerItem) => void;
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

function itemHref(item: WeekplannerItem): string | null {
  if (item.type === "TRAINING") return `/dashboard/training/sessions/${item.trainingSessionId}/edit`;
  if (item.type === "MATCH") return `/dashboard/matchcenter/${item.eventId}`;
  if (item.type === "TOURNAMENT") return `/dashboard/tournamentcenter/${item.eventId}`;
  if (item.type === "VERANSTALTUNG") return `/dashboard/veranstaltungen/${item.eventId}`;
  return null;
}

function resourceSummary(item: WeekplannerItem): string {
  const pitch = item.pitchAllocations.map((r) => r.name).join(", ");
  const rooms = item.dressingRoomAllocations.map((r) => r.name).join(", ");
  return [pitch, rooms].filter(Boolean).join(" · ");
}

export default function PlanningHubConflictSheet({
  incident,
  itemsById,
  locale,
  timezone,
  onClose,
  onEditItem,
}: PlanningHubConflictSheetProps) {
  if (!incident) return null;

  const involved = incident.itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is WeekplannerItem => Boolean(item));

  const kindLabel =
    incident.resourceKind === "PITCH_HALL" ? "Spielfeld-Konflikt" : "Garderoben-Konflikt";

  return (
    <Sheet open={Boolean(incident)} onClose={onClose} title="Planungskonflikt">
      <div className="space-y-4 p-1" data-testid="planning-hub-conflict-sheet">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">{kindLabel}</p>
            <p className="text-sm text-[var(--text-2)]">{formatWhen(incident, locale, timezone)}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
              {incident.facilityResourceName}
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {involved.map((item) => {
            const href = itemHref(item);
            return (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {item.teamNames[0] ?? item.title}{" "}
                  <span className="font-normal text-[var(--text-2)]">
                    {item.type === "TRAINING"
                      ? "Training"
                      : item.type === "MATCH"
                        ? "Spiel"
                        : item.type === "TOURNAMENT"
                          ? "Turnier"
                          : "Veranstaltung"}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted)]">{resourceSummary(item)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {onEditItem && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                      onClick={() => onEditItem(item)}
                    >
                      Neu zuweisen
                    </button>
                  )}
                  {href && (
                    <Link href={href} className="text-xs font-medium text-[var(--text-2)] hover:underline">
                      Bearbeiten →
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

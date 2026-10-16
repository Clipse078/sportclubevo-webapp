"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import ProgrammeSceActivityCard from "./ProgrammeSceActivityCard";
import { groupProgrammeItemsByDay } from "@/lib/programme-engine/programme-day-key";
import { sortProgrammeItems } from "@/lib/programme-engine/programme-sort";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type Props = {
  items: ProgrammeItem[];
  fmtCfg: TenantFormatConfig;
  timeZone: string;
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  filtersActive?: boolean;
};

function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return format(date, "EEEE, d. MMMM yyyy", { locale: de });
}

export default function ProgrammeListeView({
  items,
  fmtCfg,
  timeZone,
  emptyMessage = "Keine Aktivitäten im gewählten Zeitraum.",
  filteredEmptyMessage = "Keine Aktivitäten entsprechen den Filtern.",
  filtersActive = false,
}: Props) {
  const grouped = useMemo(() => {
    const sorted = sortProgrammeItems(items);
    return groupProgrammeItemsByDay(sorted, timeZone);
  }, [items, timeZone]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-sm text-[var(--muted)]" data-testid="programme-liste-empty">
        {filtersActive ? filteredEmptyMessage : emptyMessage}
      </p>
    );
  }

  const dayKeys = [...grouped.keys()].sort();

  return (
    <div className="space-y-6" data-testid="programme-liste">
      {dayKeys.map((dayKey) => (
        <section key={dayKey} aria-labelledby={`programme-day-${dayKey}`}>
          <h3
            id={`programme-day-${dayKey}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            {formatDayHeading(dayKey)}
          </h3>
          <ul className="space-y-2">
            {(grouped.get(dayKey) ?? []).map((item) => (
              <li key={item.id} className="min-w-0 list-none" data-testid={`programme-liste-row-${item.id}`}>
                <ProgrammeSceActivityCard item={item} fmtCfg={fmtCfg} density="STANDARD" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

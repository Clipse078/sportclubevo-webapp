"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { PopoverContent } from "@/components/ui/Popover";
import { summarizeAggregateCluster } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import {
  schedulerDisplayIdentity,
  schedulerResourceCodes,
} from "@/lib/planning-hub/scheduler-display-label";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  items: WeekplannerItem[];
  locale: string;
  timezone: string;
  style?: CSSProperties;
  onActivateItem: (item: WeekplannerItem) => void;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export default function PlanningHubCalendarClusterBlock({
  items,
  locale,
  timezone,
  style,
  onActivateItem,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const summary = summarizeAggregateCluster(items);
  const sorted = [...items].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id.localeCompare(b.id),
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        style={style}
        data-testid="planning-hub-calendar-cluster"
        aria-label={`${summary.activityCount} gleichzeitige Aktivitäten, ${summary.conflictCount} mit Ressourcenkonflikt`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "absolute overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]/90 px-1.5 py-1 text-left shadow-sm",
          "hover:border-[var(--sce-primary)]/40 hover:bg-[var(--surface)]",
          summary.conflictCount > 0 && "ring-1 ring-amber-400/50",
        )}
      >
        <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">
          {summary.activityCount} {summary.typeLabel} gleichzeitig
        </p>
        <p className="truncate text-[10px] text-[var(--text-2)]">{summary.identityPreview}</p>
        {summary.conflictCount > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-800">
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
            {summary.conflictCount} Ressourcenkonflikt{summary.conflictCount === 1 ? "" : "e"}
          </p>
        )}
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchAnchorWidth
        maxHeight={320}
        className="p-0"
      >
        <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
          Gleichzeitige Aktivitäten ({summary.activityCount})
        </div>
        <ul className="max-h-64 overflow-auto py-1">
          {sorted.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
                onClick={() => {
                  setOpen(false);
                  onActivateItem(item);
                }}
              >
                <span className="font-semibold text-[var(--foreground)]">
                  {schedulerDisplayIdentity(item)}
                </span>
                <span className="text-[var(--text-2)]">
                  {formatTimeRange(item.startAt, item.endAt, locale, timezone)}
                  {schedulerResourceCodes(item) ? ` · ${schedulerResourceCodes(item)}` : ""}
                </span>
                {item.conflicts.length > 0 && (
                  <span className="text-amber-800">Ressourcenkonflikt</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </>
  );
}

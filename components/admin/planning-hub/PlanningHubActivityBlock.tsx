"use client";

import type { CSSProperties } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  itemHasCanonicalConflict,
  itemHasCanonicalConflictOnResource,
  weekplannerAccessibleName,
  weekplannerActivityTypeLabel,
  weekplannerPrimaryLabel,
  weekplannerResourceSummary,
} from "@/lib/planning-hub/item-presenters";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const TYPE_ACCENT: Record<WeekplannerItem["type"], string> = {
  TRAINING: "border-l-emerald-500/70",
  MATCH: "border-l-blue-500/70",
  TOURNAMENT: "border-l-amber-500/70",
  VERANSTALTUNG: "border-l-violet-500/70",
};

type PlanningHubActivityBlockProps = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  compact?: boolean;
  resourceId?: string;
  onActivate: () => void;
  style?: CSSProperties;
  className?: string;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

export default function PlanningHubActivityBlock({
  item,
  locale,
  timezone,
  compact = false,
  resourceId,
  onActivate,
  style,
  className,
}: PlanningHubActivityBlockProps) {
  const hasConflict = resourceId
    ? itemHasCanonicalConflictOnResource(item, resourceId)
    : itemHasCanonicalConflict(item);
  const resources = weekplannerResourceSummary(item, compact ? 2 : 3);
  const time = formatTimeRange(item.startAt, item.endAt, locale, timezone);
  const primary = weekplannerPrimaryLabel(item);
  const typeLabel = weekplannerActivityTypeLabel(item.type);

  return (
    <button
      type="button"
      onClick={onActivate}
      style={style}
      aria-label={weekplannerAccessibleName(item, locale, timezone)}
      data-testid={`planning-hub-activity-block-${item.type.toLowerCase()}`}
      className={cn(
        "absolute overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] text-left shadow-sm transition hover:border-[var(--sce-primary)]/40 hover:shadow",
        "border-l-[3px]",
        TYPE_ACCENT[item.type],
        hasConflict && "ring-1 ring-amber-400/60",
        compact ? "px-1 py-0.5 text-[10px] leading-tight" : "px-1.5 py-1 text-[11px] leading-snug",
        className,
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--foreground)]">
            {primary}
            {!compact && <span className="font-normal text-[var(--muted)]"> · {typeLabel}</span>}
          </p>
          {!compact && <p className="truncate text-[var(--text-2)]">{time}</p>}
          {resources && (
            <p className={cn("truncate text-[var(--muted)]", compact && "hidden sm:block")}>
              {resources}
            </p>
          )}
        </div>
        {hasConflict && (
          <span title="Planungskonflikt" className="shrink-0">
            <AlertTriangle className="h-3 w-3 text-amber-600" aria-hidden />
          </span>
        )}
      </div>
    </button>
  );
}

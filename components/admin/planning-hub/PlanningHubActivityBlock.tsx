"use client";

import type { CSSProperties, PointerEvent } from "react";
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

export type ActivityBlockVisualVariant = "default" | "ghost" | "preview" | "preview-warning";

type PlanningHubActivityBlockProps = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  compact?: boolean;
  resourceId?: string;
  onActivate: () => void;
  style?: CSSProperties;
  className?: string;
  visualVariant?: ActivityBlockVisualVariant;
  dragTimeLabel?: string;
  canDrag?: boolean;
  canResize?: boolean;
  onPointerDownMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerDownResize?: (event: PointerEvent<HTMLDivElement>) => void;
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
  visualVariant = "default",
  dragTimeLabel,
  canDrag = false,
  canResize = false,
  onPointerDownMove,
  onPointerDownResize,
}: PlanningHubActivityBlockProps) {
  const hasConflict = resourceId
    ? itemHasCanonicalConflictOnResource(item, resourceId)
    : itemHasCanonicalConflict(item);
  const resources = weekplannerResourceSummary(item, compact ? 2 : 3);
  const time = dragTimeLabel ?? formatTimeRange(item.startAt, item.endAt, locale, timezone);
  const primary = weekplannerPrimaryLabel(item);
  const typeLabel = weekplannerActivityTypeLabel(item.type);

  const isGhost = visualVariant === "ghost";
  const isPreview = visualVariant === "preview" || visualVariant === "preview-warning";

  return (
    <div
      style={style}
      data-testid={`planning-hub-activity-block-${item.type.toLowerCase()}`}
      className={cn(
        "absolute overflow-hidden rounded-md border text-left shadow-sm",
        "border-l-[3px]",
        TYPE_ACCENT[item.type],
        isGhost && "pointer-events-none border-[var(--border)]/50 bg-[var(--surface)]/40 opacity-50",
        !isGhost &&
          !isPreview &&
          "border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--sce-primary)]/40 hover:shadow",
        isPreview &&
          "z-20 border-[var(--sce-primary)]/50 bg-[var(--surface)] shadow-md ring-1 ring-[var(--sce-primary)]/30",
        visualVariant === "preview-warning" && "ring-amber-400/50",
        hasConflict && !isGhost && "ring-1 ring-amber-400/60",
        compact ? "px-1 py-0.5 text-[10px] leading-tight" : "px-1.5 py-1 text-[11px] leading-snug",
        className,
      )}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-label={weekplannerAccessibleName(item, locale, timezone)}
        className={cn(
          "block h-full w-full text-left",
          canDrag && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={(event) => {
          if (!canDrag || !onPointerDownMove) return;
          if (event.button !== 0) return;
          event.preventDefault();
          onPointerDownMove(event);
        }}
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
          {hasConflict && !isGhost && (
            <span title="Planungskonflikt" className="shrink-0">
              <AlertTriangle className="h-3 w-3 text-amber-600" aria-hidden />
            </span>
          )}
        </div>
      </button>

      {canResize && onPointerDownResize && !isGhost && (
        <div
          role="separator"
          aria-label="Dauer anpassen"
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize bg-transparent hover:bg-[var(--sce-primary)]/20"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            onPointerDownResize(event);
          }}
        />
      )}
    </div>
  );
}

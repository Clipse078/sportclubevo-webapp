"use client";

import type { CSSProperties, PointerEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  itemHasCanonicalConflict,
  itemHasCanonicalConflictOnResource,
  weekplannerAccessibleName,
} from "@/lib/planning-hub/item-presenters";
import {
  schedulerBlockSubtitle,
  schedulerDisplayIdentity,
  schedulerResourceCodes,
} from "@/lib/planning-hub/scheduler-display-label";
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
  /** Subtle inner band for nominal activity within effective Garderobe occupancy. */
  nominalActivityBand?: { leftPercent: number; widthPercent: number };
  continuesFromBefore?: boolean;
  continuesAfter?: boolean;
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
  nominalActivityBand,
  continuesFromBefore = false,
  continuesAfter = false,
}: PlanningHubActivityBlockProps) {
  const hasConflict = resourceId
    ? itemHasCanonicalConflictOnResource(item, resourceId)
    : itemHasCanonicalConflict(item);
  const resources = schedulerResourceCodes(item, compact ? 2 : 3);
  const time = dragTimeLabel ?? formatTimeRange(item.startAt, item.endAt, locale, timezone);
  const primary = schedulerDisplayIdentity(item);
  const typeLabel = schedulerBlockSubtitle(item);

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
          "group border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--sce-primary)]/30",
        isPreview &&
          "z-20 border-[var(--sce-primary)]/50 bg-[var(--surface)] shadow-md ring-1 ring-[var(--sce-primary)]/30",
        visualVariant === "preview-warning" && "ring-amber-400/50",
        hasConflict && !isGhost && "border-l-amber-500/70",
        compact ? "px-1 py-0.5 text-[10px] leading-tight" : "px-1.5 py-1 text-[11px] leading-snug",
        className,
      )}
    >
      {continuesFromBefore && (
        <div
          className="pointer-events-none absolute inset-x-2 top-0 h-0.5 bg-[var(--foreground)]/15"
          aria-hidden
          title="Fortsetzung aus vorherigem Tagesabschnitt"
        />
      )}
      {continuesAfter && (
        <div
          className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 bg-[var(--foreground)]/15"
          aria-hidden
          title="Fortsetzung im nächsten Tagesabschnitt"
        />
      )}
      {nominalActivityBand && nominalActivityBand.widthPercent > 2 && (
        <div
          className="pointer-events-none absolute inset-y-1 rounded-sm border border-[var(--foreground)]/10 bg-[var(--foreground)]/[0.04]"
          style={{
            left: `${nominalActivityBand.leftPercent}%`,
            width: `${nominalActivityBand.widthPercent}%`,
          }}
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={onActivate}
        aria-label={[
          weekplannerAccessibleName(item, locale, timezone),
          continuesFromBefore ? "Fortsetzung aus vorherigem Tagesabschnitt" : null,
          continuesAfter ? "Fortsetzung im nächsten Tagesabschnitt" : null,
        ]
          .filter(Boolean)
          .join(", ")}
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
              {!compact && typeLabel && (
                <span className="font-normal text-[var(--muted)]"> · {typeLabel}</span>
              )}
            </p>
            {!compact && <p className="truncate text-[var(--text-2)]">{time}</p>}
            {!compact && resources && (
              <p className="truncate text-[var(--muted)]">{resources}</p>
            )}
          </div>
          {hasConflict && !isGhost && (
            <span title="Planungskonflikt" className="shrink-0 opacity-70 group-hover:opacity-100">
              <AlertTriangle className="h-3 w-3 text-amber-600/90" aria-hidden />
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

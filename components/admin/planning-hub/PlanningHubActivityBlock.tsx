"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useRef, type CSSProperties, type PointerEvent } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  itemHasCanonicalConflict,
  itemHasCanonicalConflictOnResource,
  weekplannerAccessibleName,
} from "@/lib/planning-hub/item-presenters";
import {
  MATCH_END_TIME_ACTION_LABEL,
  weekplannerMatchRequiresEndTimeAction,
} from "@/lib/planning-hub/match-operational-presenters";
import {
  schedulerAssignedTeamContext,
  schedulerBlockSubtitle,
  schedulerDisplayIdentity,
  schedulerResourceCodes,
  schedulerTeamContextForBlockWidth,
} from "@/lib/planning-hub/scheduler-display-label";
import { exceedsDragThreshold } from "@/components/admin/planning-hub/planning-hub-pointer-gesture";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import {
  activityVisualStyle,
  PLANNING_HUB_CONFLICT_BLOCK_CLASS,
} from "@/lib/planning-hub/activity-visual-style";
import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { getWeekplannerActivitySceIconName } from "@/lib/planning/activity-sce-icon";

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
  /** Resource timeline uses horizontal start/end handles; calendar uses vertical end (and start) handles. */
  resizeOrientation?: "horizontal" | "vertical";
  onPointerDownMove?: (clientX: number, clientY: number) => void;
  onPointerDownResize?: (edge: "start" | "end", clientX: number, clientY: number) => void;
  /** Subtle inner band for nominal activity within effective Garderobe occupancy. */
  nominalActivityBand?: { leftPercent: number; widthPercent: number };
  continuesFromBefore?: boolean;
  continuesAfter?: boolean;
};

function formatTimeRange(start: Date, end: Date, locale: string, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function capturePointer(target: EventTarget & Element, pointerId: number) {
  if (typeof (target as HTMLElement).setPointerCapture === "function") {
    (target as HTMLElement).setPointerCapture(pointerId);
  }
}

function releaseCapturedPointer(target: EventTarget & Element, pointerId: number) {
  const el = target as HTMLElement;
  if (typeof el.hasPointerCapture === "function" && el.hasPointerCapture(pointerId)) {
    el.releasePointerCapture(pointerId);
  }
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
  resizeOrientation = "vertical",
  onPointerDownMove,
  onPointerDownResize,
  nominalActivityBand,
  continuesFromBefore = false,
  continuesAfter = false,
}: PlanningHubActivityBlockProps) {
  const suppressClickRef = useRef(false);
  const pendingPointerRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const dragCommittedRef = useRef(false);

  const hasConflict = resourceId
    ? itemHasCanonicalConflictOnResource(item, resourceId)
    : itemHasCanonicalConflict(item);
  const requiresEndTimeAction = weekplannerMatchRequiresEndTimeAction(item);
  const resources = schedulerResourceCodes(item, compact ? 2 : 3);
  const time = dragTimeLabel ?? formatTimeRange(item.startAt, item.endAt, locale, timezone);
  const primary = schedulerDisplayIdentity(item);
  const typeLabel = schedulerBlockSubtitle(item);
  const teamContextRaw = schedulerAssignedTeamContext(item, { primaryLine: primary });
  const blockWidthPx =
    typeof style?.width === "number"
      ? style.width
      : Number.parseInt(String(style?.width ?? ""), 10) || 240;
  const teamContext = teamContextRaw
    ? schedulerTeamContextForBlockWidth(teamContextRaw, blockWidthPx)
    : null;
  const semantic = activityVisualStyle(item.type);
  const activitySceIcon = getWeekplannerActivitySceIconName(item.type);
  const activityIconSize = compact ? 12 : 16;

  const isGhost = visualVariant === "ghost";
  const isPreview = visualVariant === "preview" || visualVariant === "preview-warning";

  return (
    <div
      style={style}
      data-testid={`planning-hub-activity-block-${item.type.toLowerCase()}`}
      className={cn(
        "absolute overflow-hidden rounded-md border text-left shadow-sm",
        "border-l-[3px]",
        semantic.leftAccentClass,
        isGhost && "pointer-events-none border-[var(--border)]/50 bg-[var(--surface)]/40 opacity-50",
        !isGhost &&
          !isPreview &&
          cn(
            "group border-[var(--border)] transition hover:border-[var(--sce-primary)]/30",
            semantic.subtleSurfaceClass,
            canDrag && "hover:shadow-md hover:ring-1 hover:ring-[var(--sce-primary)]/15",
          ),
        isPreview &&
          "z-20 border-[var(--sce-primary)]/50 bg-[var(--surface)] shadow-md ring-1 ring-[var(--sce-primary)]/30",
        visualVariant === "preview-warning" && "ring-amber-400/50",
        hasConflict && !isGhost && PLANNING_HUB_CONFLICT_BLOCK_CLASS,
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
        onClick={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            suppressClickRef.current = false;
            return;
          }
          onActivate();
        }}
        aria-label={[
          semantic.ariaSemanticLabel,
          weekplannerAccessibleName(item, locale, timezone),
          hasConflict ? "Ressourcenkonflikt" : null,
          requiresEndTimeAction ? MATCH_END_TIME_ACTION_LABEL : null,
          continuesFromBefore ? "Fortsetzung aus vorherigem Tagesabschnitt" : null,
          continuesAfter ? "Fortsetzung im nächsten Tagesabschnitt" : null,
        ]
          .filter(Boolean)
          .join(", ")}
        className={cn(
          "block h-full w-full text-left select-none",
          canDrag && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={(event) => {
          if (!canDrag || !onPointerDownMove) return;
          if (event.button !== 0) return;
          dragCommittedRef.current = false;
          pendingPointerRef.current = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
          };
          capturePointer(event.currentTarget, event.pointerId);
        }}
        onPointerMove={(event) => {
          const pending = pendingPointerRef.current;
          if (!pending || pending.pointerId !== event.pointerId || dragCommittedRef.current) return;
          if (!exceedsDragThreshold(pending.x, pending.y, event.clientX, event.clientY)) return;
          if (!onPointerDownMove) return;
          dragCommittedRef.current = true;
          suppressClickRef.current = true;
          onPointerDownMove(pending.x, pending.y);
        }}
        onPointerUp={(event) => {
          const pending = pendingPointerRef.current;
          if (!pending || pending.pointerId !== event.pointerId) return;
          pendingPointerRef.current = null;
          releaseCapturedPointer(event.currentTarget, event.pointerId);
        }}
        onPointerCancel={(event) => {
          pendingPointerRef.current = null;
          dragCommittedRef.current = false;
          releaseCapturedPointer(event.currentTarget, event.pointerId);
        }}
      >
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1 font-semibold text-[var(--foreground)]">
              {activitySceIcon ? (
                <ActivitySceIcon
                  activityKind={item.type}
                  size={activityIconSize}
                  className="shrink-0"
                />
              ) : null}
              <span className="min-w-0 truncate">
                {primary}
                {!compact && typeLabel && (
                  <span className="font-normal text-[var(--muted)]"> · {typeLabel}</span>
                )}
              </span>
            </p>
            {teamContext && (
              <p className="flex min-w-0 items-center gap-0.5 truncate text-[9px] leading-tight text-[var(--muted)]">
                <ProductDomainSceIcon name="people" size={20} className="h-2.5 w-2.5 shrink-0 opacity-70" />
                <span className="truncate">{teamContext}</span>
              </p>
            )}
            {!compact && <p className="truncate text-[var(--text-2)]">{time}</p>}
            {!compact && resources && (
              <p className="truncate text-[var(--muted)]">{resources}</p>
            )}
            {!compact && requiresEndTimeAction && (
              <p className="truncate font-medium text-amber-800/90">{MATCH_END_TIME_ACTION_LABEL}</p>
            )}
          </div>
          {(hasConflict || requiresEndTimeAction) && !isGhost && (
            <span
              title={hasConflict ? "Planungskonflikt" : MATCH_END_TIME_ACTION_LABEL}
              className="shrink-0 opacity-70 group-hover:opacity-100"
            >
              <AlertTriangle className="h-3 w-3 text-amber-600/90" aria-hidden />
            </span>
          )}
        </div>
      </button>

      {canResize && onPointerDownResize && !isGhost && resizeOrientation === "vertical" && (
        <>
          <div
            role="separator"
            aria-label="Startzeit anpassen"
            className="absolute inset-x-0 top-0 z-10 h-3 cursor-ns-resize"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = true;
              onPointerDownResize("start", event.clientX, event.clientY);
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-transparent transition group-hover:bg-[var(--sce-primary)]/35"
              aria-hidden
            />
          </div>
          <div
            role="separator"
            aria-label="Endzeit anpassen"
            className="absolute inset-x-0 bottom-0 h-3 cursor-ns-resize"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = true;
              onPointerDownResize("end", event.clientX, event.clientY);
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-transparent transition group-hover:bg-[var(--sce-primary)]/35"
              aria-hidden
            />
          </div>
        </>
      )}
      {canResize && onPointerDownResize && !isGhost && resizeOrientation === "horizontal" && (
        <>
          <div
            role="separator"
            aria-label="Startzeit anpassen"
            className="absolute inset-y-0 left-0 z-10 w-3.5 cursor-ew-resize"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = true;
              onPointerDownResize("start", event.clientX, event.clientY);
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-[var(--sce-primary)]/20 transition group-hover:bg-[var(--sce-primary)]/55"
              aria-hidden
            />
          </div>
          <div
            role="separator"
            aria-label="Endzeit anpassen"
            className="absolute inset-y-0 right-0 z-10 w-3.5 cursor-ew-resize"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              suppressClickRef.current = true;
              onPointerDownResize("end", event.clientX, event.clientY);
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-1 right-0 w-[2px] rounded-full bg-[var(--sce-primary)]/20 transition group-hover:bg-[var(--sce-primary)]/55"
              aria-hidden
            />
          </div>
        </>
      )}
    </div>
  );
}

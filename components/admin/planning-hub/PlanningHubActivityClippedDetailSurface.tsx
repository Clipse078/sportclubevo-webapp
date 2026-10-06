"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildActivityClippedDetailModel,
  buildAggregateClippedDetailModel,
  type ActivityClippedDetailGeometry,
} from "@/lib/planning-hub/activity-clipped-detail";
import { useActivityClippedDetailOffer } from "@/lib/planning-hub/use-activity-clipped-detail-offer";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type PlanningHubActivityClippedDetailSurfaceProps = {
  item?: WeekplannerItem;
  aggregateItems?: WeekplannerItem[];
  aggregateTimeLabel?: string;
  locale: string;
  timezone: string;
  geometry: ActivityClippedDetailGeometry;
  children: (referenceProps: Record<string, unknown>) => ReactNode;
  /** Touch / coarse-pointer detail trigger rendered beside the card when disclosure is offered. */
  touchDetailTrigger?: boolean;
};

function sportingKind(type: WeekplannerItem["type"]): SportingActivityKind | undefined {
  if (type === "TRAINING" || type === "MATCH" || type === "TOURNAMENT") return type;
  return undefined;
}

export default function PlanningHubActivityClippedDetailSurface({
  item,
  aggregateItems,
  aggregateTimeLabel,
  locale,
  timezone,
  geometry,
  children,
  touchDetailTrigger = true,
}: PlanningHubActivityClippedDetailSurfaceProps) {
  const measureRootRef = useRef<HTMLDivElement>(null);
  const offerDisclosure = useActivityClippedDetailOffer(measureRootRef, geometry);
  const detailId = useId();
  const [open, setOpen] = useState(false);
  const [touchPinned, setTouchPinned] = useState(false);
  const touchTriggerRef = useRef<HTMLButtonElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    open: open || touchPinned,
    onOpenChange: (next) => {
      setOpen(next);
      if (!next) setTouchPinned(false);
    },
    placement: "top-start",
    strategy: "fixed",
    whileElementsMounted: open || touchPinned ? autoUpdate : undefined,
    middleware: [
      offset(8),
      flip({ padding: 12, fallbackPlacements: ["bottom-start", "top-end", "bottom-end"] }),
      shift({ padding: 12 }),
    ],
  });

  const hover = useHover(context, {
    enabled: offerDisclosure,
    delay: { open: 220, close: 80 },
    move: false,
  });
  const focus = useFocus(context, { enabled: offerDisclosure });
  const dismiss = useDismiss(context, { outsidePressEvent: "pointerdown" });
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const setMeasureRoot = useCallback((node: HTMLDivElement | null) => {
    measureRootRef.current = node;
  }, []);

  useEffect(() => {
    if (touchPinned && touchTriggerRef.current) {
      refs.setReference(touchTriggerRef.current);
    }
  }, [touchPinned, refs]);

  const model =
    aggregateItems && aggregateItems.length > 0 && aggregateTimeLabel
      ? buildAggregateClippedDetailModel(aggregateItems, locale, timezone, aggregateTimeLabel)
      : item
        ? buildActivityClippedDetailModel(item, locale, timezone)
        : null;

  const kind = item ? sportingKind(item.type) : undefined;
  const visible = offerDisclosure && (open || touchPinned) && model;

  return (
    <>
      <div
        ref={setMeasureRoot}
        className="relative h-full w-full"
        data-planning-hub-clipped-detail-root="true"
      >
        <div className="h-full w-full">
          {children(
            offerDisclosure && !touchPinned
              ? {
                  ...getReferenceProps(),
                  ref: (node: HTMLElement | null) => {
                    refs.setReference(node);
                  },
                }
              : {},
          )}
        </div>
        {offerDisclosure && touchDetailTrigger ? (
          <button
            ref={touchTriggerRef}
            type="button"
            className={cn(
              "absolute right-0.5 top-0.5 z-[5] inline-flex h-7 w-7 items-center justify-center rounded-md",
              "text-[var(--muted)] transition-[opacity,color] duration-150",
              "opacity-0 group-hover:opacity-90 group-hover:text-[var(--text-2)]",
              "group-focus-within:opacity-90 group-focus-within:text-[var(--text-2)]",
              "pointer-coarse:opacity-75 pointer-coarse:text-[var(--text-2)]",
              "pointer-coarse:border pointer-coarse:border-[var(--border)]/70 pointer-coarse:bg-[var(--surface)]/90",
              "hover:opacity-100 focus-visible:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-1",
            )}
            aria-label="Vollständige Aktivitätsdetails anzeigen"
            aria-expanded={touchPinned}
            aria-controls={detailId}
            data-testid="planning-hub-activity-detail-touch-trigger"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setTouchPinned((value) => !value);
              setOpen(false);
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {visible && model ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              id={detailId}
              data-testid="planning-hub-activity-clipped-detail"
              className="z-[80] max-w-[min(100vw-1.5rem,18rem)] rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 text-left shadow-[var(--shadow-lg)]"
              {...getFloatingProps({
                "aria-label": `${model.title}, ${model.typeLabel}`,
              })}
            >
              {model.suppressActivityTypeHeader ? (
                <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{model.title}</p>
                  {model.operationalNote ? (
                    <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      {model.operationalNote}
                    </span>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {kind ? (
                      <ActivityTypePill
                        activityKind={kind}
                        label={
                          item?.type === "MATCH"
                            ? "SPIEL"
                            : item?.type === "TRAINING"
                              ? "TRAINING"
                              : "TURNIER"
                        }
                        className="!py-0"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-2)]">
                        {model.typeLabel}
                      </span>
                    )}
                    {model.operationalNote ? (
                      <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                        {model.operationalNote}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{model.title}</p>
                </>
              )}
              <dl className="mt-2 space-y-1">
                {model.lines.map((line) => (
                  <div key={line.term} className="grid grid-cols-[4.5rem_1fr] gap-x-2 text-[11px] leading-snug">
                    <dt className="font-medium text-[var(--muted)]">{line.term}</dt>
                    <dd className="text-[var(--foreground)]">{line.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}

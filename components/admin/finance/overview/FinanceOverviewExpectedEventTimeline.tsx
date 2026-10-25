"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { formatFinanceDirectionalMovementMinor } from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { buildFinanceOverviewEventTimelineModel } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";
import {
  formatFinanceOverviewEventTimelineAxisMonth,
  formatFinanceOverviewEventTimelineWhenLabel,
} from "@/lib/finance/presentation/format-finance-overview-event-timeline-labels";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";

export type FinanceOverviewExpectedEventTimelineLabels = {
  monthPrecisionHint: string;
  rangePrecisionHint: string;
  semanticClarification: string;
  moreEventsAffordance: string;
};

type FinanceOverviewExpectedEventTimelineProps = {
  visual: FinanceForecastTimingVisualModel;
  baseCurrency: string | null;
  formattingLocale: string;
  labels: FinanceOverviewExpectedEventTimelineLabels;
};

/** Desktop/tablet canvas target (FIN-05D-R2 executive density). */
export const FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX = 200;

const AXIS_YEAR_ROW_PX = 14;
const AXIS_MONTH_ROW_PX = 18;
const EVENT_LANE_HEIGHT_PX = 46;
const CANVAS_HORIZONTAL_PAD_PX = 12;

function tickTranslateClass(alignment: "start" | "center" | "end"): string {
  if (alignment === "start") return "translate-x-0 text-left";
  if (alignment === "end") return "-translate-x-full text-right";
  return "-translate-x-1/2 text-center";
}

export function FinanceOverviewExpectedEventTimeline({
  visual,
  baseCurrency,
  formattingLocale,
  labels,
}: FinanceOverviewExpectedEventTimelineProps) {
  const model = useMemo(() => buildFinanceOverviewEventTimelineModel(visual), [visual]);
  const [overflowExpanded, setOverflowExpanded] = useState(false);

  const laneByEventId = useMemo(() => {
    const map = new Map<string, number>();
    for (const assignment of model.laneLayout.assignments) {
      map.set(assignment.eventId, assignment.laneIndex);
    }
    return map;
  }, [model.laneLayout.assignments]);

  const collapsedSet = useMemo(
    () => new Set(model.laneLayout.collapsedEventIds),
    [model.laneLayout.collapsedEventIds],
  );

  const eventAreaTop = AXIS_YEAR_ROW_PX + AXIS_MONTH_ROW_PX + 8;

  const renderEventBlock = (
    entry: (typeof model.entries)[number],
    lane: number,
    options?: { compact?: boolean },
  ) => {
    const amountText = formatFinanceDirectionalMovementMinor({
      amountMinor: entry.amountMinor,
      direction: entry.direction,
      currency: baseCurrency,
      formattingLocale,
    });
    const whenLabel = formatFinanceOverviewEventTimelineWhenLabel(entry, formattingLocale);
    const precisionHint =
      entry.visualKind === "MONTH"
        ? labels.monthPrecisionHint
        : entry.visualKind === "DATE_RANGE"
          ? labels.rangePrecisionHint
          : null;
    const accent =
      entry.direction === "INCOME" ? "var(--sce-success)" : "var(--sce-danger)";

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.currentTarget.focus();
      }
    };

    const top = eventAreaTop + lane * EVENT_LANE_HEIGHT_PX;

    return (
      <div
        key={entry.eventId}
        className={cn(
          "absolute min-w-0 max-w-[148px]",
          entry.visualKind === "EXACT_DATE" ? "w-[148px]" : "",
        )}
        style={{
          left: `calc(${CANVAS_HORIZONTAL_PAD_PX}px + (100% - ${CANVAS_HORIZONTAL_PAD_PX * 2}px) * ${entry.xStartFraction})`,
          top,
          width:
            entry.visualKind === "EXACT_DATE"
              ? undefined
              : `calc((100% - ${CANVAS_HORIZONTAL_PAD_PX * 2}px) * ${(entry.xEndFraction - entry.xStartFraction)})`,
        }}
        data-finance-overview-timeline-event={entry.eventId}
        data-finance-overview-timeline-kind={entry.visualKind}
        data-finance-overview-timeline-lane={lane}
        tabIndex={0}
        role="group"
        aria-label={`${whenLabel} ${amountText} ${entry.accountName}${precisionHint ? ` ${precisionHint}` : ""}`}
        onKeyDown={handleKeyDown}
      >
        {entry.visualKind === "EXACT_DATE" ? (
          <div className="flex items-start gap-1" aria-hidden>
            <div className="flex flex-col items-center">
              <span
                className="block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span className="mt-0.5 h-3 w-px bg-[var(--sce-surface-border-subtle)]" />
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="text-[10px] font-medium leading-tight text-[var(--muted)]">{whenLabel}</p>
              <p
                className={cn(
                  "text-xs font-semibold tabular-nums leading-tight",
                  entry.direction === "INCOME"
                    ? "text-[var(--sce-success)]"
                    : "text-[var(--sce-danger)]",
                )}
              >
                {amountText}
              </p>
              {!options?.compact ? (
                <>
                  <p className="truncate text-[11px] leading-tight text-[var(--text-2)]">
                    {entry.accountName}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div
              className="relative mb-1 flex h-3 items-center"
              aria-hidden
              style={{ width: "100%", minWidth: 24 }}
            >
              <span
                className="absolute top-0 bottom-0 w-px"
                style={{ left: 0, backgroundColor: accent }}
              />
              <span
                className="absolute top-1/2 h-px w-full -translate-y-1/2 opacity-70"
                style={{ backgroundColor: accent }}
              />
              <span
                className="absolute top-0 bottom-0 w-px"
                style={{ right: 0, backgroundColor: accent }}
              />
            </div>
            <p className="text-[10px] font-medium leading-tight text-[var(--muted)]">{whenLabel}</p>
            <p
              className={cn(
                "text-xs font-semibold tabular-nums leading-tight",
                entry.direction === "INCOME"
                  ? "text-[var(--sce-success)]"
                  : "text-[var(--sce-danger)]",
              )}
            >
              {amountText}
            </p>
            {!options?.compact ? (
              <>
                <p className="truncate text-[11px] leading-tight text-[var(--text-2)]">
                  {entry.accountName}
                </p>
                {precisionHint ? (
                  <p className="text-[10px] leading-tight text-[var(--muted)]">{precisionHint}</p>
                ) : null}
              </>
            ) : null}
          </div>
        )}
        {entry.visualKind === "EXACT_DATE" && !options?.compact ? (
          <p className="sr-only">{precisionHint}</p>
        ) : null}
      </div>
    );
  };

  const overflowCount = model.laneLayout.collapsedEventIds.length;
  const moreLabel = labels.moreEventsAffordance.replace("{count}", String(overflowCount));

  return (
    <div
      className="min-w-0"
      data-finance-overview-event-timeline
      data-finance-overview-timeline-trimmed={
        model.windowStartDateIso !== visual.window.startDateIso ? "true" : undefined
      }
    >
      <p className="sr-only">{labels.semanticClarification}</p>

      <div className="hidden min-w-0 sm:block" data-finance-overview-event-timeline-desktop>
        <div
          className="relative w-full min-w-0 overflow-hidden rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)]"
          style={{ height: FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX }}
          data-finance-overview-event-timeline-canvas-height={FINANCE_OVERVIEW_EVENT_TIMELINE_CANVAS_HEIGHT_PX}
        >
          {/* Year context */}
          <div
            className="absolute inset-x-0 top-1.5 px-3"
            style={{ height: AXIS_YEAR_ROW_PX }}
            aria-hidden
          >
            {model.yearBands.map((band) => {
              return (
                <span
                  key={`${band.label}-${band.startFraction}`}
                  className="absolute text-[10px] font-medium tabular-nums text-[var(--muted)]"
                  style={{
                    left: `${band.startFraction * 100}%`,
                    width: `${(band.endFraction - band.startFraction) * 100}%`,
                    textAlign: "center",
                  }}
                >
                  {band.label}
                </span>
              );
            })}
          </div>

          {/* Month axis */}
          <div
            className="absolute inset-x-0 border-b border-[var(--sce-surface-border-subtle)] px-3"
            style={{ top: AXIS_YEAR_ROW_PX + 4, height: AXIS_MONTH_ROW_PX + 4 }}
          >
            {model.axisTicks.map((tick) => (
              <div
                key={tick.dateIso}
                className={cn("absolute top-0", tickTranslateClass(tick.alignment))}
                style={{
                  left: `calc(${CANVAS_HORIZONTAL_PAD_PX}px + (100% - ${CANVAS_HORIZONTAL_PAD_PX * 2}px) * ${tick.xFraction})`,
                  maxWidth: 56,
                }}
              >
                <span className="text-[10px] font-medium tracking-wide text-[var(--muted)]">
                  {formatFinanceOverviewEventTimelineAxisMonth(tick.monthIndex, formattingLocale)}
                </span>
              </div>
            ))}
          </div>

          {/* Quiet finance-year boundary */}
          {model.financeYearEndFraction !== null ? (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-0 w-px bg-[var(--muted)]/25"
              style={{
                left: `calc(${CANVAS_HORIZONTAL_PAD_PX}px + (100% - ${CANVAS_HORIZONTAL_PAD_PX * 2}px) * ${model.financeYearEndFraction})`,
              }}
              aria-hidden
            />
          ) : null}

          <div className="relative z-10 h-full">
            {model.entries.map((entry) => {
              if (collapsedSet.has(entry.eventId)) {
                return null;
              }
              const lane = laneByEventId.get(entry.eventId);
              if (lane === undefined) {
                return null;
              }
              return renderEventBlock(entry, lane);
            })}
          </div>

          {overflowCount > 0 ? (
            <div
              className="absolute bottom-1.5 right-2 z-20"
              data-finance-overview-timeline-overflow
            >
              <button
                type="button"
                className="rounded border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                aria-expanded={overflowExpanded}
                onClick={() => setOverflowExpanded((v) => !v)}
              >
                {overflowExpanded ? "−" : moreLabel}
              </button>
              {overflowExpanded ? (
                <ul className="sr-only">
                  {model.laneLayout.collapsedEventIds.map((id) => {
                    const entry = model.entries.find((e) => e.eventId === id);
                    if (!entry) return null;
                    return <li key={id}>{entry.accountName}</li>;
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        {overflowExpanded && overflowCount > 0 ? (
          <ul
            className="mt-2 space-y-1 rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)] p-2"
            data-finance-overview-timeline-overflow-expanded
          >
            {model.laneLayout.collapsedEventIds.map((id) => {
              const entry = model.entries.find((e) => e.eventId === id);
              if (!entry) return null;
              return (
                <li key={id} className="text-xs text-[var(--foreground)]">
                  {formatFinanceOverviewEventTimelineWhenLabel(entry, formattingLocale)}{" "}
                  {formatFinanceDirectionalMovementMinor({
                    amountMinor: entry.amountMinor,
                    direction: entry.direction,
                    currency: baseCurrency,
                    formattingLocale,
                  })}{" "}
                  {entry.accountName}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <ol
        className="space-y-2 sm:hidden"
        data-finance-overview-event-timeline-mobile
      >
        {model.entries.map((entry) => {
          const amountText = formatFinanceDirectionalMovementMinor({
            amountMinor: entry.amountMinor,
            direction: entry.direction,
            currency: baseCurrency,
            formattingLocale,
          });
          const whenLabel = formatFinanceOverviewEventTimelineWhenLabel(entry, formattingLocale);
          const precisionHint =
            entry.visualKind === "MONTH"
              ? labels.monthPrecisionHint
              : entry.visualKind === "DATE_RANGE"
                ? labels.rangePrecisionHint
                : null;
          return (
            <li
              key={entry.eventId}
              className="border-b border-[var(--sce-surface-border-subtle)] py-2 last:border-b-0"
              data-finance-overview-timeline-event={entry.eventId}
            >
              <p className="text-xs font-medium text-[var(--muted)]">{whenLabel}</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  entry.direction === "INCOME"
                    ? "text-[var(--sce-success)]"
                    : "text-[var(--sce-danger)]",
                )}
              >
                {amountText}
              </p>
              <p className="text-sm text-[var(--text-2)]">{entry.accountName}</p>
              {precisionHint ? (
                <p className="text-xs text-[var(--muted)]">{precisionHint}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

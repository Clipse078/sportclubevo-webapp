"use client";

import { useMemo, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { formatFinanceDirectionalMovementMinor } from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { buildFinanceOverviewEventTimelineModel } from "@/lib/finance/presentation/build-finance-overview-event-timeline-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  formatExpectedFinancialEventTimingLabel,
  type ExpectedEventTimingDisplayInput,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";

export type FinanceOverviewExpectedEventTimelineLabels = {
  monthPrecisionHint: string;
  rangePrecisionHint: string;
  financeYearEndMarker: string;
  semanticClarification: string;
};

type FinanceOverviewExpectedEventTimelineProps = {
  visual: FinanceForecastTimingVisualModel;
  baseCurrency: string | null;
  formattingLocale: string;
  labels: FinanceOverviewExpectedEventTimelineLabels;
};

const TIMELINE_HEIGHT_PX = 280;
const AXIS_TOP_PX = 48;
const LANE_HEIGHT_PX = 52;

function markerTimingInput(
  entry: ReturnType<typeof buildFinanceOverviewEventTimelineModel>["entries"][number],
): ExpectedEventTimingDisplayInput {
  if (entry.visualKind === "EXACT_DATE") {
    return {
      timingPrecision: "EXACT_DATE",
      expectedDateIso: entry.startDateIso,
      expectedMonthStartIso: null,
      rangeStartDateIso: null,
      rangeEndDateIso: null,
    };
  }
  if (entry.visualKind === "MONTH") {
    return {
      timingPrecision: "MONTH",
      expectedDateIso: null,
      expectedMonthStartIso: entry.startDateIso,
      rangeStartDateIso: null,
      rangeEndDateIso: null,
    };
  }
  return {
    timingPrecision: "DATE_RANGE",
    expectedDateIso: null,
    expectedMonthStartIso: null,
    rangeStartDateIso: entry.startDateIso,
    rangeEndDateIso: entry.endDateIso,
  };
}

function formatAxisMonth(monthIndex: number, year: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function formatCompactEventDate(
  entry: ReturnType<typeof buildFinanceOverviewEventTimelineModel>["entries"][number],
  locale: string,
): string {
  if (entry.visualKind === "EXACT_DATE") {
    const [y, m, d] = entry.startDateIso.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  return formatExpectedFinancialEventTimingLabel(markerTimingInput(entry), locale);
}

export function FinanceOverviewExpectedEventTimeline({
  visual,
  baseCurrency,
  formattingLocale,
  labels,
}: FinanceOverviewExpectedEventTimelineProps) {
  const model = useMemo(() => buildFinanceOverviewEventTimelineModel(visual), [visual]);

  const laneCount = Math.max(1, Math.min(4, model.entries.length));

  return (
    <div className="min-w-0" data-finance-overview-event-timeline>
      <p className="sr-only">{labels.semanticClarification}</p>

      {/* Desktop / tablet: horizontal timeline */}
      <div className="hidden min-w-0 sm:block" data-finance-overview-event-timeline-desktop>
        <div
          className="relative w-full min-w-0 overflow-hidden rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)]"
          style={{ height: TIMELINE_HEIGHT_PX }}
        >
          <div
            className="absolute inset-x-0 border-b border-[var(--sce-surface-border-subtle)]"
            style={{ top: AXIS_TOP_PX }}
            aria-hidden
          />
          {model.axisTicks.map((tick) => (
            <div
              key={tick.dateIso}
              className="absolute top-0 -translate-x-1/2 text-center"
              style={{ left: `${tick.xFraction * 100}%`, width: 48 }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                {formatAxisMonth(tick.monthIndex, tick.year, formattingLocale)}
              </span>
              {tick.dateIso === model.axisTicks[0]?.dateIso ||
              tick.year !== model.axisTicks[0]?.year ? (
                <span className="block text-[9px] text-[var(--muted)]">{tick.year}</span>
              ) : null}
            </div>
          ))}

          {model.financeYearEndFraction !== null ? (
            <div
              className="absolute bottom-2 top-0 w-px bg-[var(--muted)] opacity-40"
              style={{ left: `${model.financeYearEndFraction * 100}%` }}
              aria-hidden
            >
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-[9px] text-[var(--muted)]"
                style={{ top: AXIS_TOP_PX + 4, left: 0 }}
              >
                {labels.financeYearEndMarker}
              </span>
            </div>
          ) : null}

          {model.entries.map((entry, index) => {
            const lane = index % laneCount;
            const top = AXIS_TOP_PX + 12 + lane * LANE_HEIGHT_PX;
            const leftPct = entry.xStartFraction * 100;
            const widthPct = Math.max(
              entry.visualKind === "EXACT_DATE" ? 0 : 1.5,
              (entry.xEndFraction - entry.xStartFraction) * 100,
            );
            const amountText = formatFinanceDirectionalMovementMinor({
              amountMinor: entry.amountMinor,
              direction: entry.direction,
              currency: baseCurrency,
              formattingLocale,
            });
            const timingLabel = formatCompactEventDate(entry, formattingLocale);
            const precisionHint =
              entry.visualKind === "MONTH"
                ? labels.monthPrecisionHint
                : entry.visualKind === "DATE_RANGE"
                  ? labels.rangePrecisionHint
                  : null;

            const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.focus();
              }
            };

            return (
              <div
                key={entry.eventId}
                className="absolute min-w-0 max-w-[140px]"
                style={{
                  left: `${leftPct}%`,
                  top,
                  width: entry.visualKind === "EXACT_DATE" ? undefined : `${widthPct}%`,
                }}
                data-finance-overview-timeline-event={entry.eventId}
                data-finance-overview-timeline-kind={entry.visualKind}
                tabIndex={0}
                role="group"
                aria-label={`${timingLabel} ${amountText} ${entry.accountName}`}
                onKeyDown={handleKeyDown}
              >
                {entry.visualKind === "EXACT_DATE" ? (
                  <span
                    className={cn(
                      "mb-1 inline-block h-2 w-2 rounded-full",
                      entry.direction === "INCOME"
                        ? "bg-[var(--sce-success)]"
                        : "bg-[var(--sce-danger)]",
                    )}
                    aria-hidden
                  />
                ) : (
                  <div
                    className={cn(
                      "mb-1 h-1 rounded-sm border",
                      entry.direction === "INCOME"
                        ? "border-[var(--sce-success)] bg-[var(--sce-success)]/20"
                        : "border-[var(--sce-danger)] bg-[var(--sce-danger)]/20",
                    )}
                    aria-hidden
                  />
                )}
                <p className="text-[10px] font-medium text-[var(--muted)]">{timingLabel}</p>
                <p className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                  {amountText}
                </p>
                <p className="truncate text-[11px] text-[var(--text-2)]">{entry.accountName}</p>
                {precisionHint ? (
                  <p className="text-[10px] text-[var(--muted)]">{precisionHint}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: chronological list */}
      <ol
        className="space-y-3 sm:hidden"
        data-finance-overview-event-timeline-mobile
      >
        {model.entries.map((entry) => {
          const amountText = formatFinanceDirectionalMovementMinor({
            amountMinor: entry.amountMinor,
            direction: entry.direction,
            currency: baseCurrency,
            formattingLocale,
          });
          const timingLabel = formatCompactEventDate(entry, formattingLocale);
          const precisionHint =
            entry.visualKind === "MONTH"
              ? labels.monthPrecisionHint
              : entry.visualKind === "DATE_RANGE"
                ? labels.rangePrecisionHint
                : null;
          return (
            <li
              key={entry.eventId}
              className="rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)] px-3 py-2"
              data-finance-overview-timeline-event={entry.eventId}
            >
              <p className="text-xs font-medium text-[var(--muted)]">{timingLabel}</p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
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

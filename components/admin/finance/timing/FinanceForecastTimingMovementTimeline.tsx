"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FinanceVisualChartSurface,
  FinanceVisualLegend,
} from "@/components/admin/finance/visual/FinanceVisualChartSurface";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  timelineMarkerRadius,
  timelinePositionFraction,
  timelineSpanFractions,
} from "@/lib/finance/forecast/finance-forecast-timing-visual-layout";
import {
  formatExpectedFinancialEventTimingLabel,
  type ExpectedEventTimingDisplayInput,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";

type FinanceForecastTimingMovementTimelineProps = {
  visual: FinanceForecastTimingVisualModel;
  baseCurrency: string | null;
  formattingLocale: string;
  onSelectManualEvent?: (eventId: string) => void;
};

const SVG_WIDTH = 720;
const SVG_HEIGHT = 200;
const LANE_MID_INCOME = 52;
const LANE_MID_EXPENSE = 148;
const AXIS_Y = 100;

function markerToTimingInput(marker: FinanceForecastTimingVisualModel["markers"][number]): ExpectedEventTimingDisplayInput {
  return {
    timingPrecision: marker.timingPrecision,
    expectedDateIso: marker.interval.kind === "EXACT_DATE" ? marker.interval.startDateIso : null,
    expectedMonthStartIso:
      marker.interval.kind === "MONTH" ? marker.interval.startDateIso : null,
    rangeStartDateIso: marker.interval.kind === "DATE_RANGE" ? marker.interval.startDateIso : null,
    rangeEndDateIso: marker.interval.kind === "DATE_RANGE" ? marker.interval.endDateIso : null,
  };
}

export function FinanceForecastTimingMovementTimeline({
  visual,
  baseCurrency,
  formattingLocale,
  onSelectManualEvent,
}: FinanceForecastTimingMovementTimelineProps) {
  const t = useTranslations("Finance.forecast.timing.visual");
  const baseId = useId();
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  const focusedMarker = useMemo(
    () => visual.markers.find((m) => m.eventId === focusedEventId) ?? null,
    [focusedEventId, visual.markers],
  );

  const cutoffX = timelinePositionFraction({
    dateIso: visual.window.actualsThroughDateIso,
    windowStartDateIso: visual.window.startDateIso,
    windowEndDateIso: visual.window.endDateIso,
  });

  const fyEndX =
    visual.window.financeYearEndDateIso &&
    timelinePositionFraction({
      dateIso: visual.window.financeYearEndDateIso,
      windowStartDateIso: visual.window.startDateIso,
      windowEndDateIso: visual.window.endDateIso,
    });

  const showTimeline =
    visual.hasRemainingExpectation &&
    (visual.markers.length > 0 || visual.untimed.totalMinor > 0);

  if (!visual.hasRemainingExpectation) {
    return null;
  }

  return (
    <section data-finance-timing-visual-timeline className="min-w-0 space-y-3">
      <FinanceVisualChartSurface
        title={t("timelineTitle")}
        description={t("timelineDescription")}
        dataFinanceChart="forecast-timing-movement"
      >
        <FinanceVisualLegend
          items={[
            {
              key: "income",
              label: t("legendIncome"),
              swatchClassName: "bg-[var(--sce-success)]",
            },
            {
              key: "expense",
              label: t("legendExpense"),
              swatchClassName: "bg-[var(--sce-danger)]",
            },
            {
              key: "month",
              label: t("legendMonthPrecision"),
              swatchClassName: "border-[var(--muted)]",
              pattern: "dashed",
            },
            {
              key: "ambiguous",
              label: t("legendAmbiguous"),
              swatchClassName: "bg-[var(--warning)] opacity-70",
            },
          ]}
        />

        {!showTimeline ? (
          <p className="mt-3 text-sm text-[var(--text-2)]" data-finance-timing-visual-empty>
            {t("emptyTimeline")}
          </p>
        ) : (
          <>
            <p id={`${baseId}-summary`} className="sr-only">
              {t("srSummary", {
                timed: formatFinanceManagementPlanningMinor(
                  visual.timedFutureExpectationMinor,
                  baseCurrency,
                  formattingLocale,
                ),
                untimed: formatFinanceManagementPlanningMinor(
                  visual.untimed.totalMinor,
                  baseCurrency,
                  formattingLocale,
                ),
                events: visual.markers.length,
              })}
            </p>

            <div
              className="mt-3 min-w-0 overflow-x-auto overscroll-x-contain"
              data-finance-timing-timeline-scroll
            >
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="h-auto min-w-[min(100%,720px)] w-full max-w-none"
                role="img"
                aria-labelledby={`${baseId}-summary`}
              >
                <line
                  x1={0}
                  y1={AXIS_Y}
                  x2={SVG_WIDTH}
                  y2={AXIS_Y}
                  className="stroke-[var(--sce-surface-border-subtle)]"
                  strokeWidth={1}
                />
                <text x={4} y={LANE_MID_INCOME - 18} className="fill-[var(--muted)] text-[10px]">
                  {t("laneIncome")}
                </text>
                <text x={4} y={LANE_MID_EXPENSE + 24} className="fill-[var(--muted)] text-[10px]">
                  {t("laneExpense")}
                </text>

                <line
                  x1={cutoffX * SVG_WIDTH}
                  y1={16}
                  x2={cutoffX * SVG_WIDTH}
                  y2={SVG_HEIGHT - 16}
                  strokeDasharray="4 3"
                  className="stroke-[var(--muted)] opacity-60"
                />
                <text
                  x={cutoffX * SVG_WIDTH + 4}
                  y={14}
                  className="fill-[var(--muted)] text-[9px]"
                >
                  {t("cutoffLabel")}
                </text>

                {typeof fyEndX === "number" ? (
                  <>
                    <line
                      x1={fyEndX * SVG_WIDTH}
                      y1={20}
                      x2={fyEndX * SVG_WIDTH}
                      y2={SVG_HEIGHT - 20}
                      className="stroke-[var(--sce-primary)] opacity-35"
                      strokeWidth={1}
                    />
                    <text
                      x={fyEndX * SVG_WIDTH + 4}
                      y={SVG_HEIGHT - 6}
                      className="fill-[var(--muted)] text-[9px]"
                    >
                      {t("financeYearEndLabel")}
                    </text>
                  </>
                ) : null}

                {visual.markers.map((marker) => {
                  const laneY = marker.accountType === "INCOME" ? LANE_MID_INCOME : LANE_MID_EXPENSE;
                  const isAmbiguous = marker.temporalPositionAtCutoff === "AMBIGUOUS_AT_CUTOFF";
                  const isMonth = marker.interval.kind === "MONTH";
                  const isRange = marker.interval.kind === "DATE_RANGE";

                  if (isRange) {
                    const span = timelineSpanFractions({
                      startDateIso: marker.interval.startDateIso,
                      endDateIso: marker.interval.endDateIso,
                      windowStartDateIso: visual.window.startDateIso,
                      windowEndDateIso: visual.window.endDateIso,
                    });
                    const x = span.left * SVG_WIDTH;
                    const w = span.width * SVG_WIDTH;
                    const color =
                      marker.accountType === "INCOME"
                        ? "var(--sce-success)"
                        : "var(--sce-danger)";
                    return (
                      <g key={marker.eventId}>
                        <rect
                          x={x}
                          y={laneY - 6}
                          width={w}
                          height={12}
                          rx={3}
                          fill={color}
                          opacity={isAmbiguous ? 0.45 : 0.85}
                          className={cn(isAmbiguous && "stroke-[var(--warning)] stroke-1")}
                        />
                        <circle
                          cx={x + w / 2}
                          cy={laneY}
                          r={timelineMarkerRadius(marker.materialityFraction)}
                          className="fill-transparent stroke-transparent"
                          tabIndex={0}
                          role="button"
                          aria-label={t("markerAria", {
                            account: marker.accountName,
                            amount: formatFinanceManagementPlanningMinor(
                              marker.expectedAmountMinor,
                              baseCurrency,
                              formattingLocale,
                            ),
                          })}
                          onFocus={() => setFocusedEventId(marker.eventId)}
                          onBlur={() => setFocusedEventId(null)}
                          onClick={() => {
                            setFocusedEventId(marker.eventId);
                            if (marker.isManual && onSelectManualEvent) {
                              onSelectManualEvent(marker.eventId);
                            }
                          }}
                        />
                      </g>
                    );
                  }

                  const anchorX =
                    timelinePositionFraction({
                      dateIso: marker.interval.plotAnchorDateIso,
                      windowStartDateIso: visual.window.startDateIso,
                      windowEndDateIso: visual.window.endDateIso,
                    }) * SVG_WIDTH;

                  const r = timelineMarkerRadius(marker.materialityFraction);
                  const fill =
                    marker.accountType === "INCOME" ? "var(--sce-success)" : "var(--sce-danger)";

                  return (
                    <g key={marker.eventId}>
                      {isMonth ? (
                        <rect
                          x={anchorX - r - 2}
                          y={laneY - r - 2}
                          width={(r + 2) * 2}
                          height={(r + 2) * 2}
                          rx={2}
                          fill="none"
                          stroke="var(--muted)"
                          strokeDasharray="3 2"
                          opacity={0.8}
                        />
                      ) : null}
                      <circle
                        cx={anchorX}
                        cy={laneY}
                        r={r}
                        fill={fill}
                        opacity={isAmbiguous ? 0.5 : 0.95}
                        stroke={isAmbiguous ? "var(--warning)" : "var(--sce-surface-border-subtle)"}
                        strokeWidth={isAmbiguous ? 2 : 1}
                        tabIndex={0}
                        role="button"
                        aria-label={t("markerAria", {
                          account: marker.accountName,
                          amount: formatFinanceManagementPlanningMinor(
                            marker.expectedAmountMinor,
                            baseCurrency,
                            formattingLocale,
                          ),
                        })}
                        onFocus={() => setFocusedEventId(marker.eventId)}
                        onBlur={() => setFocusedEventId(null)}
                        onClick={() => {
                          setFocusedEventId(marker.eventId);
                          if (marker.isManual && onSelectManualEvent) {
                            onSelectManualEvent(marker.eventId);
                          }
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {focusedMarker ? (
              <div
                className="mt-3 rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                data-finance-timing-visual-tooltip
                role="status"
              >
                <p className="font-medium text-[var(--foreground)]">
                  {focusedMarker.accountType === "INCOME" ? t("movementIncoming") : t("movementOutgoing")}{" "}
                  · {focusedMarker.accountName}
                </p>
                {focusedMarker.description ? (
                  <p className="text-xs text-[var(--muted)]">{focusedMarker.description}</p>
                ) : null}
                <p className="tabular-nums text-[var(--foreground)]">
                  {formatFinanceManagementPlanningMinor(
                    focusedMarker.expectedAmountMinor,
                    baseCurrency,
                    formattingLocale,
                  )}
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  {formatExpectedFinancialEventTimingLabel(
                    markerToTimingInput(focusedMarker),
                    formattingLocale,
                  )}
                  {focusedMarker.interval.kind === "MONTH" ? (
                    <span className="ml-1 text-[var(--muted)]">({t("monthPrecisionHint")})</span>
                  ) : null}
                </p>
                {focusedMarker.temporalPositionAtCutoff === "AMBIGUOUS_AT_CUTOFF" ? (
                  <p className="text-xs text-[var(--warning)]">{t("ambiguousHint")}</p>
                ) : null}
                {focusedMarker.isAfterFinanceYearEnd ? (
                  <p className="text-xs text-[var(--muted)]">{t("crossFyHint")}</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <div
          className="mt-4 grid gap-2 rounded-md border border-dashed border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)]/40 px-3 py-3 sm:grid-cols-2"
          data-finance-timing-untimed-companion
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("untimedTitle")}
            </p>
            <p className="text-sm text-[var(--text-2)]">{t("untimedBody")}</p>
          </div>
          <div className="space-y-1 text-sm tabular-nums">
            <p>
              {t("untimedIncome")}{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatFinanceManagementPlanningMinor(
                  visual.untimed.incomeMinor,
                  baseCurrency,
                  formattingLocale,
                )}
              </span>
            </p>
            <p>
              {t("untimedExpense")}{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatFinanceManagementPlanningMinor(
                  visual.untimed.expenseMinor,
                  baseCurrency,
                  formattingLocale,
                )}
              </span>
            </p>
            <p className="font-semibold text-[var(--foreground)]">
              {t("untimedTotal")}{" "}
              {formatFinanceManagementPlanningMinor(
                visual.untimed.totalMinor,
                baseCurrency,
                formattingLocale,
              )}
            </p>
          </div>
        </div>

        {visual.isOverallocated ? (
          <p className="mt-2 text-sm text-[var(--warning)]" data-finance-timing-visual-overallocation>
            {t("overallocationChartHint")}
          </p>
        ) : null}
      </FinanceVisualChartSurface>
    </section>
  );
}

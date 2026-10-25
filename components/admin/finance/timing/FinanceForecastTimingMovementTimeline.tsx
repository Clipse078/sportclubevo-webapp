"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import { formatFinanceManagementPlanningSignedWholeMajorNumber } from "@/lib/finance/budget/budget-amount-presentation";
import {
  deriveFinanceTimingMovementComposition,
  formatFinanceDirectionalMovementDetailLine,
  formatFinanceDirectionalMovementMinor,
  formatFinanceNetMovementMinor,
  financeMovementDirectionFromAccountType,
} from "@/lib/finance/presentation/finance-directional-movement-presentation";
import {
  FinanceVisualChartSurface,
  FinanceVisualLegend,
} from "@/components/admin/finance/visual/FinanceVisualChartSurface";
import { buildFinanceForecastTimingMovementChartModel } from "@/lib/finance/forecast/build-forecast-timing-movement-chart-model";
import type { FinanceForecastMovementChartPlottedMovement } from "@/lib/finance/forecast/build-forecast-timing-movement-chart-model";
import { buildFinanceForecastMovementAccessibleTimingPhrase } from "@/lib/finance/forecast/finance-forecast-movement-chart-accessible-label";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import {
  financeForecastTimingShowsUntimedCompanion,
  financeForecastTimingUsesCompactEmptyTimeline,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
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

function formatShortAxisDate(iso: string, locale: string): string {
  const [year, month] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function MovementBar(props: {
  movement: FinanceForecastMovementChartPlottedMovement;
  ariaLabel: string;
  onFocus: () => void;
  onBlur: () => void;
  onActivate: () => void;
}) {
  const { movement } = props;
  const width = Math.max(6, movement.xEnd - movement.xStart);
  const yTop = Math.min(movement.yZero, movement.yValue);
  const height = Math.max(4, Math.abs(movement.yValue - movement.yZero));
  const isIncome = movement.direction === "INCOME";
  const fill = isIncome ? "var(--sce-success)" : "var(--sce-danger)";

  const commonHandlers = {
    tabIndex: 0 as const,
    role: "button" as const,
    "aria-label": props.ariaLabel,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    onClick: props.onActivate,
    onKeyDown: (e: KeyboardEvent<SVGRectElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        props.onActivate();
      }
    },
  };

  if (movement.visualKind === "DATE_RANGE") {
    return (
      <g data-finance-movement-visual-kind="DATE_RANGE" data-finance-movement-id={movement.eventId}>
        <rect
          x={movement.xStart}
          y={yTop}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={0.2}
          stroke={fill}
          strokeWidth={1.2}
          strokeDasharray="4 2"
          {...commonHandlers}
        />
      </g>
    );
  }

  if (movement.visualKind === "MONTH") {
    return (
      <g data-finance-movement-visual-kind="MONTH" data-finance-movement-id={movement.eventId}>
        <rect
          x={movement.xStart}
          y={yTop}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={0.55}
          stroke="var(--muted)"
          strokeWidth={1}
          strokeDasharray="3 2"
          {...commonHandlers}
        />
      </g>
    );
  }

  return (
    <g data-finance-movement-visual-kind="EXACT_DATE" data-finance-movement-id={movement.eventId}>
      <rect
        x={movement.xStart}
        y={yTop}
        width={width}
        height={height}
        rx={1}
        fill={fill}
        fillOpacity={movement.isAmbiguous ? 0.55 : 0.92}
        stroke={movement.isAmbiguous ? "var(--warning)" : "var(--sce-surface-border-subtle)"}
        strokeWidth={movement.isAmbiguous ? 1.5 : 0.75}
        {...commonHandlers}
      />
    </g>
  );
}

function CompactEmptyTimingVisual(props: {
  visual: FinanceForecastTimingVisualModel;
  baseCurrency: string | null;
  formattingLocale: string;
}) {
  const t = useTranslations("Finance.forecast.timing.visual");
  const formattedUntimed = formatFinanceManagementPlanningMinor(
    props.visual.untimed.totalMinor,
    props.baseCurrency,
    props.formattingLocale,
  );

  return (
    <FinanceVisualChartSurface
      title={t("timelineTitle")}
      dataFinanceChart="forecast-timing-movement"
      className="pb-1"
    >
      <div
        className="mb-3 flex items-center gap-2 text-[var(--sce-surface-border-subtle)]"
        data-finance-timing-compact-empty-cue
        aria-hidden
      >
        <span className="h-px w-10 rounded-full bg-current opacity-70" />
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 opacity-60" fill="none">
          <rect
            x="2"
            y="3"
            width="12"
            height="11"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="h-px max-w-[3rem] flex-1 rounded-full bg-current opacity-70" />
      </div>

      <div className="space-y-2 pb-1" data-finance-timing-compact-empty>
        <p className="text-sm font-semibold text-[var(--foreground)]">{t("compactEmptyTitle")}</p>
        <p className="text-sm text-[var(--text-2)]" data-finance-timing-compact-empty-amount>
          {t("compactEmptyStatement", { amount: formattedUntimed })}
        </p>
        <p className="text-sm text-[var(--muted)]">{t("compactEmptyActionHint")}</p>
      </div>
    </FinanceVisualChartSurface>
  );
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

  const presentationState = visual.workspacePresentationState;
  const useCompactEmpty = financeForecastTimingUsesCompactEmptyTimeline(presentationState);
  const showUntimedCompanion = financeForecastTimingShowsUntimedCompanion(presentationState);

  const chartModel = useMemo(
    () => buildFinanceForecastTimingMovementChartModel(visual),
    [visual],
  );

  const focusedMarker = useMemo(
    () => visual.markers.find((m) => m.eventId === focusedEventId) ?? null,
    [focusedEventId, visual.markers],
  );

  const untimedComposition = useMemo(
    () =>
      deriveFinanceTimingMovementComposition({
        incomeMagnitudeMinor: visual.untimed.incomeMinor,
        expenseMagnitudeMinor: visual.untimed.expenseMinor,
      }),
    [visual.untimed.expenseMinor, visual.untimed.incomeMinor],
  );

  function formatMovementAmount(
    amountMinor: number,
    accountType: "INCOME" | "EXPENSE",
  ): string {
    return formatFinanceDirectionalMovementMinor({
      amountMinor,
      direction: financeMovementDirectionFromAccountType(accountType),
      currency: baseCurrency,
      formattingLocale,
    });
  }

  function markerAccessibleLabel(marker: FinanceForecastTimingVisualModel["markers"][number]): string {
    const directionLabel =
      marker.accountType === "INCOME" ? t("movementIncoming") : t("movementOutgoing");
    const amountLine = formatFinanceDirectionalMovementDetailLine({
      directionLabel,
      amountMinor: marker.expectedAmountMinor,
      direction: financeMovementDirectionFromAccountType(marker.accountType),
      currency: baseCurrency,
      formattingLocale,
    });
    const timingPhrase = buildFinanceForecastMovementAccessibleTimingPhrase({
      marker,
      locale: formattingLocale,
      exactTemplate: (date) => t("srTimingExact", { date }),
      monthTemplate: (month) => t("srTimingMonth", { month }),
      rangeTemplate: (start, end) => t("srTimingRange", { start, end }),
    });
    return `${marker.accountName}, ${amountLine}, ${timingPhrase}`;
  }

  const showPlottingCanvas =
    !useCompactEmpty &&
    (visual.markers.length > 0 || visual.timedFutureExpectationMinor > 0);

  if (!visual.hasRemainingExpectation) {
    return null;
  }

  if (useCompactEmpty) {
    return (
      <section
        data-finance-timing-visual-timeline
        data-finance-timing-presentation-state={presentationState}
        data-finance-timing-compact-interpretation
        className="min-w-0"
      >
        <CompactEmptyTimingVisual
          visual={visual}
          baseCurrency={baseCurrency}
          formattingLocale={formattingLocale}
        />
      </section>
    );
  }

  return (
    <section
      data-finance-timing-visual-timeline
      data-finance-timing-presentation-state={presentationState}
      data-finance-timing-full-timeline
      data-finance-movement-zero-baseline-chart
      className="min-w-0 space-y-3"
    >
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
              key: "range",
              label: t("legendRangePrecision"),
              swatchClassName: "border-[var(--sce-primary)]",
              pattern: "dashed",
            },
          ]}
        />

        {!showPlottingCanvas ? (
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
                viewBox={`0 0 ${chartModel.svgWidth} ${chartModel.svgHeight}`}
                className="h-auto min-h-[280px] min-w-[min(100%,720px)] w-full max-w-none"
                role="img"
                aria-labelledby={`${baseId}-summary`}
                data-finance-movement-chart-svg
              >
                {chartModel.yTicks.map((tick) => (
                  <g key={tick.signedAmountMinor}>
                    <line
                      x1={chartModel.domain.plotLeft}
                      y1={tick.y}
                      x2={chartModel.domain.plotRight}
                      y2={tick.y}
                      className={cn(
                        "stroke-[var(--sce-surface-border-subtle)]",
                        tick.signedAmountMinor === 0 ? "opacity-90" : "opacity-35",
                      )}
                      strokeWidth={tick.signedAmountMinor === 0 ? 1.25 : 0.75}
                      strokeDasharray={tick.signedAmountMinor === 0 ? undefined : "2 4"}
                    />
                    <text
                      x={chartModel.domain.plotLeft - 6}
                      y={tick.y + 3}
                      textAnchor="end"
                      className="fill-[var(--muted)] text-[9px] tabular-nums"
                    >
                      {formatFinanceManagementPlanningSignedWholeMajorNumber(
                        tick.signedAmountMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </text>
                  </g>
                ))}

                <line
                  x1={chartModel.domain.plotLeft}
                  y1={chartModel.domain.zeroY}
                  x2={chartModel.domain.plotRight}
                  y2={chartModel.domain.zeroY}
                  className="stroke-[var(--foreground)] opacity-25"
                  strokeWidth={1}
                  data-finance-movement-zero-baseline
                />

                {chartModel.actualsCutoff ? (
                  <>
                    <line
                      x1={chartModel.actualsCutoff.x}
                      y1={chartModel.domain.plotTop}
                      x2={chartModel.actualsCutoff.x}
                      y2={chartModel.domain.plotBottom}
                      strokeDasharray="4 3"
                      className="stroke-[var(--muted)] opacity-50"
                    />
                    <text
                      x={chartModel.actualsCutoff.x + 4}
                      y={chartModel.domain.plotTop + 10}
                      className="fill-[var(--muted)] text-[9px]"
                    >
                      {t("cutoffLabel")}
                    </text>
                  </>
                ) : null}

                {chartModel.financeYearBoundary ? (
                  <>
                    <line
                      x1={chartModel.financeYearBoundary.x}
                      y1={chartModel.domain.plotTop + 4}
                      x2={chartModel.financeYearBoundary.x}
                      y2={chartModel.domain.plotBottom}
                      className="stroke-[var(--sce-primary)] opacity-35"
                      strokeWidth={1}
                      data-finance-movement-fy-boundary
                    />
                    <text
                      x={chartModel.financeYearBoundary.x + 4}
                      y={chartModel.domain.plotBottom + 14}
                      className="fill-[var(--muted)] text-[9px]"
                    >
                      {t("financeYearEndLabel")}
                    </text>
                  </>
                ) : null}

                {chartModel.xTicks.map((tick) => (
                  <text
                    key={tick.dateIso}
                    x={tick.x}
                    y={chartModel.domain.plotBottom + 16}
                    textAnchor="middle"
                    className="fill-[var(--muted)] text-[9px]"
                  >
                    {formatShortAxisDate(tick.dateIso, formattingLocale)}
                  </text>
                ))}

                {chartModel.movements.map((movement) => (
                  <MovementBar
                    key={movement.eventId}
                    movement={movement}
                    ariaLabel={markerAccessibleLabel(movement.marker)}
                    onFocus={() => setFocusedEventId(movement.eventId)}
                    onBlur={() => setFocusedEventId(null)}
                    onActivate={() => {
                      setFocusedEventId(movement.eventId);
                      if (movement.marker.isManual && onSelectManualEvent) {
                        onSelectManualEvent(movement.eventId);
                      }
                    }}
                  />
                ))}
              </svg>
            </div>

            {focusedMarker ? (
              <div
                className="mt-3 rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                data-finance-timing-visual-tooltip
                role="status"
              >
                <p className="font-medium text-[var(--foreground)]">{focusedMarker.accountName}</p>
                {focusedMarker.description ? (
                  <p className="text-xs text-[var(--muted)]">{focusedMarker.description}</p>
                ) : null}
                <p
                  className={cn(
                    "tabular-nums font-medium",
                    focusedMarker.accountType === "INCOME"
                      ? "text-[var(--sce-success)]"
                      : "text-[var(--sce-danger)]",
                  )}
                >
                  {formatFinanceDirectionalMovementDetailLine({
                    directionLabel:
                      focusedMarker.accountType === "INCOME"
                        ? t("movementIncoming")
                        : t("movementOutgoing"),
                    amountMinor: focusedMarker.expectedAmountMinor,
                    direction: financeMovementDirectionFromAccountType(focusedMarker.accountType),
                    currency: baseCurrency,
                    formattingLocale,
                  })}
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  {formatExpectedFinancialEventTimingLabel(
                    markerToTimingInput(focusedMarker),
                    formattingLocale,
                  )}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {focusedMarker.interval.kind === "EXACT_DATE"
                    ? t("precisionExact")
                    : focusedMarker.interval.kind === "MONTH"
                      ? t("precisionMonth")
                      : t("precisionRange")}
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

        {showUntimedCompanion ? (
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
              <p className="font-medium text-[var(--foreground)]" data-finance-timing-untimed-gross>
                {t("untimedTotal")}{" "}
                {formatFinanceManagementPlanningMinor(
                  visual.untimed.totalMinor,
                  baseCurrency,
                  formattingLocale,
                )}
              </p>
              <p data-finance-timing-untimed-income>
                {t("untimedIncome")}{" "}
                <span className="font-medium text-[var(--sce-success)]">
                  {formatMovementAmount(visual.untimed.incomeMinor, "INCOME")}
                </span>
              </p>
              <p data-finance-timing-untimed-expense>
                {t("untimedExpense")}{" "}
                <span className="font-medium text-[var(--sce-danger)]">
                  {formatMovementAmount(visual.untimed.expenseMinor, "EXPENSE")}
                </span>
              </p>
              <p
                className="font-semibold text-[var(--foreground)]"
                data-finance-timing-untimed-net
              >
                {t("untimedNet")}{" "}
                {formatFinanceNetMovementMinor({
                  netMovementMinor: untimedComposition.netMovementMinor,
                  currency: baseCurrency,
                  formattingLocale,
                })}
              </p>
            </div>
          </div>
        ) : null}

        {visual.isOverallocated ? (
          <p className="mt-2 text-sm text-[var(--warning)]" data-finance-timing-visual-overallocation>
            {t("overallocationChartHint")}
          </p>
        ) : null}
      </FinanceVisualChartSurface>
    </section>
  );
}

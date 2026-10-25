"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { FinanceOverviewExpectedEventTimeline } from "@/components/admin/finance/overview/FinanceOverviewExpectedEventTimeline";
import {
  formatManagementPnlVarianceDelta,
} from "@/lib/finance/presentation/format-management-pnl-measure";
import {
  financeVarianceComparisonSemanticTextClass,
  financeVarianceFavorabilityLabelKey,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { formatFinanceDirectionalMovementMinor } from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import type { SerializedFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/presentation/serialize-finance-overview-decision-intelligence-read-model";
import type { FinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

type FinanceOverviewPanelLabels = {
  notConfiguredTitle: string;
  notConfiguredBody: string;
  incompleteTitle: string;
  incompleteBody: string;
  configuredNoDataTitle: string;
  configuredNoDataBody: string;
  configuredCapabilitiesTitle: string;
  configuredCapabilitiesBody: string;
  openSetup: string;
  setupWorkflowSubordinateTitle: string;
  setupWorkflowSubordinateBody: string;
  noCurrencyTitle: string;
  noCurrencyBody: string;
  noFinanceYearTitle: string;
  noFinanceYearBody: string;
  noStructureTitle: string;
  noStructureBody: string;
  openStructure: string;
  noBaselineTitle: string;
  noBaselineBody: string;
  openBudget: string;
  outlookTitle: string;
  expectedResult: string;
  varianceAgainstApprovedBudget: string;
  actualLabel: string;
  actualYtdThrough: string;
  conclusionOnTrack: string;
  conclusionAboveBudget: string;
  conclusionBelowBudget: string;
  conclusionForecastUnavailable: string;
  conclusionBudgetUnavailable: string;
  conclusionNoConclusion: string;
  attentionTitle: string;
  attentionMissingBudget: string;
  attentionMissingForecast: string;
  attentionUnfavorableVariance: string;
  attentionTimingOverallocated: string;
  attentionTimingAmbiguous: string;
  attentionPartialTimingTitle: string;
  attentionPartialTimingBody: string;
  attentionNoStructure: string;
  driversTitle: string;
  driversFavourable: string;
  driversUnfavourable: string;
  openReports: string;
  expectedMovementTitle: string;
  expectedMovementZeroTiming: string;
  expectedMovementZeroTimingAction: string;
  timingCoverageShort: string;
  openTiming: string;
  openForecast: string;
  openActuals: string;
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  measureUnavailable: string;
  untimedFooterTitle: string;
  untimedFooterIncome: string;
  untimedFooterExpense: string;
  movementSemanticClarification: string;
  timelineMonthPrecision: string;
  timelineRangePrecision: string;
  timelineMoreEvents: string;
};

type FinanceOverviewPanelProps = {
  state: FinanceOverviewState;
  canAdmin: boolean;
  model: SerializedFinanceOverviewDecisionIntelligenceReadModel;
  formattingLocale: string;
  labels: FinanceOverviewPanelLabels;
};

function favorabilityLabel(
  labels: FinanceOverviewPanelLabels,
  favorability: "FAVORABLE" | "UNFAVORABLE" | "ON_PLAN",
): string {
  const key = financeVarianceFavorabilityLabelKey(favorability);
  if (key === "favorabilityFavorable") return labels.favorabilityFavorable;
  if (key === "favorabilityUnfavorable") return labels.favorabilityUnfavorable;
  return labels.favorabilityOnPlan;
}

function formatResultMinor(
  availability: string,
  amountMinor: number | null | undefined,
  currency: string | null,
  locale: string,
  unavailableLabel: string,
): string {
  if (availability === "NOT_VISIBLE") return unavailableLabel;
  if (availability !== "AVAILABLE" || amountMinor === null || amountMinor === undefined) {
    return unavailableLabel;
  }
  return formatFinanceManagementMoneyMinor(amountMinor, currency, locale);
}

function formatLocaleDateFromIso(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function conclusionHeadline(
  labels: FinanceOverviewPanelLabels,
  kind: SerializedFinanceOverviewDecisionIntelligenceReadModel["conclusion"]["kind"],
): string {
  switch (kind) {
    case "ON_TRACK":
      return labels.conclusionOnTrack;
    case "ABOVE_BUDGET_EXPECTED":
      return labels.conclusionAboveBudget;
    case "BELOW_BUDGET_EXPECTED":
      return labels.conclusionBelowBudget;
    case "FORECAST_UNAVAILABLE":
      return labels.conclusionForecastUnavailable;
    case "BUDGET_UNAVAILABLE":
      return labels.conclusionBudgetUnavailable;
    default:
      return labels.conclusionNoConclusion;
  }
}

function attentionCopy(
  labels: FinanceOverviewPanelLabels,
  item: SerializedFinanceOverviewDecisionIntelligenceReadModel["attentionItems"][number],
  formattingLocale: string,
  currency: string | null,
): string {
  switch (item.kind) {
    case "MISSING_APPROVED_BUDGET":
      return labels.attentionMissingBudget;
    case "MISSING_CURRENT_FORECAST":
      return labels.attentionMissingForecast;
    case "UNFAVORABLE_FORECAST_VS_BUDGET":
      return labels.attentionUnfavorableVariance;
    case "TIMING_OVERALLOCATED":
      return labels.attentionTimingOverallocated;
    case "TIMING_AMBIGUOUS_AT_CUTOFF":
      return labels.attentionTimingAmbiguous;
    case "PARTIAL_TIMING_UNTIMED": {
      const amount =
        item.untimedTotalMinor != null && item.untimedTotalMinor > 0
          ? formatFinanceManagementMoneyMinor(item.untimedTotalMinor, currency, formattingLocale)
          : null;
      if (amount) {
        return labels.attentionPartialTimingBody.replace("{amount}", amount);
      }
      return labels.attentionPartialTimingTitle;
    }
    case "NO_REPORTING_STRUCTURE":
      return labels.attentionNoStructure;
  }
}

function routeHref(routeKey: NonNullable<
  SerializedFinanceOverviewDecisionIntelligenceReadModel["attentionItems"][number]["routeKey"]
>): string {
  switch (routeKey) {
    case "budget":
      return "/dashboard/finance/budget";
    case "forecast":
      return "/dashboard/finance/forecast";
    case "reports":
      return "/dashboard/finance/reports";
    case "timing":
      return "/dashboard/finance/forecast/timing";
    case "structure":
      return "/dashboard/finance/structure";
  }
}

function formatCoveragePercent(
  coverage: SerializedFinanceOverviewDecisionIntelligenceReadModel["expectedMovement"]["timingCoverage"],
): string | null {
  if (!coverage || coverage.kind !== "RATIO") return null;
  const percent = coverage.timedCoverageBasisPoints / 100;
  return `${Math.round(percent)}%`;
}

export function FinanceOverviewPanel({
  state,
  canAdmin,
  model,
  formattingLocale,
  labels,
}: FinanceOverviewPanelProps) {
  const { management, conclusion, drivers, attentionItems, expectedMovement, capabilities } =
    model;
  const currency = management.baseCurrency;

  const showSetupFallback =
    state !== "CONFIGURED_WITH_CAPABILITIES" &&
    management.availability !== "AVAILABLE" &&
    management.availability !== "PARTIAL_SOURCE_AVAILABILITY";

  const overviewFallbackCopy = (() => {
    switch (state) {
      case "NOT_CONFIGURED":
        return { title: labels.notConfiguredTitle, body: labels.notConfiguredBody };
      case "SETUP_INCOMPLETE":
        return { title: labels.incompleteTitle, body: labels.incompleteBody };
      case "CONFIGURED_WITH_CAPABILITIES":
        return {
          title: labels.configuredCapabilitiesTitle,
          body: labels.configuredCapabilitiesBody,
        };
      default:
        return {
          title: labels.configuredNoDataTitle,
          body: labels.configuredNoDataBody,
        };
    }
  })();

  const varianceSlice = management.forecastVsBudgetVariance;
  const hasVariance = varianceSlice.availability === "AVAILABLE";
  const favorabilityText =
    hasVariance && varianceSlice.favorability
      ? favorabilityLabel(labels, varianceSlice.favorability)
      : null;

  const actualGrain = management.actual.grain;
  const actualCutoffIso = management.actualCutoffDateIso;
  const actualCutoffLabel =
    actualCutoffIso != null
      ? formatLocaleDateFromIso(actualCutoffIso, formattingLocale)
      : null;

  const timingAttentionKinds = new Set([
    "PARTIAL_TIMING_UNTIMED",
    "TIMING_OVERALLOCATED",
    "TIMING_AMBIGUOUS_AT_CUTOFF",
  ]);
  const hasTimingAttentionWithRoute = attentionItems.some(
    (item) => item.routeKey === "timing" && timingAttentionKinds.has(item.kind),
  );

  const driverColumns = useMemo(() => {
    const fav = drivers.favourable.length > 0;
    const unfav = drivers.unfavourable.length > 0;
    if (fav && unfav) return "md:grid-cols-2";
    return "md:grid-cols-1";
  }, [drivers.favourable.length, drivers.unfavourable.length]);

  return (
    <div className={cn(FINANCE_WORKSPACE_STACK_CLASS, "overflow-x-hidden")} data-finance-overview-panel data-finance-responsive-root>
      {management.availability === "NO_BASE_CURRENCY" ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-reporting-state="no-base-currency">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{labels.noCurrencyTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{labels.noCurrencyBody}</p>
          {canAdmin ? (
            <div className="mt-4">
              <Link
                href="/dashboard/finance/settings"
                className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
              >
                {labels.openSetup}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {management.availability === "NO_FINANCE_YEAR" ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-reporting-state="no-finance-year">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{labels.noFinanceYearTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{labels.noFinanceYearBody}</p>
          {canAdmin ? (
            <div className="mt-4">
              <Link href="/dashboard/finance/settings" className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]">
                {labels.openSetup}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {management.availability === "NO_STRUCTURE" ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-reporting-state="no-structure">
          <h2 className="text-base font-semibold text-[var(--foreground)]">{labels.noStructureTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{labels.noStructureBody}</p>
          {capabilities.canOpenStructure ? (
            <div className="mt-4">
              <Link href="/dashboard/finance/structure" className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]">
                {labels.openStructure}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {management.availability === "AVAILABLE" ||
      management.availability === "PARTIAL_SOURCE_AVAILABILITY" ? (
        <>
          <section
            className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "pb-4 sm:pb-5")}
            data-finance-overview-section="financial-conclusion"
            aria-labelledby="finance-overview-outlook-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {labels.outlookTitle}
            </p>
            <h2
              id="finance-overview-outlook-heading"
              className="mt-1 text-base font-semibold text-[var(--foreground)]"
              data-finance-overview-conclusion={conclusion.kind}
            >
              {conclusionHeadline(labels, conclusion.kind)}
            </h2>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs text-[var(--muted)]">{labels.expectedResult}</p>
                <p
                  className={cn(
                    "text-3xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]",
                    conclusion.forecastResultMinor !== null
                      ? financeResultSemanticTextClass(conclusion.forecastResultMinor)
                      : null,
                  )}
                >
                  {formatResultMinor(
                    management.currentForecast.availability,
                    conclusion.forecastResultMinor,
                    currency,
                    formattingLocale,
                    labels.measureUnavailable,
                  )}
                </p>
                {hasVariance ? (
                  <div className="mt-2 space-y-0.5" data-finance-overview-variance>
                    <p
                      className={cn(
                        "text-sm font-medium tabular-nums",
                        financeVarianceComparisonSemanticTextClass({
                          favorability: varianceSlice.favorability,
                          hasComparison: true,
                        }),
                      )}
                    >
                      {formatManagementPnlVarianceDelta(varianceSlice, currency, formattingLocale)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {labels.varianceAgainstApprovedBudget}
                    </p>
                    {favorabilityText ? (
                      <p
                        className="text-sm font-medium text-[var(--foreground)]"
                        data-finance-overview-favorability
                      >
                        {favorabilityText}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {management.actual.availability !== "NOT_VISIBLE" ? (
                <div className="min-w-0 shrink-0 sm:text-right">
                  <p className="text-xs text-[var(--muted)]">
                    {actualGrain === "YTD" && actualCutoffLabel
                      ? labels.actualYtdThrough.replace("{date}", actualCutoffLabel)
                      : labels.actualLabel}
                  </p>
                  <p className="text-lg font-medium tabular-nums text-[var(--foreground)]">
                    {formatResultMinor(
                      management.actual.availability,
                      management.actual.summary?.resultMinor,
                      currency,
                      formattingLocale,
                      labels.measureUnavailable,
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {attentionItems.length > 0 ? (
            <section
              className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "divide-y divide-[var(--sce-surface-border-subtle)] p-0")}
              data-finance-overview-section="attention"
              aria-labelledby="finance-overview-attention-heading"
            >
              <h2
                id="finance-overview-attention-heading"
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {labels.attentionTitle}
              </h2>
              <ul className="flex flex-col">
                {attentionItems.slice(0, 3).map((item) => (
                  <li
                    key={item.kind}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                    data-finance-attention={item.kind}
                  >
                    <div className="min-w-0 flex-1">
                      {item.kind === "PARTIAL_TIMING_UNTIMED" ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
                          {labels.attentionPartialTimingTitle}
                        </p>
                      ) : null}
                      <p className="text-sm text-[var(--foreground)]">
                        {attentionCopy(labels, item, formattingLocale, currency)}
                      </p>
                    </div>
                    {item.routeKey &&
                    ((item.routeKey === "reports" && capabilities.canOpenReports) ||
                      (item.routeKey === "timing" && capabilities.canOpenTiming) ||
                      (item.routeKey === "forecast" && capabilities.canOpenForecast) ||
                      (item.routeKey === "budget" && capabilities.canOpenBudget) ||
                      (item.routeKey === "structure" && capabilities.canOpenStructure)) ? (
                      <Link
                        href={routeHref(item.routeKey)}
                        className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                        {...(item.routeKey === "timing"
                          ? { "data-finance-overview-timing-cta": "attention" as const }
                          : {})}
                      >
                        {item.routeKey === "reports"
                          ? labels.openReports
                          : item.routeKey === "timing"
                            ? labels.openTiming
                            : item.routeKey === "forecast"
                              ? labels.openForecast
                              : item.routeKey === "budget"
                                ? labels.openBudget
                                : labels.openStructure}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(drivers.favourable.length > 0 || drivers.unfavourable.length > 0) &&
          management.currentForecast.availability === "AVAILABLE" &&
          management.approvedBudget.availability === "AVAILABLE" ? (
            <section
              className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS}
              data-finance-overview-section="drivers"
              aria-labelledby="finance-overview-drivers-heading"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="finance-overview-drivers-heading" className="text-sm font-semibold text-[var(--foreground)]">
                  {labels.driversTitle}
                </h2>
                {capabilities.canOpenReports ? (
                  <Link
                    href="/dashboard/finance/reports"
                    className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    {labels.openReports}
                  </Link>
                ) : null}
              </div>
              <div className={cn("mt-3 grid max-w-2xl gap-4", driverColumns)}>
                {drivers.favourable.length > 0 ? (
                  <div data-finance-driver-group="favourable">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {labels.driversFavourable}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {drivers.favourable.map((driver) => (
                        <li
                          key={driver.id}
                          className="flex items-baseline justify-between gap-4 text-sm"
                          data-finance-driver-id={driver.id}
                        >
                          <span className="min-w-0 truncate text-[var(--foreground)]">{driver.name}</span>
                          <span
                            className={cn(
                              "shrink-0 tabular-nums",
                              financeVarianceComparisonSemanticTextClass({
                                favorability: "FAVORABLE",
                                hasComparison: true,
                              }),
                            )}
                          >
                            {formatManagementPnlVarianceDelta(driver.comparison, currency, formattingLocale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {drivers.unfavourable.length > 0 ? (
                  <div data-finance-driver-group="unfavourable">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {labels.driversUnfavourable}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {drivers.unfavourable.map((driver) => (
                        <li
                          key={driver.id}
                          className="flex items-baseline justify-between gap-4 text-sm"
                          data-finance-driver-id={driver.id}
                        >
                          <span className="min-w-0 truncate text-[var(--foreground)]">{driver.name}</span>
                          <span
                            className={cn(
                              "shrink-0 tabular-nums",
                              financeVarianceComparisonSemanticTextClass({
                                favorability: "UNFAVORABLE",
                                hasComparison: true,
                              }),
                            )}
                          >
                            {formatManagementPnlVarianceDelta(driver.comparison, currency, formattingLocale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {expectedMovement.availability !== "NOT_VISIBLE" ? (
            <section
              className={FINANCE_FUNCTIONAL_SURFACE_CLASS}
              data-finance-overview-section="expected-movement"
              aria-labelledby="finance-overview-movement-heading"
            >
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="flex min-w-0 items-baseline gap-2">
                  <h2 id="finance-overview-movement-heading" className="text-base font-semibold text-[var(--foreground)]">
                    {labels.expectedMovementTitle}
                  </h2>
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--sce-surface-border-subtle)] text-[10px] font-semibold leading-none text-[var(--muted)]"
                    title={labels.movementSemanticClarification}
                    aria-label={labels.movementSemanticClarification}
                    role="img"
                  >
                    i
                  </span>
                </div>
                {formatCoveragePercent(expectedMovement.timingCoverage) ? (
                  <p className="text-xs text-[var(--muted)] sm:shrink-0" data-finance-timing-coverage>
                    {labels.timingCoverageShort.replace(
                      "{percent}",
                      formatCoveragePercent(expectedMovement.timingCoverage)!,
                    )}
                  </p>
                ) : null}
              </div>

              {expectedMovement.availability === "ZERO_TIMING" ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--muted)]">{labels.expectedMovementZeroTiming}</p>
                  {capabilities.canOpenTiming && !hasTimingAttentionWithRoute ? (
                    <Link
                      href="/dashboard/finance/forecast/timing"
                      className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                      data-finance-overview-timing-cta="zero-timing"
                    >
                      {labels.openTiming}
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {expectedMovement.availability === "PARTIAL_OR_FULL_TIMING" &&
              expectedMovement.visualModel ? (
                <div className="mt-3 min-w-0 overflow-x-hidden" data-finance-overview-event-timeline>
                  <FinanceOverviewExpectedEventTimeline
                    visual={expectedMovement.visualModel}
                    baseCurrency={currency}
                    formattingLocale={formattingLocale}
                    labels={{
                      monthPrecisionHint: labels.timelineMonthPrecision,
                      rangePrecisionHint: labels.timelineRangePrecision,
                      moreEventsAffordance: labels.timelineMoreEvents,
                      semanticClarification: labels.movementSemanticClarification,
                    }}
                  />
                </div>
              ) : null}

              {expectedMovement.untimedRemainderMinor !== null &&
              expectedMovement.untimedRemainderMinor > 0 ? (
                <div
                  className="mt-3 flex flex-col gap-2 rounded-md bg-[var(--sce-surface-dense)]/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  data-finance-untimed-context
                >
                  <div className="min-w-0 text-xs text-[var(--muted)]">
                    <p className="font-medium text-[var(--foreground)]">{labels.untimedFooterTitle}</p>
                    {expectedMovement.untimedIncomeMinor != null ||
                    expectedMovement.untimedExpenseMinor != null ? (
                      <p className="mt-0.5 tabular-nums">
                        {expectedMovement.untimedIncomeMinor != null
                          ? labels.untimedFooterIncome.replace(
                              "{amount}",
                              formatFinanceDirectionalMovementMinor({
                                amountMinor: expectedMovement.untimedIncomeMinor,
                                direction: "INCOME",
                                currency,
                                formattingLocale,
                              }),
                            )
                          : null}
                        {expectedMovement.untimedIncomeMinor != null &&
                        expectedMovement.untimedExpenseMinor != null
                          ? " · "
                          : null}
                        {expectedMovement.untimedExpenseMinor != null
                          ? labels.untimedFooterExpense.replace(
                              "{amount}",
                              formatFinanceDirectionalMovementMinor({
                                amountMinor: expectedMovement.untimedExpenseMinor,
                                direction: "EXPENSE",
                                currency,
                                formattingLocale,
                              }),
                            )
                          : null}
                      </p>
                    ) : null}
                  </div>
                  {capabilities.canOpenTiming && !hasTimingAttentionWithRoute ? (
                    <Link
                      href="/dashboard/finance/forecast/timing"
                      className="inline-flex h-8 shrink-0 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                      data-finance-overview-timing-cta="untimed-footer"
                    >
                      {labels.openTiming}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {management.approvedBudget.availability === "NO_APPROVED_BUDGET" ? (
            <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-reporting-state="no-approved-baseline">
              <h2 className="text-base font-semibold text-[var(--foreground)]">{labels.noBaselineTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{labels.noBaselineBody}</p>
              {capabilities.canOpenBudget ? (
                <div className="mt-4">
                  <Link href="/dashboard/finance/budget" className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]">
                    {labels.openBudget}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {showSetupFallback ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-overview-state={state}>
          <h2 className="text-base font-semibold text-[var(--foreground)]">{overviewFallbackCopy.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{overviewFallbackCopy.body}</p>
          {canAdmin ? (
            <div className="mt-4">
              <Link href="/dashboard/finance/settings" className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]">
                {labels.openSetup}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

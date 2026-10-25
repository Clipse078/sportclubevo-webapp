"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { FinanceForecastSubContextTabs } from "@/components/admin/finance/FinanceForecastSubContextTabs";
import { FinanceWorkspaceDisclosure } from "@/components/admin/finance/FinanceWorkspaceDisclosure";
import { FinanceExpectedFinancialEventDialog } from "@/components/admin/finance/timing/FinanceExpectedFinancialEventDialog";
import { FinanceExpectedFinancialEventDeleteDialog } from "@/components/admin/finance/timing/FinanceExpectedFinancialEventDeleteDialog";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_CONTEXT_STRIP_CLASS,
  FINANCE_FORECAST_WORKSPACE_STACK_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_TABLE_HEAD_ROW_CLASS,
  FINANCE_TABLE_ROW_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import {
  financeForecastTimingAccountNeedsAttention,
  formatExpectedFinancialEventTimingLabel,
  isExpectedEventTimingAfterFinanceYearEnd,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";
import {
  financeForecastTimingAccountRowDensity,
  financeForecastTimingShowsAllEventsDisclosure,
  financeForecastTimingShowsUpcomingMovements,
  financeForecastTimingSummaryShowsGlobalCreateCta,
  financeForecastTimingSummaryShowsPartialInterpretation,
} from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";
import type { FinanceForecastTimingOverviewReadModel } from "@/lib/finance/forecast/finance-forecast-timing-read-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import { FinanceForecastTimingMovementTimeline } from "@/components/admin/finance/timing/FinanceForecastTimingMovementTimeline";

type YearOption = { id: string; name: string };

type FinanceForecastTimingWorkspacePanelProps = {
  years: YearOption[];
  selectedYearId: string | null;
  hasAccounts: boolean;
  hasCurrentForecast: boolean;
  overview: FinanceForecastTimingOverviewReadModel | null;
  timingVisual: FinanceForecastTimingVisualModel | null;
  events: ExpectedFinancialEventRecord[];
  accountOptions: Array<{
    financialAccountId: string;
    name: string;
    accountType: "INCOME" | "EXPENSE";
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  baseCurrency: string | null;
  formattingLocale: string;
  canMutate: boolean;
  financeYearEndDateIso: string | null;
  loadError: string | null;
};

function formatAmount(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementPlanningMinor(amountMinor, currency, locale);
}

function accountIssueKey(account: FinanceForecastTimingOverviewReadModel["accounts"][number]): string {
  const r = account.reconciliation;
  if (r.state === "OVERALLOCATED") return "overallocated";
  if (r.state === "FORECAST_LINE_ABSENT" && account.expectedEventCount > 0) {
    return "missingForecast";
  }
  if (r.ambiguousTimingExpectationMinor > 0) return "ambiguous";
  if ((r.actualExceedsAnnualForecastAmountMinor ?? 0) > 0) return "actualExceeds";
  if ((r.unscheduledRemainderMinor ?? 0) > 0) return "unscheduled";
  return "none";
}

export function FinanceForecastTimingWorkspacePanel({
  years,
  selectedYearId,
  hasAccounts,
  hasCurrentForecast,
  overview,
  timingVisual,
  events,
  accountOptions,
  baseCurrency,
  formattingLocale,
  canMutate,
  financeYearEndDateIso,
  loadError,
}: FinanceForecastTimingWorkspacePanelProps) {
  const t = useTranslations("Finance.forecast.timing");
  const tForecast = useTranslations("Finance.forecast");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ExpectedFinancialEventRecord | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<ExpectedFinancialEventRecord | null>(null);
  const [presetAccountId, setPresetAccountId] = useState<string | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const yearHref = (yearId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("yearId", yearId);
    return `/dashboard/finance/forecast/timing?${params.toString()}`;
  };

  const totals = useMemo(() => {
    if (!overview) return null;
    const income = overview.annual.income;
    const expense = overview.annual.expense;
    return {
      remaining:
        income.remainingFutureExpectationMinor + expense.remainingFutureExpectationMinor,
      timed: income.timedFutureExpectationMinor + expense.timedFutureExpectationMinor,
      untimed: income.unscheduledRemainderMinor + expense.unscheduledRemainderMinor,
      overallocated: income.overallocatedAmountMinor + expense.overallocatedAmountMinor,
      ambiguous: income.ambiguousTimingExpectationMinor + expense.ambiguousTimingExpectationMinor,
    };
  }, [overview]);

  const attentionAccounts = useMemo(
    () =>
      overview?.accounts.filter((account) =>
        financeForecastTimingAccountNeedsAttention({
          reconciliation: account.reconciliation,
          expectedEventCount: account.expectedEventCount,
        }),
      ) ?? [],
    [overview],
  );

  const balancedAccounts = useMemo(
    () =>
      overview?.accounts.filter(
        (account) =>
          !financeForecastTimingAccountNeedsAttention({
            reconciliation: account.reconciliation,
            expectedEventCount: account.expectedEventCount,
          }),
      ) ?? [],
    [overview],
  );

  const refresh = () => router.refresh();

  function openCreate(accountId?: string) {
    setEditingEvent(null);
    setPresetAccountId(accountId ?? null);
    setEventDialogOpen(true);
  }

  function openEdit(event: ExpectedFinancialEventRecord) {
    if (event.sourceKind !== "MANUAL") return;
    setEditingEvent(event);
    setPresetAccountId(null);
    setEventDialogOpen(true);
  }

  function openDelete(event: ExpectedFinancialEventRecord) {
    if (event.sourceKind !== "MANUAL") return;
    setDeletingEvent(event);
    setDeleteDialogOpen(true);
  }

  const coveragePercent =
    overview?.timingCoverage.kind === "RATIO"
      ? Math.round(overview.timingCoverage.timedCoverageBasisPoints / 100)
      : null;

  const interpretationKey = overview?.interpretationState ?? "NO_REMAINING_EXPECTATION";
  const presentationState = timingVisual?.workspacePresentationState ?? "NO_REMAINING";
  const showUpcoming = overview
    ? financeForecastTimingShowsUpcomingMovements({
        presentationState,
        upcomingEventCount: overview.upcomingEvents.length,
        futureTimedEventCount: overview.counts.futureTimedEventCount,
      })
    : false;
  const showAllEventsDisclosure = financeForecastTimingShowsAllEventsDisclosure(events.length);
  const showSummaryGlobalCta =
    totals &&
    financeForecastTimingSummaryShowsGlobalCreateCta({
      presentationState,
      canMutate,
      remainingMinor: totals.remaining,
    });
  const showPartialInterpretation =
    financeForecastTimingSummaryShowsPartialInterpretation({
      interpretationState: interpretationKey,
      presentationState,
    });

  return (
    <div className={FINANCE_FORECAST_WORKSPACE_STACK_CLASS} data-finance-timing-workspace>
      <FinanceForecastSubContextTabs
        labels={{
          current: tForecast("subNav.current"),
          scenarios: tForecast("subNav.scenarios"),
          timing: tForecast("subNav.timing"),
        }}
        ariaLabel={tForecast("subNav.aria")}
      />

      <div className={FINANCE_CONTEXT_STRIP_CLASS}>
        <SceToolbarSelect
          aria-label={tForecast("yearLabel")}
          value={selectedYearId ?? ""}
          disabled={years.length === 0}
          onChange={(event) => {
            const next = event.target.value;
            if (next) router.push(yearHref(next));
          }}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </SceToolbarSelect>
        {overview?.currentForecast.kind === "AVAILABLE" ? (
          <p className="text-xs text-[var(--muted)]" data-finance-timing-forecast-context>
            {t("forecastContext", {
              asOf: overview.currentForecast.asOfDateIso ?? "—",
            })}
          </p>
        ) : null}
      </div>

      {!hasAccounts ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-timing-empty="no-accounts">
          <p>{t("noAccounts")}</p>
        </section>
      ) : null}

      {hasAccounts && !hasCurrentForecast ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-timing-empty="no-forecast">
          <p>{t("noCurrentForecast")}</p>
        </section>
      ) : null}

      {loadError ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-timing-error>
          <p className="text-[var(--danger)]">{t("loadError")}</p>
        </section>
      ) : null}

      {overview && totals ? (
        <>
          <section
            className={cn(FINANCE_SECTION_SURFACE_CLASS, "px-4 py-5 sm:px-5")}
            data-finance-timing-summary
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {t("remainingLabel")}
                </p>
                <p
                  className="text-3xl font-semibold tabular-nums text-[var(--foreground)]"
                  data-finance-timing-remaining
                >
                  {formatAmount(totals.remaining, baseCurrency, formattingLocale)}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-2)]">
                  <span data-finance-timing-timed>
                    {t("timedLabel")}{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {formatAmount(totals.timed, baseCurrency, formattingLocale)}
                    </span>
                  </span>
                  <span data-finance-timing-untimed>
                    {t("untimedLabel")}{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {formatAmount(totals.untimed, baseCurrency, formattingLocale)}
                    </span>
                  </span>
                </div>
                {showPartialInterpretation ? (
                  <p className="text-sm text-[var(--text-2)]" data-finance-timing-interpretation>
                    {t(`interpretation.${interpretationKey}`)}
                  </p>
                ) : null}
                {totals.overallocated > 0 ? (
                  <p className="text-sm text-[var(--warning)]" data-finance-timing-overallocated>
                    {t("overallocatedSummary", {
                      amount: formatAmount(totals.overallocated, baseCurrency, formattingLocale),
                    })}
                  </p>
                ) : null}
                {overview.counts.ambiguousEventCount > 0 ? (
                  <p className="text-sm text-[var(--text-2)]" data-finance-timing-ambiguous>
                    {t("ambiguousSummary", { count: overview.counts.ambiguousEventCount })}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 w-full max-w-md space-y-3">
                {coveragePercent !== null && overview.timingCoverage.kind === "RATIO" ? (
                  <div data-finance-timing-coverage>
                    <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                      <span>{t("coverageLabel")}</span>
                      <span>
                        {overview.timingCoverage.isOverallocated
                          ? t("coverageOverallocated")
                          : `${coveragePercent}%`}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
                      role="progressbar"
                      aria-valuenow={Math.min(100, coveragePercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          overview.timingCoverage.isOverallocated
                            ? "bg-[var(--warning)]"
                            : "bg-[var(--sce-primary)]",
                        )}
                        style={{ width: `${Math.min(100, coveragePercent)}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 text-xs sm:grid-cols-2" data-finance-timing-side-breakdown>
                  <div>
                    <p className="font-medium text-[var(--muted)]">{t("incomeSection")}</p>
                    <p>
                      {t("sideRemaining")}{" "}
                      {formatAmount(
                        overview.annual.income.remainingFutureExpectationMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </p>
                    <p>
                      {t("sideTimed")}{" "}
                      {formatAmount(
                        overview.annual.income.timedFutureExpectationMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--muted)]">{t("expenseSection")}</p>
                    <p>
                      {t("sideRemaining")}{" "}
                      {formatAmount(
                        overview.annual.expense.remainingFutureExpectationMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </p>
                    <p>
                      {t("sideTimed")}{" "}
                      {formatAmount(
                        overview.annual.expense.timedFutureExpectationMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {showSummaryGlobalCta ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => openCreate()}>
                  {t("addTimingCta")}
                </Button>
              </div>
            ) : null}

            {totals.remaining <= 0 ? (
              <p className="mt-3 text-sm text-[var(--text-2)]" data-finance-timing-no-remaining>
                {t("noRemainingExpectation")}
              </p>
            ) : null}
          </section>

          {timingVisual ? (
            <FinanceForecastTimingMovementTimeline
              visual={timingVisual}
              baseCurrency={baseCurrency}
              formattingLocale={formattingLocale}
              canMutate={canMutate}
              onAddTiming={canMutate ? () => openCreate() : undefined}
              onSelectManualEvent={
                canMutate
                  ? (eventId) => {
                      const event = events.find((row) => row.id === eventId);
                      if (event) openEdit(event);
                    }
                  : undefined
              }
            />
          ) : null}

          {showUpcoming ? (
          <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-timing-upcoming>
            <header className="border-b border-[var(--sce-surface-border-subtle)] px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("upcomingTitle")}</h2>
            </header>
            {overview.upcomingEvents.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--text-2)] sm:px-5">{t("upcomingEmpty")}</p>
            ) : (
              <ul className="divide-y divide-[var(--sce-surface-border-subtle)]/70">
                {overview.upcomingEvents.map((row) => {
                  const timingLabel = formatExpectedFinancialEventTimingLabel(row, formattingLocale);
                  const crossFy =
                    financeYearEndDateIso &&
                    isExpectedEventTimingAfterFinanceYearEnd({
                      financeYearEndDateIso,
                      timing: row,
                    });
                  return (
                    <li
                      key={row.eventId}
                      className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      data-finance-timing-upcoming-row
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--foreground)]">
                          {row.accountType === "INCOME" ? t("movementIncoming") : t("movementOutgoing")}{" "}
                          · {row.accountName}
                        </p>
                        {row.description ? (
                          <p className="truncate text-xs text-[var(--muted)]">{row.description}</p>
                        ) : null}
                        {crossFy ? (
                          <p className="text-xs text-[var(--muted)]">{t("crossFyHint")}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-3 tabular-nums">
                        <span>{formatAmount(row.expectedAmountMinor, baseCurrency, formattingLocale)}</span>
                        <span className="text-[var(--text-2)]">{timingLabel}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          ) : null}

          <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-timing-attention>
            <header className="border-b border-[var(--sce-surface-border-subtle)] px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("attentionTitle")}</h2>
            </header>
            {attentionAccounts.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--text-2)] sm:px-5">{t("attentionEmpty")}</p>
            ) : (
              <ul className="divide-y divide-[var(--sce-surface-border-subtle)]/70">
                {attentionAccounts.map((account) => {
                  const issue = accountIssueKey(account);
                  const rowDensity = financeForecastTimingAccountRowDensity({
                    timedFutureExpectationMinor: account.reconciliation.timedFutureExpectationMinor,
                    unscheduledRemainderMinor: account.reconciliation.unscheduledRemainderMinor,
                  });
                  const expanded = expandedAccountId === account.financialAccountId;
                  const accountEvents = events.filter(
                    (e) => e.financialAccountId === account.financialAccountId,
                  );
                  const remainingMinor = account.reconciliation.remainingFutureExpectationMinor ?? 0;
                  const timedMinor = account.reconciliation.timedFutureExpectationMinor;
                  const openMinor = account.reconciliation.unscheduledRemainderMinor ?? 0;
                  const showIssueLine = issue !== "none" && !(rowDensity === "ZERO_TIMED" && issue === "unscheduled");
                  return (
                    <li key={account.financialAccountId} className="px-4 py-3 sm:px-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)]">{account.name}</p>
                          {rowDensity === "ZERO_TIMED" ? (
                            <p
                              className="mt-0.5 text-sm font-medium tabular-nums text-[var(--text-2)]"
                              data-finance-timing-account-row="zero-timed"
                            >
                              {t("accountRowZeroTimed", {
                                amount: formatAmount(openMinor, baseCurrency, formattingLocale),
                              })}
                            </p>
                          ) : rowDensity === "PARTIAL_TIMED" ? (
                            <div
                              className="mt-0.5 space-y-0.5 text-sm text-[var(--text-2)]"
                              data-finance-timing-account-row="partial-timed"
                            >
                              <p>
                                {t("accountRemaining")}{" "}
                                <span className="font-medium tabular-nums text-[var(--foreground)]">
                                  {formatAmount(remainingMinor, baseCurrency, formattingLocale)}
                                </span>
                              </p>
                              <p className="tabular-nums">
                                {t("accountRowPartialBreakdown", {
                                  timed: formatAmount(timedMinor, baseCurrency, formattingLocale),
                                  open: formatAmount(openMinor, baseCurrency, formattingLocale),
                                })}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-xs text-[var(--text-2)]" data-finance-timing-account-row="issue">
                              {t("accountRemaining")}{" "}
                              {formatAmount(remainingMinor, baseCurrency, formattingLocale)}
                              {openMinor > 0 ? (
                                <>
                                  {" · "}
                                  {t("accountOpen")}{" "}
                                  {formatAmount(openMinor, baseCurrency, formattingLocale)}
                                </>
                              ) : null}
                            </p>
                          )}
                          {showIssueLine ? (
                            <p
                              className={cn(
                                "mt-1 text-xs",
                                issue === "overallocated"
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--text-2)]",
                              )}
                              data-finance-timing-account-issue={issue}
                            >
                              {t(`accountIssue.${issue}`)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {canMutate && (account.reconciliation.unscheduledRemainderMinor ?? 0) > 0 ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => openCreate(account.financialAccountId)}
                            >
                              {t("addForAccount")}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedAccountId(
                                expanded ? null : account.financialAccountId,
                              )
                            }
                          >
                            {expanded ? t("hideAccountDetail") : t("showAccountDetail")}
                          </Button>
                        </div>
                      </div>
                      {expanded ? (
                        <div
                          className="mt-3 rounded-md bg-[var(--surface-2)]/40 px-3 py-2 text-xs text-[var(--text-2)]"
                          data-finance-timing-account-detail
                        >
                          <p>
                            {t("detailForecast")}{" "}
                            {account.reconciliation.annualForecastAmountMinor !== null
                              ? formatAmount(
                                  account.reconciliation.annualForecastAmountMinor,
                                  baseCurrency,
                                  formattingLocale,
                                )
                              : "—"}
                          </p>
                          <p>
                            {t("detailActual")}{" "}
                            {formatAmount(
                              account.reconciliation.actualThroughCutoffMinor,
                              baseCurrency,
                              formattingLocale,
                            )}
                          </p>
                          {accountEvents.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {accountEvents.map((ev) => (
                                <li key={ev.id}>
                                  {formatAmount(ev.expectedAmountMinor, baseCurrency, formattingLocale)}{" "}
                                  ·{" "}
                                  {formatExpectedFinancialEventTimingLabel(ev, formattingLocale)}
                                  {ev.description ? ` · ${ev.description}` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1">{t("detailNoEvents")}</p>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {balancedAccounts.length > 0 ? (
            <FinanceWorkspaceDisclosure
              title={t("balancedAccountsTitle", { count: balancedAccounts.length })}
              expandLabel={t("disclosureShow")}
              collapseLabel={t("disclosureHide")}
              data-finance-disclosure="timing-balanced-accounts"
            >
              <ul className="divide-y divide-[var(--sce-surface-border-subtle)]/70">
                {balancedAccounts.map((account) => (
                  <li
                    key={account.financialAccountId}
                    className="px-4 py-2 text-sm text-[var(--text-2)] sm:px-5"
                  >
                    {account.name} · {t("accountFullyScheduled")}
                  </li>
                ))}
              </ul>
            </FinanceWorkspaceDisclosure>
          ) : null}

          {showAllEventsDisclosure ? (
            <FinanceWorkspaceDisclosure
              title={t("allEventsTitle", { count: events.length })}
              expandLabel={t("disclosureShow")}
              collapseLabel={t("disclosureHide")}
              data-finance-disclosure="timing-all-events"
            >
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-0 text-sm">
                  <thead>
                    <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">{t("eventsColumnTiming")}</th>
                      <th className="px-3 py-2">{t("eventsColumnAccount")}</th>
                      <th className="px-3 py-2">{t("eventsColumnDescription")}</th>
                      <th className="px-3 py-2 text-right">{t("eventsColumnAmount")}</th>
                      {canMutate ? <th className="px-3 py-2">{t("eventsColumnActions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const accountName =
                        accountOptions.find((a) => a.financialAccountId === event.financialAccountId)
                          ?.name ?? event.financialAccountId;
                      const manualEditable = event.sourceKind === "MANUAL";
                      return (
                        <tr key={event.id} className={FINANCE_TABLE_ROW_CLASS}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatExpectedFinancialEventTimingLabel(event, formattingLocale)}
                          </td>
                          <td className="px-3 py-2">{accountName}</td>
                          <td className="px-3 py-2 max-w-[12rem] truncate">
                            {event.description ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatAmount(event.expectedAmountMinor, baseCurrency, formattingLocale)}
                          </td>
                          {canMutate ? (
                            <td className="px-3 py-2">
                              {manualEditable ? (
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEdit(event)}
                                  >
                                    {t("editEvent")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDelete(event)}
                                  >
                                    {t("deleteEvent")}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--muted)]">{t("sourceOwned")}</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </FinanceWorkspaceDisclosure>
          ) : null}
        </>
      ) : null}

      {selectedYearId && overview ? (
        <>
          <FinanceExpectedFinancialEventDialog
            open={eventDialogOpen}
            onClose={() => setEventDialogOpen(false)}
            onSaved={refresh}
            financeYearId={selectedYearId}
            actualsThroughDateIso={overview.actualsThroughDateIso}
            accounts={accountOptions}
            existing={editingEvent}
            presetAccountId={presetAccountId}
          />
          <FinanceExpectedFinancialEventDeleteDialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onDeleted={refresh}
            financeYearId={selectedYearId}
            event={deletingEvent}
          />
        </>
      ) : null}
    </div>
  );
}

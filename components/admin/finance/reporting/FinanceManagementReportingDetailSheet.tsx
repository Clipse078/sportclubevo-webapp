"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import {
  formatManagementPnlMeasureCell,
  formatManagementPnlVarianceDelta,
  formatManagementPnlVariancePercent,
} from "@/lib/finance/presentation/format-management-pnl-measure";
import {
  financeVarianceComparisonSemanticTextClass,
  financeVarianceFavorabilityLabelKey,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import {
  assessFinanceReportingActualEvidenceReconciliation,
  buildFinanceReportingInvestigationInterpretation,
  FINANCE_REPORTING_INVESTIGATION_EVIDENCE_INITIAL_VISIBLE,
  financeReportingInvestigationInterpretationMessageKey,
  financeReportingInvestigationVarianceRank,
  interpolateFinanceReportingMessage,
  resolveFinanceActualEntryDescriptionPresentation,
} from "@/lib/finance/presentation/finance-reporting-investigation-presentation";
import type { SerializedFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";
import { FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID } from "@/lib/finance/reporting/pnl-reporting-completeness";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

export type FinanceManagementReportingDetailLabels = {
  sheetTitleAccount: string;
  sheetTitleGroup: string;
  hierarchyLabel: string;
  summaryTitle: string;
  periodContextTitle: string;
  actualGrainAnnual: string;
  actualGrainYtd: string;
  evidenceTitle: string;
  actualEntriesTitle: string;
  noActualEntries: string;
  evidenceNotVisible: string;
  sourceActionsTitle: string;
  openBudget: string;
  openActuals: string;
  openForecast: string;
  openTiming: string;
  archivedAccount: string;
  unassignedAccount: string;
  notFoundTitle: string;
  notFoundBody: string;
  columnBudget: string;
  columnActual: string;
  columnForecast: string;
  columnVariance: string;
  varianceVsBudgetLabel: string;
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  entryDate: string;
  entryAmount: string;
  entryDescription: string;
  evidenceEntryFallback: string;
  evidenceShowAll: string;
  evidenceReconciliationSummary: string;
  evidenceReconciliationRestricted: string;
  groupAccountsTitle: string;
  investigateAccount: string;
  closeDetail: string;
  semanticIncomeLabel: string;
  semanticExpenseLabel: string;
  targetKindAccountLabel: string;
  targetKindGroupLabel: string;
  interpretationForecastAboveBudget: string;
  interpretationForecastBelowBudget: string;
  interpretationForecastOnBudget: string;
  actualContextSeparator: string;
  grainExplanationYtdVsAnnualPlan: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  detail: SerializedFinanceManagementReportingDetailReadModel | null;
  loading: boolean;
  formattingLocale: string;
  labels: FinanceManagementReportingDetailLabels;
  onInvestigateAccount: (accountId: string) => void;
};

function favorabilityLabel(
  labels: FinanceManagementReportingDetailLabels,
  favorability: VarianceFavorability,
): string {
  const key = financeVarianceFavorabilityLabelKey(favorability);
  if (key === "favorabilityFavorable") return labels.favorabilityFavorable;
  if (key === "favorabilityUnfavorable") return labels.favorabilityUnfavorable;
  return labels.favorabilityOnPlan;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function investigationTargetAriaLabel(actionLabel: string, targetName: string): string {
  return `${actionLabel}: ${targetName}`;
}

function actualLabelWithPeriod(
  detail: SerializedFinanceManagementReportingDetailReadModel,
  labels: FinanceManagementReportingDetailLabels,
  formattingLocale: string,
): { primary: string; context: string | null } {
  if (detail.actualGrain === "YTD") {
    const cutoff = detail.actualCutoffDate
      ? formatDate(detail.actualCutoffDate, formattingLocale)
      : null;
    return {
      primary: cutoff ? `${labels.actualGrainYtd} ${cutoff}` : labels.actualGrainYtd,
      context: null,
    };
  }
  if (detail.actualGrain === "ANNUAL_FULL_YEAR") {
    return { primary: labels.columnActual, context: labels.actualGrainAnnual };
  }
  return { primary: labels.columnActual, context: null };
}

function buildSheetIdentityMeta(
  detail: SerializedFinanceManagementReportingDetailReadModel,
  labels: FinanceManagementReportingDetailLabels,
): string {
  const semantic =
    detail.canonicalSemantic === "INCOME" ? labels.semanticIncomeLabel : labels.semanticExpenseLabel;
  const kind =
    detail.targetKind === "REPORTING_GROUP"
      ? labels.targetKindGroupLabel
      : labels.targetKindAccountLabel;
  return `${semantic}${labels.actualContextSeparator}${kind}`;
}

function buildHierarchyPathLabel(
  detail: SerializedFinanceManagementReportingDetailReadModel,
  labels: FinanceManagementReportingDetailLabels,
): string | null {
  if (detail.hierarchyPath.length === 0) return null;
  return detail.hierarchyPath
    .map((segment) =>
      segment.id === FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID
        ? labels.unassignedAccount
        : segment.name,
    )
    .join(" / ");
}

function formatEntryAmount(
  amountMinor: number,
  currency: string | null,
  locale: string,
): string {
  return formatFinanceManagementMoneyMinor(amountMinor, currency, locale);
}

export function FinanceManagementReportingDetailSheet({
  open,
  onClose,
  detail,
  loading,
  formattingLocale,
  labels,
  onInvestigateAccount,
}: Props) {
  const evidenceScopeKey = `${detail?.accountId ?? ""}:${detail?.groupId ?? ""}`;
  const [evidenceExpandedScope, setEvidenceExpandedScope] = useState<string | null>(null);
  const evidenceExpanded = evidenceExpandedScope === evidenceScopeKey;

  const sheetTitle = detail?.name ?? "";
  const sheetDescription =
    detail?.availability === "AVAILABLE" ? buildSheetIdentityMeta(detail, labels) : undefined;
  const hierarchyPathLabel =
    detail?.availability === "AVAILABLE" ? buildHierarchyPathLabel(detail, labels) : null;

  const interpretation = useMemo(() => {
    if (!detail || detail.availability !== "AVAILABLE") return null;
    return buildFinanceReportingInvestigationInterpretation({
      forecastVsBudget: detail.forecastVsBudget,
      baseCurrency: detail.baseCurrency,
      locale: formattingLocale,
    });
  }, [detail, formattingLocale]);

  const interpretationSentence = useMemo(() => {
    if (!interpretation || interpretation.kind !== "FORECAST_VS_BUDGET") return null;
    const key = financeReportingInvestigationInterpretationMessageKey(interpretation.direction);
    const template =
      key === "interpretationForecastAboveBudget"
        ? labels.interpretationForecastAboveBudget
        : key === "interpretationForecastBelowBudget"
          ? labels.interpretationForecastBelowBudget
          : labels.interpretationForecastOnBudget;
    return interpolateFinanceReportingMessage(template, {
      variance: interpretation.varianceFormatted,
    });
  }, [interpretation, labels]);

  const sortedGroupAccounts = useMemo(() => {
    if (!detail || detail.targetKind !== "REPORTING_GROUP") return [];
    return [...detail.childAccountSummaries].sort(
      (a, b) =>
        financeReportingInvestigationVarianceRank(b.forecastVsBudget) -
        financeReportingInvestigationVarianceRank(a.forecastVsBudget),
    );
  }, [detail]);

  const evidenceEntries = detail?.actualEvidence.entries ?? [];
  const visibleEvidenceEntries =
    evidenceExpanded || evidenceEntries.length <= FINANCE_REPORTING_INVESTIGATION_EVIDENCE_INITIAL_VISIBLE
      ? evidenceEntries
      : evidenceEntries.slice(0, FINANCE_REPORTING_INVESTIGATION_EVIDENCE_INITIAL_VISIBLE);

  const anyMeaningfulDescription = evidenceEntries.some(
    (e) => resolveFinanceActualEntryDescriptionPresentation(e.description).kind === "MEANINGFUL",
  );

  const evidenceReconciliation =
    detail?.availability === "AVAILABLE" && detail.targetKind === "ACCOUNT"
      ? assessFinanceReportingActualEvidenceReconciliation({
          actual: detail.actual,
          entries: evidenceEntries,
        })
      : { kind: "NOT_APPLICABLE" as const };

  const actualPeriod = detail?.availability === "AVAILABLE" ? actualLabelWithPeriod(detail, labels, formattingLocale) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      description={sheetDescription}
      panelClassName="w-full sm:w-[min(100vw-1rem,720px)] md:w-[min(100vw-1rem,760px)] lg:w-[min(100vw-1rem,780px)]"
    >
      {loading ? (
        <p className="text-sm text-[var(--muted)]" data-finance-reporting-detail-loading>
          …
        </p>
      ) : null}
      {!loading && detail?.availability === "NOT_FOUND" ? (
        <div data-finance-reporting-detail-not-found>
          <h3 className="text-base font-semibold">{labels.notFoundTitle}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{labels.notFoundBody}</p>
        </div>
      ) : null}
      {!loading && detail?.availability === "AVAILABLE" ? (
        <div className="space-y-6" data-finance-reporting-detail-body>
          {hierarchyPathLabel ? (
            <p
              className="-mt-2 text-xs text-[var(--muted)]"
              data-finance-reporting-detail-hierarchy
            >
              {hierarchyPathLabel}
            </p>
          ) : null}
          {(detail.isUnassignedResidual || detail.lifecycle === "ARCHIVED") && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]" data-finance-reporting-detail-badges>
              {detail.isUnassignedResidual ? <span>{labels.unassignedAccount}</span> : null}
              {detail.lifecycle === "ARCHIVED" ? <span>{labels.archivedAccount}</span> : null}
            </div>
          )}

          <section
            aria-labelledby="finance-reporting-detail-summary"
            data-finance-reporting-detail-summary
          >
            <h3 id="finance-reporting-detail-summary" className="sr-only">
              {labels.summaryTitle}
            </h3>
            {interpretationSentence ? (
              <p
                className="text-base font-semibold leading-snug text-[var(--foreground)]"
                data-finance-reporting-detail-interpretation
              >
                {interpretationSentence}
              </p>
            ) : null}
            <div
              className={cn(
                "mt-3 space-y-2 text-sm",
                interpretationSentence ? "mt-3" : "",
              )}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[var(--muted)]">{labels.columnBudget}</span>
                <span className="tabular-nums font-medium text-[var(--foreground)]">
                  {formatManagementPnlMeasureCell(
                    detail.approvedBudget,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </span>
              </div>
              <div
                className="flex items-baseline justify-between gap-4"
                data-finance-reporting-detail-actual-context
                data-finance-comparative-actual-role={
                  detail.actualGrain === "YTD" ? "CONTEXT_ONLY" : "SUPPORTED"
                }
              >
                <div className="min-w-0 text-[var(--muted)]">
                  <span>{actualPeriod?.primary}</span>
                  {actualPeriod?.context ? (
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{actualPeriod.context}</span>
                  ) : null}
                  {detail.comparativePeriodContext.grainExplanationKey === "YTD_ACTUAL_VS_ANNUAL_PLAN" ? (
                    <span
                      className="mt-1 block text-xs leading-relaxed text-[var(--muted)]"
                      data-finance-comparative-grain-explanation
                    >
                      {labels.grainExplanationYtdVsAnnualPlan}
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 tabular-nums font-medium text-[var(--foreground)]">
                  {formatManagementPnlMeasureCell(detail.actual, detail.baseCurrency, formattingLocale)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-[var(--foreground)]">{labels.columnForecast}</span>
                <span className="tabular-nums font-semibold text-[var(--foreground)]">
                  {formatManagementPnlMeasureCell(
                    detail.currentForecast,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </span>
              </div>
              <div
                className="border-t border-[var(--sce-surface-border-subtle)]/80 pt-2.5"
                data-finance-reporting-detail-variance
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-[var(--foreground)]">{labels.varianceVsBudgetLabel}</span>
                  <div
                    className={cn(
                      "text-right tabular-nums font-semibold",
                      financeVarianceComparisonSemanticTextClass({
                        favorability: detail.forecastVsBudget.favorability,
                        hasComparison: detail.forecastVsBudget.availability === "AVAILABLE",
                      }),
                    )}
                  >
                    <span className="block">
                      {formatManagementPnlVarianceDelta(
                        detail.forecastVsBudget,
                        detail.baseCurrency,
                        formattingLocale,
                      )}
                    </span>
                    {detail.forecastVsBudget.availability === "AVAILABLE" &&
                    detail.forecastVsBudget.favorability ? (
                      <span className="block text-xs font-normal text-[var(--muted)]">
                        {favorabilityLabel(labels, detail.forecastVsBudget.favorability)}
                        {detail.forecastVsBudget.variancePercent !== null ? (
                          <>
                            {" · "}
                            {formatManagementPnlVariancePercent(
                              detail.forecastVsBudget,
                              formattingLocale,
                            )}
                          </>
                        ) : null}
                      </span>
                    ) : (
                      <span className="block text-xs font-normal text-[var(--muted)]">
                        {formatManagementPnlVariancePercent(detail.forecastVsBudget, formattingLocale)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {detail.targetKind === "REPORTING_GROUP" && sortedGroupAccounts.length > 0 ? (
            <section
              aria-labelledby="finance-reporting-detail-group-accounts"
              data-finance-reporting-detail-group-composition
            >
              <h3 id="finance-reporting-detail-group-accounts" className="text-sm font-semibold">
                {labels.groupAccountsTitle}
              </h3>
              <ul className="mt-2 space-y-1">
                {sortedGroupAccounts.map((account) => (
                  <li key={account.accountId}>
                    <button
                      type="button"
                      data-finance-reporting-detail-investigate="account"
                      className="group/child flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--surface-2)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                      aria-label={investigationTargetAriaLabel(labels.investigateAccount, account.name)}
                      onClick={() => onInvestigateAccount(account.accountId)}
                    >
                      <span className="min-w-0 truncate font-medium">{account.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums text-[var(--muted)]">
                        {formatManagementPnlVarianceDelta(
                          account.forecastVsBudget,
                          detail.baseCurrency,
                          formattingLocale,
                        )}
                        <ChevronRight
                          className="h-3.5 w-3.5 opacity-70 group-hover/child:opacity-100 group-focus-visible/child:opacity-100"
                          aria-hidden
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.targetKind === "ACCOUNT" ? (
            <section
              aria-labelledby="finance-reporting-detail-evidence"
              data-finance-reporting-detail-evidence
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="finance-reporting-detail-evidence" className="text-sm font-semibold">
                  {labels.evidenceTitle}
                </h3>
                {evidenceReconciliation.kind === "RECONCILES" ? (
                  <p className="text-xs text-[var(--muted)]" data-finance-reporting-detail-evidence-reconciliation>
                    {interpolateFinanceReportingMessage(labels.evidenceReconciliationSummary, {
                      count: String(evidenceReconciliation.entryCount),
                      total: formatFinanceManagementMoneyMinor(
                        evidenceReconciliation.entriesTotalMinor,
                        detail.baseCurrency,
                        formattingLocale,
                      ),
                    })}
                  </p>
                ) : null}
              </div>
              {detail.actualEvidence.availability === "NOT_VISIBLE" ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{labels.evidenceNotVisible}</p>
              ) : null}
              {detail.actualEvidence.availability === "NO_ENTRIES" ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{labels.noActualEntries}</p>
              ) : null}
              {detail.actualEvidence.availability === "AVAILABLE" ? (
                <>
                  <ul
                    className="mt-3 divide-y divide-[var(--sce-surface-border-subtle)]/50"
                    data-finance-reporting-detail-evidence-list
                  >
                    {visibleEvidenceEntries.map((entry) => {
                      const desc = resolveFinanceActualEntryDescriptionPresentation(entry.description);
                      const amount = formatEntryAmount(
                        entry.amountMinor,
                        entry.currency ?? detail.baseCurrency,
                        formattingLocale,
                      );
                      return (
                        <li
                          key={entry.entryId}
                          className="flex items-baseline justify-between gap-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <span className="tabular-nums text-[var(--foreground)]">
                              {formatDate(entry.effectiveDate, formattingLocale)}
                            </span>
                            {desc.kind === "MEANINGFUL" ? (
                              <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                                {desc.text}
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 tabular-nums font-medium">{amount}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {evidenceEntries.length > FINANCE_REPORTING_INVESTIGATION_EVIDENCE_INITIAL_VISIBLE &&
                  !evidenceExpanded ? (
                    <button
                      type="button"
                      className="mt-2 text-sm font-medium text-[var(--sce-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                      data-finance-reporting-detail-evidence-expand
                      onClick={() => setEvidenceExpandedScope(evidenceScopeKey)}
                    >
                      {interpolateFinanceReportingMessage(labels.evidenceShowAll, {
                        count: String(evidenceEntries.length),
                      })}
                    </button>
                  ) : null}
                  {anyMeaningfulDescription ? (
                    <span className="sr-only">{labels.entryDescription}</span>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}

          <section
            aria-labelledby="finance-reporting-detail-sources"
            data-finance-reporting-detail-sources
            className="border-t border-[var(--sce-surface-border-subtle)]/60 pt-4"
          >
            <h3
              id="finance-reporting-detail-sources"
              className="text-xs font-medium text-[var(--muted)]"
            >
              {labels.sourceActionsTitle}
            </h3>
            <ul className="mt-2 space-y-1">
              {detail.sourceActions.budget.canNavigate && detail.sourceActions.budget.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.budget.href}
                    className="group/link inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  >
                    {labels.openBudget}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/link:opacity-100" aria-hidden />
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.actual.canNavigate && detail.sourceActions.actual.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.actual.href}
                    className="group/link inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  >
                    {labels.openActuals}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/link:opacity-100" aria-hidden />
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.forecast.canNavigate && detail.sourceActions.forecast.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.forecast.href}
                    className="group/link inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  >
                    {labels.openForecast}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/link:opacity-100" aria-hidden />
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.timing.canNavigate && detail.sourceActions.timing.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.timing.href}
                    className="group/link inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  >
                    {labels.openTiming}
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/link:opacity-100" aria-hidden />
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      ) : null}
    </Sheet>
  );
}

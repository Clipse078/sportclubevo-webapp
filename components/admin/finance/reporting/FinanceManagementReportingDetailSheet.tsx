"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  favorabilityFavorable: string;
  favorabilityUnfavorable: string;
  favorabilityOnPlan: string;
  entryDate: string;
  entryAmount: string;
  entryDescription: string;
  groupAccountsTitle: string;
  investigateAccount: string;
  closeDetail: string;
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

function formatMoneyMinor(amountMinor: number, currency: string | null, locale: string): string {
  if (!currency) return String(amountMinor);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

function investigationTargetAriaLabel(actionLabel: string, targetName: string): string {
  return `${actionLabel}: ${targetName}`;
}

function actualColumnLabel(
  detail: SerializedFinanceManagementReportingDetailReadModel,
  labels: FinanceManagementReportingDetailLabels,
  formattingLocale: string,
): string {
  if (detail.actualGrain === "YTD") {
    const cutoff = detail.actualCutoffDate
      ? formatDate(detail.actualCutoffDate, formattingLocale)
      : null;
    return cutoff ? `${labels.actualGrainYtd} ${cutoff}` : labels.actualGrainYtd;
  }
  return labels.columnActual;
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
  const title =
    detail?.targetKind === "REPORTING_GROUP" ? labels.sheetTitleGroup : labels.sheetTitleAccount;
  const displayName = detail?.name ?? "";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={displayName ? `${title}: ${displayName}` : title}
      panelClassName="w-full sm:w-[min(100%,720px)] lg:w-[760px]"
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
        <div className="space-y-5" data-finance-reporting-detail-body>
          <header className="space-y-1" data-finance-reporting-detail-identity>
            <p className="text-base font-semibold text-[var(--foreground)]">{displayName}</p>
            {detail.isUnassignedResidual ? (
              <p className="text-xs text-[var(--muted)]">{labels.unassignedAccount}</p>
            ) : null}
            {detail.lifecycle === "ARCHIVED" ? (
              <p className="text-xs text-[var(--muted)]">{labels.archivedAccount}</p>
            ) : null}
            {detail.hierarchyPath.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">{labels.hierarchyLabel}</p>
                <p className="text-sm text-[var(--foreground)]">
                  {detail.hierarchyPath
                    .map((segment) =>
                      segment.id === FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID
                        ? labels.unassignedAccount
                        : segment.name,
                    )
                    .join(" › ")}
                </p>
              </div>
            ) : null}
          </header>

          <section
            aria-labelledby="finance-reporting-detail-summary"
            data-finance-reporting-detail-summary
          >
            <h3 id="finance-reporting-detail-summary" className="text-sm font-semibold">
              {labels.summaryTitle}
            </h3>
            <dl className="mt-2 divide-y divide-[var(--sce-surface-border-subtle)]/60 rounded-md border border-[var(--sce-surface-border-subtle)]/80 text-sm">
              <div className="flex items-baseline justify-between gap-4 px-3 py-2">
                <dt className="text-[var(--muted)]">{labels.columnBudget}</dt>
                <dd className="tabular-nums font-medium">
                  {formatManagementPnlMeasureCell(
                    detail.approvedBudget,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-3 py-2">
                <dt className="text-[var(--muted)]">
                  {actualColumnLabel(detail, labels, formattingLocale)}
                </dt>
                <dd className="tabular-nums font-medium">
                  {formatManagementPnlMeasureCell(detail.actual, detail.baseCurrency, formattingLocale)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-3 py-2">
                <dt className="text-[var(--muted)]">{labels.columnForecast}</dt>
                <dd className="tabular-nums font-medium">
                  {formatManagementPnlMeasureCell(
                    detail.currentForecast,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 bg-[var(--sce-surface-dense)]/50 px-3 py-2.5">
                <dt className="font-medium text-[var(--foreground)]">{labels.columnVariance}</dt>
                <dd
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
                    </span>
                  ) : null}
                  <span className="block text-xs font-normal text-[var(--muted)]">
                    {formatManagementPnlVariancePercent(detail.forecastVsBudget, formattingLocale)}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {detail.actualGrain === "ANNUAL_FULL_YEAR" ? (
            <section
              aria-labelledby="finance-reporting-detail-period"
              data-finance-reporting-detail-period
              className="text-sm"
            >
              <h3 id="finance-reporting-detail-period" className="text-xs font-medium text-[var(--muted)]">
                {labels.periodContextTitle}
              </h3>
              <p className="mt-0.5 text-[var(--foreground)]">{labels.actualGrainAnnual}</p>
            </section>
          ) : null}

          {detail.targetKind === "REPORTING_GROUP" && detail.childAccountSummaries.length > 0 ? (
            <section
              aria-labelledby="finance-reporting-detail-group-accounts"
              data-finance-reporting-detail-group-composition
            >
              <h3 id="finance-reporting-detail-group-accounts" className="text-sm font-semibold">
                {labels.groupAccountsTitle}
              </h3>
              <ul className="mt-2 space-y-1">
                {detail.childAccountSummaries.map((account) => (
                  <li key={account.accountId}>
                    <button
                      type="button"
                      data-finance-reporting-detail-investigate="account"
                      className="group/child flex w-full items-center justify-between gap-3 rounded-md border border-[var(--sce-surface-border-subtle)]/80 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
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
              <h3 id="finance-reporting-detail-evidence" className="text-sm font-semibold">
                {labels.evidenceTitle}
              </h3>
              <h4 className="mt-1 text-xs font-medium text-[var(--muted)]">
                {labels.actualEntriesTitle}
              </h4>
              {detail.actualEvidence.availability === "NOT_VISIBLE" ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{labels.evidenceNotVisible}</p>
              ) : null}
              {detail.actualEvidence.availability === "NO_ENTRIES" ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{labels.noActualEntries}</p>
              ) : null}
              {detail.actualEvidence.availability === "AVAILABLE" ? (
                <div className="mt-2 overflow-x-auto rounded-md border border-[var(--sce-surface-border-subtle)]/60">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--sce-surface-border-subtle)] text-left text-xs text-[var(--muted)]">
                        <th scope="col" className="py-2 pl-3 pr-3 font-medium">
                          {labels.entryDate}
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium text-right">
                          {labels.entryAmount}
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium">
                          {labels.entryDescription}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.actualEvidence.entries.map((entry) => (
                        <tr
                          key={entry.entryId}
                          className="border-b border-[var(--sce-surface-border-subtle)]/60 last:border-0"
                        >
                          <td className="py-2 pl-3 pr-3 tabular-nums">
                            {formatDate(entry.effectiveDate, formattingLocale)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {formatMoneyMinor(entry.amountMinor, entry.currency, formattingLocale)}
                          </td>
                          <td className="py-2 pr-3 text-[var(--muted)]">{entry.description ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
            >
              {labels.sourceActionsTitle}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {detail.sourceActions.budget.canNavigate && detail.sourceActions.budget.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.budget.href}
                    className="inline-flex h-8 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  >
                    {labels.openBudget}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.actual.canNavigate && detail.sourceActions.actual.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.actual.href}
                    className="inline-flex h-8 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  >
                    {labels.openActuals}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.forecast.canNavigate && detail.sourceActions.forecast.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.forecast.href}
                    className="inline-flex h-8 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  >
                    {labels.openForecast}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.timing.canNavigate && detail.sourceActions.timing.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.timing.href}
                    className="inline-flex h-8 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  >
                    {labels.openTiming}
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

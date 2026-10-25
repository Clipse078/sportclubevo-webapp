"use client";

import Link from "next/link";
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
        <div className="space-y-6" data-finance-reporting-detail-body>
          <div className="space-y-1 text-sm">
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
          </div>

          <section aria-labelledby="finance-reporting-detail-summary">
            <h3 id="finance-reporting-detail-summary" className="text-sm font-semibold">
              {labels.summaryTitle}
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--muted)]">{labels.columnBudget}</dt>
                <dd className="tabular-nums text-sm font-medium">
                  {formatManagementPnlMeasureCell(
                    detail.approvedBudget,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{labels.columnActual}</dt>
                <dd className="tabular-nums text-sm font-medium">
                  {formatManagementPnlMeasureCell(detail.actual, detail.baseCurrency, formattingLocale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{labels.columnForecast}</dt>
                <dd className="tabular-nums text-sm font-medium">
                  {formatManagementPnlMeasureCell(
                    detail.currentForecast,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{labels.columnVariance}</dt>
                <dd
                  className={cn(
                    "tabular-nums text-sm font-semibold",
                    financeVarianceComparisonSemanticTextClass({
                      favorability: detail.forecastVsBudget.favorability,
                      hasComparison: detail.forecastVsBudget.availability === "AVAILABLE",
                    }),
                  )}
                >
                  {formatManagementPnlVarianceDelta(
                    detail.forecastVsBudget,
                    detail.baseCurrency,
                    formattingLocale,
                  )}
                  {detail.forecastVsBudget.availability === "AVAILABLE" &&
                  detail.forecastVsBudget.favorability ? (
                    <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                      {favorabilityLabel(labels, detail.forecastVsBudget.favorability)}
                    </span>
                  ) : null}
                  <div className="text-xs font-normal text-[var(--muted)]">
                    {formatManagementPnlVariancePercent(detail.forecastVsBudget, formattingLocale)}
                  </div>
                </dd>
              </div>
            </dl>
          </section>

          {detail.actualGrain ? (
            <section aria-labelledby="finance-reporting-detail-period">
              <h3 id="finance-reporting-detail-period" className="text-sm font-semibold">
                {labels.periodContextTitle}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {detail.actualGrain === "YTD"
                  ? `${labels.actualGrainYtd}${
                      detail.actualCutoffDate
                        ? ` ${formatDate(detail.actualCutoffDate, formattingLocale)}`
                        : ""
                    }`
                  : labels.actualGrainAnnual}
              </p>
            </section>
          ) : null}

          {detail.targetKind === "REPORTING_GROUP" && detail.childAccountSummaries.length > 0 ? (
            <section aria-labelledby="finance-reporting-detail-group-accounts">
              <h3 id="finance-reporting-detail-group-accounts" className="text-sm font-semibold">
                {labels.groupAccountsTitle}
              </h3>
              <ul className="mt-2 space-y-2">
                {detail.childAccountSummaries.map((account) => (
                  <li key={account.accountId}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--sce-surface-border-subtle)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                      onClick={() => onInvestigateAccount(account.accountId)}
                    >
                      <span className="font-medium">{account.name}</span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">
                        {formatManagementPnlVarianceDelta(
                          account.forecastVsBudget,
                          detail.baseCurrency,
                          formattingLocale,
                        )}
                      </span>
                      <span className="sr-only">{labels.investigateAccount}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.targetKind === "ACCOUNT" ? (
            <section aria-labelledby="finance-reporting-detail-evidence">
              <h3 id="finance-reporting-detail-evidence" className="text-sm font-semibold">
                {labels.evidenceTitle}
              </h3>
              <h4 className="mt-2 text-xs font-medium text-[var(--muted)]">
                {labels.actualEntriesTitle}
              </h4>
              {detail.actualEvidence.availability === "NOT_VISIBLE" ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{labels.evidenceNotVisible}</p>
              ) : null}
              {detail.actualEvidence.availability === "NO_ENTRIES" ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{labels.noActualEntries}</p>
              ) : null}
              {detail.actualEvidence.availability === "AVAILABLE" ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--sce-surface-border-subtle)] text-left text-xs text-[var(--muted)]">
                        <th scope="col" className="py-2 pr-3 font-medium">
                          {labels.entryDate}
                        </th>
                        <th scope="col" className="py-2 pr-3 font-medium text-right">
                          {labels.entryAmount}
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          {labels.entryDescription}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.actualEvidence.entries.map((entry) => (
                        <tr
                          key={entry.entryId}
                          className="border-b border-[var(--sce-surface-border-subtle)]/60"
                        >
                          <td className="py-2 pr-3 tabular-nums">
                            {formatDate(entry.effectiveDate, formattingLocale)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {formatMoneyMinor(entry.amountMinor, entry.currency, formattingLocale)}
                          </td>
                          <td className="py-2 text-[var(--muted)]">{entry.description ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="finance-reporting-detail-sources">
            <h3 id="finance-reporting-detail-sources" className="text-sm font-semibold">
              {labels.sourceActionsTitle}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {detail.sourceActions.budget.canNavigate && detail.sourceActions.budget.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.budget.href}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    {labels.openBudget}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.actual.canNavigate && detail.sourceActions.actual.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.actual.href}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    {labels.openActuals}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.forecast.canNavigate && detail.sourceActions.forecast.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.forecast.href}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    {labels.openForecast}
                  </Link>
                </li>
              ) : null}
              {detail.sourceActions.timing.canNavigate && detail.sourceActions.timing.href ? (
                <li>
                  <Link
                    href={detail.sourceActions.timing.href}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--sce-surface-border-subtle)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
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

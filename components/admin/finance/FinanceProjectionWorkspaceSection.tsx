"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import {
  formatFinanceAutomaticForecastMoneyMinor,
  formatFinanceAutomaticForecastSignedMinor,
} from "@/lib/finance/projection/projection-amount-presentation";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import type { ProjectionWorkspaceViewModel } from "@/lib/finance/projection/projection-workspace-presentation";
import {
  formatProjectionSourceCutoffDate,
  PROJECTION_CONFIDENCE_PRODUCT_TERM,
} from "@/lib/finance/projection/projection-workspace-presentation";
import type { ProjectionAccountExplainabilityDetailViewModel } from "@/lib/finance/projection/projection-workspace-explainability";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
  FINANCE_TABLE_HEAD_ROW_CLASS,
  FINANCE_TABLE_ROW_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import {
  FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS,
  FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_TABLE_CLASS,
} from "@/lib/finance/presentation/finance-variance-comparison-table-layout";
import { FinanceProjectionOutlookChart } from "@/components/admin/finance/projection/FinanceProjectionOutlookChart";
import { FinanceProjectionCompositionChart } from "@/components/admin/finance/projection/FinanceProjectionCompositionChart";
import { FinanceProjectionDivergenceChart } from "@/components/admin/finance/projection/FinanceProjectionDivergenceChart";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  adoptProjectionAction,
  generateProjectionAction,
} from "@/app/(admin)/dashboard/finance/forecast/actions";

type FinanceProjectionWorkspaceSectionProps = {
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
  canGenerate: boolean;
};

export function FinanceProjectionWorkspaceSection({
  projection,
  currency,
  formattingLocale,
  canGenerate,
}: FinanceProjectionWorkspaceSectionProps) {
  const t = useTranslations("Finance.forecast.projection");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adoptPending, startAdoptTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false);

  const hasGeneratedVersion = projection.versionNumber !== null;

  const coverageLabel = useMemo(() => {
    if (!hasGeneratedVersion) return null;
    const { projectedAccountCount, eligibleAccountCount } = projection.coverage;
    if (eligibleAccountCount === 0) return null;
    return t("coveragePositions", {
      projected: projectedAccountCount,
      total: eligibleAccountCount,
    });
  }, [hasGeneratedVersion, projection.coverage, t]);

  function runGeneration() {
    startTransition(async () => {
      const result = await generateProjectionAction({
        financeYearId: projection.financeYearId,
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback(null);
      router.refresh();
    });
  }

  const actionLabel =
    projection.presentationState === "NO_PROJECTION" ? t("createAction") : t("refreshAction");

  const showDashboard =
    hasGeneratedVersion && projection.coverage.projectedAccountCount > 0 && projection.dashboard;

  const adoption = projection.adoption;
  const showAdoptAction =
    canGenerate && adoption !== null && adoption.canAdopt && projection.projectionVersionId !== null;

  const adoptBlockedStale =
    canGenerate && adoption !== null && adoption.blockReason === "STALE_PROJECTION";
  const adoptBlockedNoEligible =
    canGenerate && adoption !== null && adoption.blockReason === "NO_ELIGIBLE_LINES";

  function runAdoption() {
    if (!adoption || !projection.projectionVersionId) return;
    startAdoptTransition(async () => {
      const result = await adoptProjectionAction({
        financeYearId: projection.financeYearId,
        expectedSourceForecastVersionId: adoption.sourceForecastVersionId,
        expectedProjectionVersionId: adoption.projectionVersionId,
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback(null);
      setSuccessMessage(t("adoptSuccess"));
      setAdoptDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <section
      className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "space-y-4")}
      data-finance-projection-state={projection.presentationState}
      aria-labelledby="finance-sce-projection-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="finance-sce-projection-heading" className={FINANCE_SECTION_HEADER_CLASS}>
            {t("sectionTitle")}
          </h2>
          {projection.presentationState === "NO_PROJECTION" ? (
            <>
              <p className="max-w-2xl text-sm text-[var(--foreground)]">{t("introBody")}</p>
              <p className="max-w-2xl text-xs text-[var(--muted)]">{t("introExplainHint")}</p>
            </>
          ) : (
            <p className="max-w-2xl text-sm text-[var(--muted)]">{t("sectionDescription")}</p>
          )}
          {projection.actualsThroughDate ? (
            <p className="text-xs text-[var(--muted)]">
              {t("sourceCutoff", {
                date: formatProjectionSourceCutoffDate(
                  projection.actualsThroughDate,
                  formattingLocale,
                ),
              })}
            </p>
          ) : null}
          {projection.generatedAtIso ? (
            <p className="text-xs text-[var(--muted)]">
              {t("generatedAt", {
                date: new Intl.DateTimeFormat(formattingLocale, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(projection.generatedAtIso)),
              })}
            </p>
          ) : null}
          {projection.staleness === "STALE" ? (
            <p className="text-sm text-[var(--muted)]">{t("staleHint")}</p>
          ) : null}
          {coverageLabel ? (
            <p className="text-xs text-[var(--muted)]">{coverageLabel}</p>
          ) : null}
          {projection.dashboard?.confidenceNote ? (
            <p className="text-xs text-[var(--muted)]">{projection.dashboard.confidenceNote}</p>
          ) : null}
        </div>
        {canGenerate ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Button
              className="h-8 px-3 text-sm"
              variant="secondary"
              disabled={pending}
              onClick={runGeneration}
              data-finance-projection-action={
                projection.presentationState === "NO_PROJECTION" ? "create" : "refresh"
              }
            >
              {actionLabel}
            </Button>
            {showAdoptAction ? (
              <Button
                className="h-8 px-3 text-sm"
                disabled={adoptPending}
                onClick={() => setAdoptDialogOpen(true)}
                data-finance-projection-action="adopt"
              >
                {t("adoptAction")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {adoptBlockedStale ? (
        <p className="text-sm text-[var(--muted)]">{t("adoptStaleBlocked")}</p>
      ) : null}
      {adoptBlockedNoEligible ? (
        <p className="text-sm text-[var(--muted)]">{t("adoptNoEligible")}</p>
      ) : null}

      {successMessage ? (
        <p className="text-sm text-[var(--foreground)]" role="status">
          {successMessage}
        </p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {projection.presentationState === "INSUFFICIENT" ? (
        <p className="text-sm text-[var(--muted)]">{t("insufficientBody")}</p>
      ) : null}

      {showDashboard ? (
        <>
          <ProjectionSummaryStrip
            projection={projection}
            currency={currency}
            formattingLocale={formattingLocale}
            t={t}
          />
          <div
            className="grid min-w-0 gap-3 lg:grid-cols-2"
            data-finance-projection-visuals
          >
            <FinanceProjectionOutlookChart
              title={t("chartOutlookTitle")}
              rows={projection.dashboard!.outlook}
              metricLabels={{
                INCOME: t("summaryIncome"),
                EXPENSE: t("summaryExpense"),
                RESULT: t("summaryResult"),
              }}
              seriesLabels={{
                actual: t("chartSeriesActual"),
                forecast: t("chartSeriesForecast"),
                projection: t("chartSeriesProjection"),
                budget: t("chartSeriesBudget"),
              }}
              currency={currency}
              formattingLocale={formattingLocale}
            />
            <div className="flex min-w-0 flex-col gap-3">
              <FinanceProjectionCompositionChart
                title={t("chartCompositionIncome")}
                segments={projection.dashboard!.incomeComposition}
                currency={currency}
                formattingLocale={formattingLocale}
              />
              <FinanceProjectionCompositionChart
                title={t("chartCompositionExpense")}
                segments={projection.dashboard!.expenseComposition}
                currency={currency}
                formattingLocale={formattingLocale}
              />
            </div>
          </div>
          {projection.dashboard!.divergence ? (
            <FinanceProjectionDivergenceChart
              title={t("chartDivergenceTitle")}
              description={t("chartDivergenceDescription")}
              rows={projection.dashboard!.divergence}
              currency={currency}
              formattingLocale={formattingLocale}
            />
          ) : null}
        </>
      ) : null}

      {adoption && showAdoptAction ? (
        <Dialog
          open={adoptDialogOpen}
          onClose={() => setAdoptDialogOpen(false)}
          title={t("adoptDialogTitle")}
          description={t("adoptDialogDescription")}
          footer={
            <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
              <Button variant="secondary" onClick={() => setAdoptDialogOpen(false)}>
                {t("adoptDialogCancel")}
              </Button>
              <Button disabled={adoptPending} onClick={runAdoption}>
                {t("adoptDialogConfirm")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <p>
              {t("adoptDialogImpactPositions", {
                updated: adoption.eligibleAccountCount,
                total: adoption.eligibleAccountCount + adoption.unchangedAccountCount,
              })}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdoptionImpactSummary
                title={t("adoptDialogCurrentForecast")}
                incomeLabel={t("summaryIncome")}
                expenseLabel={t("summaryExpense")}
                incomeMinor={adoption.currentTotals.incomeMinor}
                expenseMinor={adoption.currentTotals.expenseMinor}
                currency={currency}
                formattingLocale={formattingLocale}
              />
              <AdoptionImpactSummary
                title={t("adoptDialogAfterAdoption")}
                incomeLabel={t("summaryIncome")}
                expenseLabel={t("summaryExpense")}
                incomeMinor={adoption.proposedTotals.incomeMinor}
                expenseMinor={adoption.proposedTotals.expenseMinor}
                currency={currency}
                formattingLocale={formattingLocale}
              />
            </div>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}

function AdoptionImpactSummary(props: {
  title: string;
  incomeLabel: string;
  expenseLabel: string;
  incomeMinor: number;
  expenseMinor: number;
  currency: string | null;
  formattingLocale: string;
}) {
  return (
    <div className="rounded-md border border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)] p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">{props.incomeLabel}</dt>
          <dd className="tabular-nums text-[var(--foreground)]">
            {formatFinanceAutomaticForecastMoneyMinor(
              props.incomeMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">{props.expenseLabel}</dt>
          <dd className="tabular-nums text-[var(--foreground)]">
            {formatFinanceAutomaticForecastMoneyMinor(
              props.expenseMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function FinanceProjectionAccountDetailSection(props: {
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
}) {
  const t = useTranslations("Finance.forecast");
  const tProj = useTranslations("Finance.forecast.projection");

  if (props.projection.versionNumber === null) return null;

  const rows = props.projection.accounts.filter((a) => a.lifecycle === "ACTIVE");
  if (rows.length === 0) return null;

  return (
    <section
      className={FINANCE_SECTION_SURFACE_CLASS}
      data-finance-surface="projection-account-detail"
    >
      <h3 className="border-b border-[var(--sce-surface-border)] bg-[var(--sce-surface-dense)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {tProj("accountDetailSectionTitle")}
      </h3>
      <div className="min-w-0 overflow-x-auto">
        <table className={FINANCE_VARIANCE_COMPARISON_TABLE_CLASS}>
          <thead>
            <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS}>
                {t("accountColumn")}
              </th>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                {t("projectionColumn")}
              </th>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                {t("projectionDeltaColumn")}
              </th>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                {tProj("explainColumn")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => (
              <tr key={account.accountId} className={FINANCE_TABLE_ROW_CLASS}>
                <td className={FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS}>
                  <span className="font-medium">{account.accountName}</span>
                </td>
                <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                  {account.projectedAmountMinor !== null ? (
                    <span className="tabular-nums">
                      {formatFinanceAutomaticForecastMoneyMinor(
                        account.projectedAmountMinor,
                        props.currency,
                        props.formattingLocale,
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{account.noProjectionLabel}</span>
                  )}
                </td>
                <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                  <FinanceProjectionDeltaCell
                    accountId={account.accountId}
                    projection={props.projection}
                    currency={props.currency}
                    formattingLocale={props.formattingLocale}
                  />
                </td>
                <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                  <ProjectionExplainTrigger
                    accountId={account.accountId}
                    projection={props.projection}
                    currency={props.currency}
                    formattingLocale={props.formattingLocale}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectionSummaryStrip(props: {
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast.projection">>;
}) {
  const { coverage } = props.projection;
  const incomeLabel = coverage.income.complete
    ? props.t("summaryIncome")
    : props.t("summaryIncomePartial");
  const expenseLabel = coverage.expense.complete
    ? props.t("summaryExpense")
    : props.t("summaryExpensePartial");
  const resultClass =
    coverage.result.minor !== null
      ? financeResultSemanticTextClass(coverage.result.minor)
      : undefined;

  return (
    <div className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS} data-finance-surface="projection-summary">
      <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
        <div className="sm:px-4 sm:first:ps-0">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{incomeLabel}</dt>
          <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
            {formatFinanceAutomaticForecastMoneyMinor(
              coverage.income.projectedTotalMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="sm:px-4">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{expenseLabel}</dt>
          <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
            {formatFinanceAutomaticForecastMoneyMinor(
              coverage.expense.projectedTotalMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="sm:px-4 sm:last:pe-0">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>
            {coverage.result.complete ? props.t("summaryResult") : props.t("summaryResultPartial")}
          </dt>
          <dd
            className={cn(FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS, resultClass)}
            data-finance-projection-summary="result"
          >
            {coverage.result.minor !== null
              ? formatFinanceAutomaticForecastMoneyMinor(
                  coverage.result.minor,
                  props.currency,
                  props.formattingLocale,
                )
              : props.t("resultIncomplete")}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ProjectionExplainTrigger(props: {
  accountId: string;
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
}) {
  const t = useTranslations("Finance.forecast.projection");
  const account = props.projection.accounts.find((row) => row.accountId === props.accountId);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!account?.explainabilityDetail && !account?.explainability) {
    return <span className="text-[var(--muted)]">—</span>;
  }

  const detail = account.explainabilityDetail;

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        onClick={() => setDetailOpen(true)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {t("explainActionShort")}
      </button>
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("explainTitle")}
        description={detail?.headlineQuestion ?? t("explainDescription")}
        footer={
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>
            {t("explainClose")}
          </Button>
        }
      >
        {detail ? (
          <ProjectionExplainabilityBody
            explainability={detail}
            currency={props.currency}
            formattingLocale={props.formattingLocale}
            t={t}
          />
        ) : null}
      </Dialog>
    </>
  );
}

export function FinanceProjectionAccountCell(props: {
  accountId: string;
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
}) {
  return (
    <ProjectionExplainTrigger
      accountId={props.accountId}
      projection={props.projection}
      currency={props.currency}
      formattingLocale={props.formattingLocale}
    />
  );
}

function ProjectionExplainabilityBody(props: {
  explainability: ProjectionAccountExplainabilityDetailViewModel;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast.projection">>;
}) {
  const e = props.explainability;
  return (
    <div className="space-y-3 text-sm">
      {e.insufficientExplanation ? (
        <p className="text-[var(--foreground)]">{e.insufficientExplanation}</p>
      ) : null}
      {e.narrative ? <p className="text-[var(--muted)]">{e.narrative}</p> : null}
      <dl className="space-y-2">
        {e.methodologyLabel ? (
          <div>
            <dt className="text-[var(--muted)]">{props.t("explainMethod")}</dt>
            <dd>{e.methodologyLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainData")}</dt>
          <dd>{e.dataSufficiencyLabel}</dd>
        </div>
        {e.historicalFinanceYearCount > 0 ? (
          <div>
            <dt className="text-[var(--muted)]">{props.t("explainHistoricalYears")}</dt>
            <dd>
              {props.t("explainHistoricalYearsValue", {
                count: e.historicalFinanceYearCount,
                names: e.historicalFinanceYearNames.join(", "),
              })}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainCurrentActuals")}</dt>
          <dd>
            {props.t("explainThroughDate", {
              date: formatProjectionSourceCutoffDate(e.actualsThroughDate, props.formattingLocale),
            })}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainKnownActual")}</dt>
          <dd>
            {formatFinanceAutomaticForecastMoneyMinor(
              e.knownActualAmountMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        {e.estimatedRemainingAmountMinor !== null ? (
          <div>
            <dt className="text-[var(--muted)]">{props.t("explainEstimatedRemainder")}</dt>
            <dd>
              {formatFinanceAutomaticForecastMoneyMinor(
                e.estimatedRemainingAmountMinor,
                props.currency,
                props.formattingLocale,
              )}
            </dd>
          </div>
        ) : null}
        {e.projectedAmountMinor !== null ? (
          <div>
            <dt className="text-[var(--muted)]">{props.t("explainProjection")}</dt>
            <dd>
              {formatFinanceAutomaticForecastMoneyMinor(
                e.projectedAmountMinor,
                props.currency,
                props.formattingLocale,
              )}
            </dd>
          </div>
        ) : null}
        {e.lowerBoundMinor !== null && e.upperBoundMinor !== null ? (
          <div>
            <dt className="text-[var(--muted)]">{props.t("explainRange")}</dt>
            <dd>
              {props.t("explainRangeValue", {
                lower: formatFinanceAutomaticForecastMoneyMinor(
                  e.lowerBoundMinor,
                  props.currency,
                  props.formattingLocale,
                ),
                upper: formatFinanceAutomaticForecastMoneyMinor(
                  e.upperBoundMinor,
                  props.currency,
                  props.formattingLocale,
                ),
              })}
            </dd>
          </div>
        ) : null}
        {e.confidenceLabel ? (
          <div>
            <dt className="text-[var(--muted)]">{PROJECTION_CONFIDENCE_PRODUCT_TERM}</dt>
            <dd>{e.confidenceLabel}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function FinanceProjectionDeltaCell(props: {
  accountId: string;
  projection: ProjectionWorkspaceViewModel;
  currency: string | null;
  formattingLocale: string;
}) {
  const account = props.projection.accounts.find((row) => row.accountId === props.accountId);
  if (!account || account.deltaMinor === null) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return (
    <span className="tabular-nums text-[var(--foreground)]">
      {formatFinanceAutomaticForecastSignedMinor(
        account.deltaMinor,
        props.currency,
        props.formattingLocale,
      )}
    </span>
  );
}

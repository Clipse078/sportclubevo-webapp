"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import {
  formatBudgetPlanningMinor,
  formatBudgetPlanningSignedWholeMajorNumber,
} from "@/lib/finance/budget/budget-amount-presentation";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import type { ProjectionWorkspaceViewModel } from "@/lib/finance/projection/projection-workspace-presentation";
import {
  formatProjectionSourceCutoffDate,
  PROJECTION_CONFIDENCE_PRODUCT_TERM,
} from "@/lib/finance/projection/projection-workspace-presentation";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { generateProjectionAction } from "@/app/(admin)/dashboard/finance/forecast/actions";

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
  const [feedback, setFeedback] = useState<string | null>(null);

  const coverageLabel = useMemo(() => {
    const { projectedAccountCount, eligibleAccountCount } = projection.coverage;
    if (eligibleAccountCount === 0) return null;
    return t("coveragePositions", {
      projected: projectedAccountCount,
      total: eligibleAccountCount,
    });
  }, [projection.coverage, t]);

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

  return (
    <section
      className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "space-y-3")}
      data-finance-projection-state={projection.presentationState}
      aria-labelledby="finance-sce-projection-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="finance-sce-projection-heading" className={FINANCE_SECTION_HEADER_CLASS}>
            {t("sectionTitle")}
          </h2>
          <p className="max-w-2xl text-sm text-[var(--muted)]">{t("sectionDescription")}</p>
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
        </div>
        {canGenerate ? (
          <Button
            className="h-8 shrink-0 px-3 text-sm"
            disabled={pending}
            onClick={runGeneration}
            data-finance-projection-action={
              projection.presentationState === "NO_PROJECTION" ? "create" : "refresh"
            }
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {projection.presentationState === "NO_PROJECTION" ? (
        <p className="text-sm text-[var(--muted)]">{t("emptyBody")}</p>
      ) : null}

      {projection.presentationState === "INSUFFICIENT" ? (
        <p className="text-sm text-[var(--muted)]">{t("insufficientBody")}</p>
      ) : null}

      {projection.coverage.projectedAccountCount > 0 ? (
        <ProjectionSummaryStrip
          projection={projection}
          currency={currency}
          formattingLocale={formattingLocale}
          t={t}
        />
      ) : null}
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
            {formatBudgetPlanningMinor(
              coverage.income.projectedTotalMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="sm:px-4">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{expenseLabel}</dt>
          <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
            {formatBudgetPlanningMinor(
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
              ? formatBudgetPlanningMinor(
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

export function FinanceProjectionAccountCell(props: {
  accountId: string;
  projection: ProjectionWorkspaceViewModel;
  formattingLocale: string;
}) {
  const t = useTranslations("Finance.forecast.projection");
  const account = props.projection.accounts.find((row) => row.accountId === props.accountId);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!account) {
    return <span className="text-[var(--muted)]">—</span>;
  }

  if (account.projectedAmountMinor === null) {
    return (
      <span className="text-xs text-[var(--muted)]" data-finance-projection-account="none">
        {account.noProjectionLabel}
      </span>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <span className="tabular-nums">
          {formatBudgetPlanningMinor(
            account.projectedAmountMinor,
            null,
            props.formattingLocale,
          )}
        </span>
        {account.explainability ? (
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            aria-label={t("explainAction")}
            onClick={() => setDetailOpen(true)}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {account.explainability ? (
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={t("explainTitle")}
          description={t("explainDescription")}
          footer={
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              {t("explainClose")}
            </Button>
          }
        >
          <ProjectionExplainabilityBody
            explainability={account.explainability}
            formattingLocale={props.formattingLocale}
            t={t}
          />
        </Dialog>
      ) : null}
    </>
  );
}

function ProjectionExplainabilityBody(props: {
  explainability: NonNullable<
    ProjectionWorkspaceViewModel["accounts"][number]["explainability"]
  >;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast.projection">>;
}) {
  const e = props.explainability;
  return (
    <dl className="space-y-2 text-sm">
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
          {formatBudgetPlanningMinor(e.knownActualAmountMinor, null, props.formattingLocale)}
        </dd>
      </div>
      {e.estimatedRemainingAmountMinor !== null ? (
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainEstimatedRemainder")}</dt>
          <dd>
            {formatBudgetPlanningMinor(
              e.estimatedRemainingAmountMinor,
              null,
              props.formattingLocale,
            )}
          </dd>
        </div>
      ) : null}
      {e.projectedAmountMinor !== null ? (
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainProjection")}</dt>
          <dd>
            {formatBudgetPlanningMinor(e.projectedAmountMinor, null, props.formattingLocale)}
          </dd>
        </div>
      ) : null}
      {e.lowerBoundMinor !== null && e.upperBoundMinor !== null ? (
        <div>
          <dt className="text-[var(--muted)]">{props.t("explainRange")}</dt>
          <dd>
            {props.t("explainRangeValue", {
              lower: formatBudgetPlanningMinor(e.lowerBoundMinor, null, props.formattingLocale),
              upper: formatBudgetPlanningMinor(e.upperBoundMinor, null, props.formattingLocale),
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
  );
}

export function FinanceProjectionDeltaCell(props: {
  accountId: string;
  projection: ProjectionWorkspaceViewModel;
  formattingLocale: string;
}) {
  const account = props.projection.accounts.find((row) => row.accountId === props.accountId);
  if (!account || account.deltaMinor === null) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return (
    <span className="tabular-nums text-[var(--foreground)]">
      {formatBudgetPlanningSignedWholeMajorNumber(account.deltaMinor, props.formattingLocale)}
    </span>
  );
}

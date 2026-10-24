"use client";

import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import type { ForecastWorkspaceSnapshot } from "@/lib/finance/forecast/forecast-presentation";
import type {
  CurrentForecastVsApprovedBudgetResult,
  CurrentForecastVsPreviousResult,
  FinanceForecastHistoryReadModel,
} from "@/lib/finance/forecast/forecast-history-read-model";
import {
  buildForecastEvolutionChartPoints,
  selectMeaningfulForecastChangeDrivers,
} from "@/lib/finance/forecast/forecast-evolution-presentation";
import { buildForecastHistoryRowSecondaryLine } from "@/lib/finance/forecast/forecast-revision-presentation";
import { FINANCE_PROJECTION_CHART_SURFACE_CLASS } from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";
import type { FormalReforecastOutcome } from "@/lib/finance/forecast/formal-reforecast-contract";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import {
  formalizeCurrentForecastAction,
  previewFormalReforecastAction,
} from "@/app/(admin)/dashboard/finance/forecast/actions";
import type { FormalReforecastPreviewResult } from "@/lib/finance/forecast/formal-reforecast-contract";
import { FinanceForecastEvolutionChart } from "@/components/admin/finance/forecast/FinanceForecastEvolutionChart";
import { FinanceForecastChangeDriverBars } from "@/components/admin/finance/forecast/FinanceForecastChangeDriverBars";

function formatCalendarDateDisplay(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

type RollingUxSectionsProps = {
  snapshot: ForecastWorkspaceSnapshot;
  rollingUx: {
    history: FinanceForecastHistoryReadModel | null;
    vsPrevious: CurrentForecastVsPreviousResult;
    vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
  };
  currency: string | null;
  formattingLocale: string;
  canFormalize: boolean;
  currentTotals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
  onFormalizeSuccess: (message: string) => void;
  onFormalizeError: (message: string) => void;
};

export function FinanceForecastCurrentHeader(props: {
  snapshot: ForecastWorkspaceSnapshot;
  canFormalize: boolean;
  onOpenFormalize: () => void;
  formattingLocale: string;
  currency: string | null;
  totals: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    resultMinor: number;
  };
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const revision = props.snapshot.currentRevision;
  const title = revision?.presentation.displayTitle ?? props.t("currentForecastSectionTitle");
  const resultClass = financeResultSemanticTextClass(props.totals.resultMinor);

  return (
    <section
      className="space-y-3"
      data-finance-surface="current-forecast-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className={FINANCE_SECTION_HEADER_CLASS}>{props.t("currentForecastSectionTitle")}</h2>
          <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
            {revision?.asOfDate ? (
              <span>
                {props.t("currentAsOfLabel", {
                  date: formatCalendarDateDisplay(revision.asOfDate, props.formattingLocale),
                })}
              </span>
            ) : null}
            {revision?.revisionLabel ? (
              <span>{revision.revisionLabel}</span>
            ) : null}
            {props.snapshot.versionNumber ? (
              <span>{props.t("versionMeta", { version: props.snapshot.versionNumber })}</span>
            ) : null}
            {revision?.presentation.revisionSourceLabel &&
            !revision.revisionLabel &&
            revision.revisionSource ? (
              <span>{revision.presentation.revisionSourceLabel}</span>
            ) : null}
          </div>
        </div>
        {props.canFormalize ? (
          <Button
            className="h-8 shrink-0 px-3 text-sm"
            onClick={props.onOpenFormalize}
            data-finance-formal-reforecast-action="open"
          >
            {props.t("formalReforecast.action")}
          </Button>
        ) : null}
      </div>

      <div className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS} data-finance-surface="forecast-summary">
        <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
          <div className="sm:px-4 sm:first:ps-0">
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalIncome")}</dt>
            <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
              {formatFinanceManagementPlanningMinor(
                props.totals.totalIncomeMinor,
                props.currency,
                props.formattingLocale,
              )}
            </dd>
          </div>
          <div className="sm:px-4">
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalExpense")}</dt>
            <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
              {formatFinanceManagementPlanningMinor(
                props.totals.totalExpenseMinor,
                props.currency,
                props.formattingLocale,
              )}
            </dd>
          </div>
          <div className="sm:px-4 sm:last:pe-0">
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("plannedResult")}</dt>
            <dd
              className={cn(FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS, resultClass)}
              data-finance-forecast-summary="result"
            >
              {formatFinanceManagementPlanningMinor(
                props.totals.resultMinor,
                props.currency,
                props.formattingLocale,
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function FinanceForecastRollingUxSections({
  snapshot,
  rollingUx,
  currency,
  formattingLocale,
  canFormalize,
  currentTotals,
  onFormalizeSuccess,
  onFormalizeError,
}: RollingUxSectionsProps) {
  const t = useTranslations("Finance.forecast");
  const [formalizeOpen, setFormalizeOpen] = useState(false);

  const evolutionPoints = useMemo(
    () => buildForecastEvolutionChartPoints(rollingUx.history?.entriesChronological ?? []),
    [rollingUx.history?.entriesChronological],
  );

  return (
    <div className="space-y-4" data-finance-rolling-forecast-ux>
      <FinanceForecastCurrentHeader
        snapshot={snapshot}
        canFormalize={canFormalize}
        onOpenFormalize={() => setFormalizeOpen(true)}
        formattingLocale={formattingLocale}
        currency={currency}
        totals={currentTotals}
        t={t}
      />

      <FinanceForecastEvolutionSection
        history={rollingUx.history}
        evolutionPoints={evolutionPoints}
        currency={currency}
        formattingLocale={formattingLocale}
        t={t}
      />

      <FinanceForecastChangeSincePreviousSection
        vsPrevious={rollingUx.vsPrevious}
        currency={currency}
        formattingLocale={formattingLocale}
        t={t}
      />

      <FinanceForecastBudgetComparisonSection
        vsApprovedBudget={rollingUx.vsApprovedBudget}
        currency={currency}
        formattingLocale={formattingLocale}
        t={t}
      />

      {canFormalize ? (
        <FinanceFormalReforecastDialog
          key={formalizeOpen ? snapshot.versionId : "formal-reforecast-closed"}
          open={formalizeOpen}
          onClose={() => setFormalizeOpen(false)}
          financeYearId={snapshot.financeYearId}
          expectedVersionId={snapshot.versionId!}
          defaultAsOfDate={
            snapshot.recommendedFormalReforecastAsOfDate ??
            snapshot.currentRevision?.asOfDate ??
            ""
          }
          currency={currency}
          formattingLocale={formattingLocale}
          onSuccess={(msg) => {
            setFormalizeOpen(false);
            onFormalizeSuccess(msg);
          }}
          onError={onFormalizeError}
          t={t}
        />
      ) : null}
    </div>
  );
}

function CompactMovementSummary(props: {
  incomeDeltaMinor: number;
  expenseDeltaMinor: number;
  resultDeltaMinor: number;
  currency: string | null;
  formattingLocale: string;
  labels: { income: string; expense: string; result: string };
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-3 sm:gap-4">
      {(
        [
          ["income", props.incomeDeltaMinor, props.labels.income],
          ["expense", props.expenseDeltaMinor, props.labels.expense],
          ["result", props.resultDeltaMinor, props.labels.result],
        ] as const
      ).map(([key, delta, label]) => (
        <div key={key}>
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{label}</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums text-[var(--foreground)]">
            {formatFinanceManagementPlanningSignedMinor(delta, props.currency, props.formattingLocale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FinanceForecastChangeSincePreviousSection(props: {
  vsPrevious: CurrentForecastVsPreviousResult;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const { t } = props;
  if (props.vsPrevious.kind === "NO_PREVIOUS_FORECAST") {
    return (
      <p className="text-sm text-[var(--muted)]" data-finance-no-previous-forecast>
        {t("comparison.noPreviousForecast")}
      </p>
    );
  }

  const comparison = props.vsPrevious.comparison;
  const drivers = selectMeaningfulForecastChangeDrivers(comparison.largestChanges, 5);

  return (
    <section
      className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "space-y-3 py-3")}
      data-finance-surface="change-since-previous"
      aria-labelledby="finance-change-since-previous-heading"
    >
      <h3
        id="finance-change-since-previous-heading"
        className={FINANCE_SECTION_HEADER_CLASS}
      >
        {t("comparison.changeSincePreviousTitle")}
      </h3>
      <CompactMovementSummary
        incomeDeltaMinor={comparison.summary.incomeDeltaMinor}
        expenseDeltaMinor={comparison.summary.expenseDeltaMinor}
        resultDeltaMinor={comparison.summary.resultDeltaMinor}
        currency={props.currency}
        formattingLocale={props.formattingLocale}
        labels={{
          income: t("totalIncome"),
          expense: t("totalExpense"),
          result: t("plannedResult"),
        }}
      />
      {drivers.length > 0 ? (
        <FinanceForecastChangeDriverBars
          title={t("comparison.largestChangesTitle")}
          rows={drivers.map((row) => ({
            key: row.financialAccountId,
            accountName: row.accountName,
            deltaMinor: row.deltaMinor,
          }))}
          currency={props.currency}
          formattingLocale={props.formattingLocale}
          data-finance-surface="largest-changes"
        />
      ) : null}
    </section>
  );
}

function FinanceForecastBudgetComparisonSection(props: {
  vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const { t } = props;
  if (props.vsApprovedBudget.kind === "NO_APPROVED_BUDGET") {
    return (
      <p className="text-xs text-[var(--muted)]" data-finance-no-approved-budget>
        {t("comparison.noApprovedBudget")}
      </p>
    );
  }

  const comparison = props.vsApprovedBudget.comparison;
  const drivers = selectMeaningfulForecastChangeDrivers(comparison.largestChanges, 5);

  return (
    <section
      className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "space-y-3 border-s-2 border-[var(--sce-surface-border)] py-3 ps-4")}
      data-finance-surface="current-vs-budget"
      aria-labelledby="finance-budget-comparison-heading"
    >
      <h3 id="finance-budget-comparison-heading" className={FINANCE_SECTION_HEADER_CLASS}>
        {t("comparison.vsBudgetCompactTitle")}
      </h3>
      <p className="text-xs text-[var(--muted)]">{t("comparison.vsBudgetCompactHint")}</p>
      <CompactMovementSummary
        incomeDeltaMinor={comparison.summary.incomeDeltaMinor}
        expenseDeltaMinor={comparison.summary.expenseDeltaMinor}
        resultDeltaMinor={comparison.summary.resultDeltaMinor}
        currency={props.currency}
        formattingLocale={props.formattingLocale}
        labels={{
          income: t("totalIncome"),
          expense: t("totalExpense"),
          result: t("plannedResult"),
        }}
      />
      {drivers.length > 0 ? (
        <FinanceForecastChangeDriverBars
          title={t("comparison.budgetDriversTitle")}
          rows={drivers.map((row) => ({
            key: row.financialAccountId,
            accountName: row.accountName,
            deltaMinor: row.deltaMinor,
          }))}
          currency={props.currency}
          formattingLocale={props.formattingLocale}
          barClassName="bg-[var(--muted)]/55"
          data-finance-surface="budget-change-drivers"
        />
      ) : null}
    </section>
  );
}

function FinanceForecastEvolutionSection(props: {
  history: FinanceForecastHistoryReadModel | null;
  evolutionPoints: ReturnType<typeof buildForecastEvolutionChartPoints>;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const entries = props.history?.entries ?? [];
  if (entries.length === 0 && props.evolutionPoints.length === 0) {
    return null;
  }

  const showEvolution = props.evolutionPoints.length > 0;
  const showGovernance = entries.length > 0;
  if (!showEvolution && !showGovernance) {
    return null;
  }

  return (
    <section
      className={cn(FINANCE_PROJECTION_CHART_SURFACE_CLASS, "space-y-0 py-3")}
      data-finance-forecast-evolution
    >
      {showEvolution ? (
        <FinanceForecastEvolutionChart
          embedded
          title={props.t("history.evolutionTitle")}
          seriesLabel={props.t("history.evolutionSeriesResult")}
          points={props.evolutionPoints}
          currency={props.currency}
          formattingLocale={props.formattingLocale}
          currentBadgeLabel={props.t("history.currentBadge")}
          tooltipLabels={{
            income: props.t("totalIncome"),
            expense: props.t("totalExpense"),
            result: props.t("plannedResult"),
          }}
          formatPointAsOf={(point) =>
            point.asOfDate
              ? props.t("history.asOfLine", {
                  date: formatCalendarDateDisplay(point.asOfDate, props.formattingLocale),
                })
              : null
          }
          formatVersionMeta={(version) => props.t("versionMeta", { version })}
        />
      ) : null}

      {showEvolution && showGovernance ? (
        <hr className="my-3 border-[var(--sce-surface-border-subtle)]" />
      ) : null}

      {showGovernance ? (
        <div
          data-finance-surface="prognoseverlauf-compact"
          aria-labelledby="finance-prognoseverlauf-compact-heading"
        >
          <h4
            id="finance-prognoseverlauf-compact-heading"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            {props.t("history.governanceTitle")}
          </h4>
          <ul className="mt-2 space-y-0 text-xs" role="list">
            {entries.map((entry) => {
              const secondaryLine = buildForecastHistoryRowSecondaryLine({
                displayTitle: entry.presentation.displayTitle,
                displaySubtitle: entry.presentation.displaySubtitle,
                revisionSourceLabel: entry.presentation.revisionSourceLabel,
                revisionLabel: entry.revisionLabel,
                revisionSource: entry.revisionSource,
              });
              return (
                <li
                  key={entry.forecastVersionId}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--sce-surface-border-subtle)] py-1.5 last:border-0"
                  data-finance-history-entry={entry.isCurrent ? "current" : "historical"}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)]">
                      {entry.isCurrent
                        ? props.t("history.currentBadge")
                        : entry.presentation.displayTitle}
                      {entry.isCurrent && entry.presentation.displayTitle.trim().toLowerCase() !==
                        props.t("history.currentBadge").trim().toLowerCase() ? (
                        <span className="ms-2 font-normal text-[var(--muted)]">
                          {entry.presentation.displayTitle}
                        </span>
                      ) : null}
                    </p>
                    {secondaryLine ? (
                      <p className="text-[var(--muted)]">{secondaryLine}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function mapFormalOutcomeMessage(
  outcome: FormalReforecastOutcome,
  t: ReturnType<typeof useTranslations<"Finance.forecast">>,
  serverMessage: string,
): string {
  const key = `formalReforecast.errors.${outcome}` as const;
  if (outcome === "UNEXPECTED_ERROR") {
    return serverMessage || t("formalReforecast.errors.UNEXPECTED_ERROR");
  }
  try {
    return t(key);
  } catch {
    return serverMessage;
  }
}

function FinanceFormalReforecastDialog(props: {
  open: boolean;
  onClose: () => void;
  financeYearId: string;
  expectedVersionId: string;
  defaultAsOfDate: string;
  currency: string | null;
  formattingLocale: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const router = useRouter();
  const asOfId = useId();
  const labelId = useId();
  const [asOfDate, setAsOfDate] = useState(props.defaultAsOfDate);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [preview, setPreview] = useState<FormalReforecastPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const [submitPending, startSubmitTransition] = useTransition();

  const loadPreview = useCallback(() => {
    if (!props.open) return;
    startPreviewTransition(async () => {
      const result = await previewFormalReforecastAction({
        financeYearId: props.financeYearId,
        asOfDate: asOfDate || undefined,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
      });
      if (!result.ok) {
        setPreview(null);
        setPreviewError(mapFormalOutcomeMessage(result.outcome, props.t, result.error));
        return;
      }
      setPreviewError(null);
      setPreview(result.preview);
      if (!asOfDate && result.preview.asOfDate) {
        setAsOfDate(result.preview.asOfDate);
      }
    });
  }, [asOfDate, props.financeYearId, props.open, props.t, revisionLabel]);

  useEffect(() => {
    if (props.open) {
      loadPreview();
    }
  }, [loadPreview, props.open]);

  function submit() {
    if (!preview) return;
    startSubmitTransition(async () => {
      const result = await formalizeCurrentForecastAction({
        financeYearId: props.financeYearId,
        expectedCurrentForecastVersionId: preview.currentForecastVersionId,
        asOfDate: preview.asOfDate,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
      });
      if (!result.ok) {
        const message = mapFormalOutcomeMessage(result.outcome, props.t, result.error);
        setSubmitError(message);
        props.onError(message);
        if (result.outcome === "STALE_CURRENT") {
          router.refresh();
        }
        return;
      }
      setSubmitError(null);
      props.onSuccess(props.t("formalReforecast.success"));
      router.refresh();
    });
  }

  const resultClass = preview
    ? financeResultSemanticTextClass(preview.resultMinor)
    : undefined;

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.t("formalReforecast.dialogTitle")}
      description={props.t("formalReforecast.dialogDescription")}
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button variant="secondary" onClick={props.onClose} disabled={submitPending}>
            {props.t("cancel")}
          </Button>
          <Button
            disabled={submitPending || previewPending || !preview || Boolean(previewError)}
            onClick={submit}
            data-finance-formal-reforecast-action="confirm"
          >
            {props.t("formalReforecast.confirm")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SceFormField label={props.t("formalReforecast.asOfLabel")} htmlFor={asOfId} required>
          <input
            id={asOfId}
            type="date"
            className="fca-input w-full max-w-xs"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            onBlur={loadPreview}
            disabled={submitPending}
          />
        </SceFormField>

        <SceFormField
          label={props.t("formalReforecast.labelField")}
          htmlFor={labelId}
          optional
          description={props.t("formalReforecast.labelHint")}
        >
          <input
            id={labelId}
            type="text"
            className="fca-input w-full"
            value={revisionLabel}
            placeholder={props.t("formalReforecast.labelPlaceholder")}
            maxLength={120}
            onChange={(e) => setRevisionLabel(e.target.value)}
            onBlur={loadPreview}
            disabled={submitPending}
          />
        </SceFormField>

        {previewPending ? (
          <p className="text-sm text-[var(--muted)]" role="status">
            {props.t("formalReforecast.previewLoading")}
          </p>
        ) : null}

        {previewError ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {previewError}
          </p>
        ) : null}

        {submitError ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {submitError}
          </p>
        ) : null}

        {preview ? (
          <div
            className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "mt-2")}
            data-finance-formal-reforecast-preview
          >
            <p className="mb-2 text-xs text-[var(--muted)]">
              {props.t("formalReforecast.amountsUnchangedHint")}
            </p>
            <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
              <div className="sm:px-4 sm:first:ps-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalIncome")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatFinanceManagementPlanningMinor(
                    preview.incomeMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="sm:px-4">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalExpense")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatFinanceManagementPlanningMinor(
                    preview.expenseMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="sm:px-4 sm:last:pe-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("plannedResult")}</dt>
                <dd className={cn(FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS, resultClass)}>
                  {formatFinanceManagementPlanningMinor(
                    preview.resultMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {props.t("formalReforecast.nextVersionMeta", {
                version: preview.nextVersionNumber,
                count: preview.lineCount,
              })}
            </p>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

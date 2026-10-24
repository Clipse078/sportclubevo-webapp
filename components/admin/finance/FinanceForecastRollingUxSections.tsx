"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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
  isForecastComparisonMovementNeutral,
  selectMeaningfulForecastChangeDrivers,
} from "@/lib/finance/forecast/forecast-evolution-presentation";
import { buildForecastHistoryRowSecondaryLine } from "@/lib/finance/forecast/forecast-revision-presentation";
import type { FormalReforecastOutcome } from "@/lib/finance/forecast/formal-reforecast-contract";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  FINANCE_FORECAST_ANALYSIS_HEADING_CLASS,
  FINANCE_FORECAST_WORKSPACE_SECTION_CLASS,
  FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS,
  FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS,
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
import {
  INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
  buildFormalReforecastPreviewInputKey,
  isFormalReforecastPreviewLoading,
  isFormalReforecastSubmitEnabled,
  reduceFormalReforecastPreviewDialog,
} from "@/lib/finance/forecast/formal-reforecast-preview-lifecycle";
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
    <div className="space-y-2" data-finance-surface="current-forecast-header">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {props.t("currentForecastSectionTitle")}
          </h2>
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
    </div>
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
    <>
      <section
        className={FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS}
        data-finance-rolling-forecast-workspace
      >
        <div className={FINANCE_FORECAST_WORKSPACE_SECTION_CLASS}>
          <FinanceForecastCurrentHeader
            snapshot={snapshot}
            canFormalize={canFormalize}
            onOpenFormalize={() => setFormalizeOpen(true)}
            formattingLocale={formattingLocale}
            currency={currency}
            totals={currentTotals}
            t={t}
          />
        </div>

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
      </section>

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
    </>
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
      <div
        className={FINANCE_FORECAST_WORKSPACE_SECTION_CLASS}
        data-finance-no-previous-forecast
      >
        <p className="text-sm text-[var(--muted)]">{t("comparison.noPreviousForecast")}</p>
      </div>
    );
  }

  const comparison = props.vsPrevious.comparison;
  const drivers = selectMeaningfulForecastChangeDrivers(comparison.largestChanges, 5);
  const movementNeutral = isForecastComparisonMovementNeutral(comparison.summary);

  return (
    <div
      className={cn(FINANCE_FORECAST_WORKSPACE_SECTION_CLASS, "space-y-2")}
      data-finance-surface="change-since-previous"
      aria-labelledby="finance-change-since-previous-heading"
    >
      <h3 id="finance-change-since-previous-heading" className={FINANCE_FORECAST_ANALYSIS_HEADING_CLASS}>
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
      {movementNeutral && drivers.length === 0 ? (
        <p className="text-xs text-[var(--muted)]" data-finance-zero-change-quiet>
          {t("comparison.noChangeSincePrevious")}
        </p>
      ) : null}
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
    </div>
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
      <div
        className={FINANCE_FORECAST_WORKSPACE_SECTION_CLASS}
        data-finance-no-approved-budget
      >
        <p className="text-xs text-[var(--muted)]">{t("comparison.noApprovedBudget")}</p>
      </div>
    );
  }

  const comparison = props.vsApprovedBudget.comparison;
  const drivers = selectMeaningfulForecastChangeDrivers(comparison.largestChanges, 5);

  return (
    <div
      className={cn(FINANCE_FORECAST_WORKSPACE_SECTION_CLASS, "space-y-2")}
      data-finance-surface="current-vs-budget"
      aria-labelledby="finance-budget-comparison-heading"
    >
      <h3 id="finance-budget-comparison-heading" className={FINANCE_FORECAST_ANALYSIS_HEADING_CLASS}>
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
    </div>
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
    <div
      className={cn(FINANCE_FORECAST_WORKSPACE_SECTION_CLASS, "space-y-2")}
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
        <hr className="border-[var(--sce-surface-border-subtle)]" />
      ) : null}

      {showGovernance ? (
        <div
          data-finance-surface="prognoseverlauf-compact"
          aria-labelledby="finance-prognoseverlauf-compact-heading"
        >
          <h4 id="finance-prognoseverlauf-compact-heading" className={FINANCE_FORECAST_ANALYSIS_HEADING_CLASS}>
            {props.t("history.governanceTitle")}
          </h4>
          <ul className="mt-1.5 space-y-0 text-xs" role="list">
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
    </div>
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

export function FinanceFormalReforecastDialog(props: {
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewState, dispatchPreview] = useReducer(
    reduceFormalReforecastPreviewDialog,
    INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
  );
  const previewRequestSeqRef = useRef(0);
  const translateRef = useRef(props.t);
  useEffect(() => {
    translateRef.current = props.t;
  });

  const currentInputKey = buildFormalReforecastPreviewInputKey(asOfDate, revisionLabel);
  const preview = previewState.preview;
  const previewError = previewState.previewError;
  const previewLoading = isFormalReforecastPreviewLoading(previewState.phase);
  const submitPending = previewState.phase === "submitting";
  const submitEnabled = isFormalReforecastSubmitEnabled({
    phase: previewState.phase,
    preview,
    previewError,
    loadedInputKey: previewState.loadedInputKey,
    currentInputKey,
  });

  const requestPreview = useCallback(
    async (inputKey: string, nextAsOfDate: string, nextRevisionLabel: string) => {
      if (!props.open) return;
      const seq = ++previewRequestSeqRef.current;
      dispatchPreview({ type: "preview_requested", inputKey });

      const result = await previewFormalReforecastAction({
        financeYearId: props.financeYearId,
        asOfDate: nextAsOfDate || undefined,
        revisionLabel: nextRevisionLabel.trim() ? nextRevisionLabel : null,
      });

      if (seq !== previewRequestSeqRef.current) {
        return;
      }

      if (!result.ok) {
        const errorMessage =
          result.outcome === "UNEXPECTED_ERROR"
            ? translateRef.current("formalReforecast.previewLoadFailed")
            : mapFormalOutcomeMessage(
                result.outcome,
                translateRef.current,
                result.error,
              );
        dispatchPreview({
          type: "preview_failed",
          inputKey,
          error: errorMessage,
        });
        return;
      }

      dispatchPreview({
        type: "preview_succeeded",
        inputKey,
        preview: result.preview,
      });

      if (!nextAsOfDate && result.preview.asOfDate) {
        setAsOfDate(result.preview.asOfDate);
      }
    },
    [props.financeYearId, props.open],
  );

  useEffect(() => {
    if (!props.open) {
      previewRequestSeqRef.current += 1;
      dispatchPreview({ type: "dialog_close_reset" });
      return;
    }
    dispatchPreview({ type: "dialog_open_reset" });
    const key = buildFormalReforecastPreviewInputKey(props.defaultAsOfDate, "");
    queueMicrotask(() => {
      void requestPreview(key, props.defaultAsOfDate, "");
    });
  }, [props.open, props.financeYearId, props.defaultAsOfDate, requestPreview]);

  function refreshPreviewFromFields() {
    if (!props.open || !asOfDate) return;
    const key = buildFormalReforecastPreviewInputKey(asOfDate, revisionLabel);
    void requestPreview(key, asOfDate, revisionLabel);
  }

  function handleAsOfDateChange(nextAsOfDate: string) {
    setAsOfDate(nextAsOfDate);
    if (!props.open || !nextAsOfDate) return;
    const key = buildFormalReforecastPreviewInputKey(nextAsOfDate, revisionLabel);
    void requestPreview(key, nextAsOfDate, revisionLabel);
  }

  function submit() {
    if (!submitEnabled || !preview) return;
    dispatchPreview({ type: "submit_started" });
    void (async () => {
      const result = await formalizeCurrentForecastAction({
        financeYearId: props.financeYearId,
        expectedCurrentForecastVersionId: preview.currentForecastVersionId,
        asOfDate: preview.asOfDate,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
      });
      dispatchPreview({ type: "submit_finished" });
      if (!result.ok) {
        const message = mapFormalOutcomeMessage(
          result.outcome,
          translateRef.current,
          result.error,
        );
        setSubmitError(message);
        props.onError(message);
        if (result.outcome === "STALE_CURRENT") {
          router.refresh();
        }
        return;
      }
      setSubmitError(null);
      props.onSuccess(translateRef.current("formalReforecast.success"));
      router.refresh();
    })();
  }

  const resultClass = preview
    ? financeResultSemanticTextClass(preview.resultMinor)
    : undefined;

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      size="md"
      bodyClassName={FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS}
      title={props.t("formalReforecast.dialogTitle")}
      description={props.t("formalReforecast.dialogDescription")}
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button variant="secondary" onClick={props.onClose} disabled={submitPending}>
            {props.t("cancel")}
          </Button>
          <Button
            disabled={!submitEnabled || submitPending}
            onClick={submit}
            aria-busy={submitPending}
            data-finance-formal-reforecast-action="confirm"
          >
            {props.t("formalReforecast.confirm")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3" data-finance-formal-reforecast-dialog>
        <SceFormField label={props.t("formalReforecast.asOfLabel")} htmlFor={asOfId} required>
          <input
            id={asOfId}
            type="date"
            className="fca-input w-full max-w-xs"
            value={asOfDate}
            onChange={(e) => handleAsOfDateChange(e.target.value)}
            onBlur={refreshPreviewFromFields}
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
            onBlur={refreshPreviewFromFields}
            disabled={submitPending}
          />
        </SceFormField>

        {previewLoading ? (
          <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
            {props.t("formalReforecast.previewLoading")}
          </p>
        ) : null}

        {previewError ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-[var(--destructive)]">{previewError}</p>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-sm"
              disabled={previewLoading || submitPending}
              onClick={refreshPreviewFromFields}
            >
              {props.t("formalReforecast.previewRetry")}
            </Button>
          </div>
        ) : null}

        {submitError ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {submitError}
          </p>
        ) : null}

        {preview ? (
          <div
            className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "py-2")}
            data-finance-formal-reforecast-preview
          >
            <p className="mb-1.5 text-xs text-[var(--muted)]">
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
            <p className="mt-2 text-xs text-[var(--muted)]">
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

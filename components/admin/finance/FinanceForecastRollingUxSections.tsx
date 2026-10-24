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
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  enrichForecastBudgetComparisonDrivers,
  forecastBudgetDriverFavorabilityLabelKey,
  isForecastComparisonMovementNeutral,
} from "@/lib/finance/forecast/forecast-clarity-presentation";
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
import {
  buildForecastHistoryExpandedEntryLine,
} from "@/lib/finance/forecast/forecast-revision-presentation";
import {
  FORECAST_REVISION_REASONS,
  FORECAST_REVISION_REASON_PRESENTATION,
} from "@/lib/finance/forecast/forecast-revision-reason";
import type { FormalReforecastOutcome } from "@/lib/finance/forecast/formal-reforecast-contract";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import { financeVarianceComparisonSemanticTextClass } from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import {
  FINANCE_FORECAST_ANALYSIS_HEADING_CLASS,
  FINANCE_FORECAST_WORKSPACE_SECTION_CLASS,
  FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS,
  FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS,
  FINANCE_FORMAL_REFORECAST_DIALOG_FOOTER_CLASS,
  FINANCE_FORMAL_REFORECAST_DIALOG_HEADER_CLASS,
  FINANCE_FORMAL_REFORECAST_DIALOG_SHELL_CLASS,
  FINANCE_FORMAL_REFORECAST_MORE_DETAILS_TRIGGER_CLASS,
  FINANCE_FORMAL_REFORECAST_PREVIEW_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
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
import { FinanceWorkspaceDisclosure } from "@/components/admin/finance/FinanceWorkspaceDisclosure";

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
  vsPrevious: CurrentForecastVsPreviousResult;
  vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const revision = props.snapshot.currentRevision;
  const title = revision?.presentation.displayTitle ?? props.t("currentForecastSectionTitle");
  const resultClass = financeResultSemanticTextClass(props.totals.resultMinor);

  const budgetContextLine =
    props.vsApprovedBudget.kind === "COMPARISON"
      ? props.t("clarity.versusBudgetResult", {
          amount: formatFinanceManagementPlanningSignedMinor(
            props.vsApprovedBudget.comparison.summary.resultDeltaMinor,
            props.currency,
            props.formattingLocale,
          ),
        })
      : null;

  let previousContextLine: string | null = null;
  if (props.vsPrevious.kind === "COMPARISON") {
    const neutral = isForecastComparisonMovementNeutral(props.vsPrevious.comparison.summary);
    if (neutral) {
      previousContextLine = props.t("clarity.noChangeSincePreviousShort");
    } else {
      previousContextLine = props.t("clarity.changeResultSincePrevious", {
        amount: formatFinanceManagementPlanningSignedMinor(
          props.vsPrevious.comparison.summary.resultDeltaMinor,
          props.currency,
          props.formattingLocale,
        ),
      });
    }
  }

  const incomeFormatted = formatFinanceManagementPlanningMinor(
    props.totals.totalIncomeMinor,
    props.currency,
    props.formattingLocale,
  );
  const expenseFormatted = formatFinanceManagementPlanningMinor(
    props.totals.totalExpenseMinor,
    props.currency,
    props.formattingLocale,
  );

  return (
    <div className="space-y-3" data-finance-surface="current-forecast-header">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {props.t("currentForecastSectionTitle")}
          </h2>
          {title !== props.t("currentForecastSectionTitle") ? (
            <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
            {revision?.asOfDate ? (
              <span>
                {props.t("currentAsOfLabel", {
                  date: formatCalendarDateDisplay(revision.asOfDate, props.formattingLocale),
                })}
              </span>
            ) : null}
            {props.snapshot.versionNumber ? (
              <span>{props.t("versionMeta", { version: props.snapshot.versionNumber })}</span>
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

      <div className="space-y-1.5" data-finance-surface="forecast-summary">
        <p className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("clarity.expectedResultLabel")}</p>
        <p
          className={cn("text-2xl font-semibold tabular-nums tracking-tight", resultClass)}
          data-finance-forecast-summary="result"
        >
          {formatFinanceManagementPlanningMinor(
            props.totals.resultMinor,
            props.currency,
            props.formattingLocale,
          )}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {props.t("clarity.incomeExpenseComposition", {
            income: incomeFormatted,
            expense: expenseFormatted,
          })}
        </p>
        <div className="space-y-0.5 text-sm text-[var(--foreground)]">
          {budgetContextLine ? <p data-finance-budget-context-line>{budgetContextLine}</p> : null}
          {previousContextLine ? (
            <p className="text-[var(--muted)]" data-finance-previous-context-line>
              {previousContextLine}
            </p>
          ) : null}
        </div>
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
            vsPrevious={rollingUx.vsPrevious}
            vsApprovedBudget={rollingUx.vsApprovedBudget}
            t={t}
          />
        </div>

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

        <FinanceForecastEvolutionSection
          history={rollingUx.history}
          evolutionPoints={evolutionPoints}
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

  if (movementNeutral && drivers.length === 0) {
    return (
      <div
        className={FINANCE_FORECAST_WORKSPACE_SECTION_CLASS}
        data-finance-surface="change-since-previous"
        data-finance-zero-change-quiet
      >
        <p className="text-sm text-[var(--muted)]">{t("clarity.noChangeSincePrevious")}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(FINANCE_FORECAST_WORKSPACE_SECTION_CLASS, "space-y-2")}
      data-finance-surface="change-since-previous"
      aria-labelledby="finance-change-since-previous-heading"
    >
      <h3 id="finance-change-since-previous-heading" className={FINANCE_FORECAST_ANALYSIS_HEADING_CLASS}>
        {t("clarity.whatChangedTitle")}
      </h3>
      <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
        {t("clarity.changeResultSincePrevious", {
          amount: formatFinanceManagementPlanningSignedMinor(
            comparison.summary.resultDeltaMinor,
            props.currency,
            props.formattingLocale,
          ),
        })}
      </p>
      {drivers.length > 0 ? (
        <FinanceForecastChangeDriverBars
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
  const tVariance = useTranslations("Finance.actuals");
  const { t } = props;
  const [showAll, setShowAll] = useState(false);

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
  const topDrivers = enrichForecastBudgetComparisonDrivers(comparison.largestChanges).slice(0, 5);
  const allDrivers = enrichForecastBudgetComparisonDrivers(comparison.accountChanges);

  return (
    <div
      className={cn(FINANCE_FORECAST_WORKSPACE_SECTION_CLASS, "space-y-2")}
      data-finance-surface="current-vs-budget"
      aria-labelledby="finance-budget-comparison-heading"
    >
      <h3 id="finance-budget-comparison-heading" className={FINANCE_FORECAST_ANALYSIS_HEADING_CLASS}>
        {t("comparison.vsBudgetCompactTitle")}
      </h3>
      <div className="space-y-1">
        <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("clarity.budgetResultHeadline")}</p>
        <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
          {t("clarity.versusBudgetResult", {
            amount: formatFinanceManagementPlanningSignedMinor(
              comparison.summary.resultDeltaMinor,
              props.currency,
              props.formattingLocale,
            ),
          })}
        </p>
      </div>
      {topDrivers.length > 0 ? (
        <div className="space-y-1.5" data-finance-surface="budget-change-drivers">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("clarity.budgetTopDriversTitle")}
          </p>
          <ul className="space-y-1 text-sm" role="list">
            {topDrivers.map((row) => {
              const favorabilityKey = forecastBudgetDriverFavorabilityLabelKey(row.favorability);
              return (
                <li
                  key={row.financialAccountId}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="text-[var(--foreground)]">{row.accountName}</span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span
                      className={financeVarianceComparisonSemanticTextClass({
                        favorability: row.favorability,
                        hasComparison: row.favorability !== null,
                      })}
                    >
                      {formatFinanceManagementPlanningSignedMinor(
                        row.deltaMinor,
                        props.currency,
                        props.formattingLocale,
                      )}
                    </span>
                    {favorabilityKey ? (
                      <span
                        className={cn(
                          "text-xs",
                          financeVarianceComparisonSemanticTextClass({
                            favorability: row.favorability,
                            hasComparison: true,
                          }),
                        )}
                      >
                        {tVariance(favorabilityKey)}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {allDrivers.length > topDrivers.length ? (
        <>
          <button
            type="button"
            className="text-sm font-medium text-[var(--foreground)] hover:underline"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
            data-finance-budget-all-positions-trigger
          >
            {showAll ? t("clarity.hideBudgetPositions") : t("clarity.showAllBudgetPositions")}
          </button>
          {showAll ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm" role="list">
              {allDrivers.map((row) => (
                <li
                  key={row.financialAccountId}
                  className="flex justify-between gap-2 border-b border-[var(--sce-surface-border-subtle)] py-1 last:border-0"
                >
                  <span>{row.accountName}</span>
                  <span className="tabular-nums">
                    {formatFinanceManagementPlanningSignedMinor(
                      row.deltaMinor,
                      props.currency,
                      props.formattingLocale,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
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

  const lastFormalizedDate =
    entries.find((entry) => entry.isCurrent)?.asOfDate ??
    entries.find((entry) => entry.asOfDate)?.asOfDate ??
    null;

  const collapsedSummary = lastFormalizedDate
    ? props.t("clarity.historyCollapsedSummary", {
        count: entries.length,
        date: formatCalendarDateDisplay(lastFormalizedDate, props.formattingLocale),
      })
    : props.t("clarity.historyCollapsedSummaryNoDate", { count: entries.length });

  return (
    <div
      className={FINANCE_FORECAST_WORKSPACE_SECTION_CLASS}
      data-finance-forecast-evolution
      data-finance-surface="prognoseverlauf-compact"
    >
      <FinanceWorkspaceDisclosure
        title={props.t("history.sectionTitle")}
        summary={collapsedSummary}
        expandLabel={props.t("clarity.historyShow")}
        collapseLabel={props.t("clarity.historyHide")}
        data-finance-disclosure="prognoseverlauf"
      >
        {props.evolutionPoints.length > 0 ? (
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
        ) : (
          <ul className="space-y-0 text-xs" role="list">
            {entries.map((entry) => {
              const asOfDisplay = entry.asOfDate
                ? formatCalendarDateDisplay(entry.asOfDate, props.formattingLocale)
                : null;
              const expandedLine = buildForecastHistoryExpandedEntryLine({
                asOfDateDisplay: asOfDisplay,
                revisionReason: entry.revisionReason,
                revisionContext: entry.revisionContext,
                versionNumber: entry.versionNumber,
              });
              return (
                <li
                  key={entry.forecastVersionId}
                  className="border-b border-[var(--sce-surface-border-subtle)] py-2 last:border-0"
                  data-finance-history-entry={entry.isCurrent ? "current" : "historical"}
                >
                  <p className="font-medium text-[var(--foreground)]">
                    {entry.isCurrent
                      ? `${props.t("history.currentBadge")} · ${entry.presentation.displayTitle}`
                      : entry.presentation.displayTitle}
                  </p>
                  {expandedLine ? (
                    <p className="text-[var(--muted)]">{expandedLine}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </FinanceWorkspaceDisclosure>
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
  const actualsThroughId = useId();
  const reasonId = useId();
  const reasonContextId = useId();
  const [asOfDate, setAsOfDate] = useState(props.defaultAsOfDate);
  const [actualsThroughDate, setActualsThroughDate] = useState(props.defaultAsOfDate);
  const [customActualsCutoff, setCustomActualsCutoff] = useState(false);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionContext, setRevisionContext] = useState("");
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
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

  const effectiveActualsThrough = customActualsCutoff ? actualsThroughDate : asOfDate;
  const currentInputKey = buildFormalReforecastPreviewInputKey(
    asOfDate,
    revisionLabel,
    effectiveActualsThrough,
  );
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
    async (
      inputKey: string,
      nextAsOfDate: string,
      nextActualsThrough: string,
      nextRevisionLabel: string,
    ) => {
      if (!props.open) return;
      const seq = ++previewRequestSeqRef.current;
      dispatchPreview({ type: "preview_requested", inputKey });

      const result = await previewFormalReforecastAction({
        financeYearId: props.financeYearId,
        asOfDate: nextAsOfDate || undefined,
        actualsThroughDate: nextActualsThrough || undefined,
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
        if (!customActualsCutoff) {
          setActualsThroughDate(result.preview.asOfDate);
        }
      }
    },
    [customActualsCutoff, props.financeYearId, props.open],
  );

  useEffect(() => {
    if (!props.open) {
      previewRequestSeqRef.current += 1;
      dispatchPreview({ type: "dialog_close_reset" });
      return;
    }
    dispatchPreview({ type: "dialog_open_reset" });
    const defaultAsOfDate = props.defaultAsOfDate;
    queueMicrotask(() => {
      setMoreDetailsOpen(false);
      setCustomActualsCutoff(false);
      setAsOfDate(defaultAsOfDate);
      setActualsThroughDate(defaultAsOfDate);
      const key = buildFormalReforecastPreviewInputKey(defaultAsOfDate, "", defaultAsOfDate);
      void requestPreview(key, defaultAsOfDate, defaultAsOfDate, "");
    });
  }, [props.open, props.financeYearId, props.defaultAsOfDate, requestPreview]);

  function refreshPreviewFromFields() {
    if (!props.open || !asOfDate) return;
    const cutoff = customActualsCutoff ? actualsThroughDate : asOfDate;
    const key = buildFormalReforecastPreviewInputKey(asOfDate, revisionLabel, cutoff);
    void requestPreview(key, asOfDate, cutoff, revisionLabel);
  }

  function handleAsOfDateChange(nextAsOfDate: string) {
    setAsOfDate(nextAsOfDate);
    if (!customActualsCutoff) {
      setActualsThroughDate(nextAsOfDate);
    }
    if (!props.open || !nextAsOfDate) return;
    const cutoff = customActualsCutoff ? actualsThroughDate : nextAsOfDate;
    const key = buildFormalReforecastPreviewInputKey(nextAsOfDate, revisionLabel, cutoff);
    void requestPreview(key, nextAsOfDate, cutoff, revisionLabel);
  }

  function submit() {
    if (!submitEnabled || !preview) return;
    dispatchPreview({ type: "submit_started" });
    const cutoff = customActualsCutoff ? actualsThroughDate : preview.asOfDate;
    void (async () => {
      const result = await formalizeCurrentForecastAction({
        financeYearId: props.financeYearId,
        expectedCurrentForecastVersionId: preview.currentForecastVersionId,
        asOfDate: preview.asOfDate,
        actualsThroughDate: cutoff,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
        revisionReason: revisionReason.trim() ? revisionReason : null,
        revisionContext: revisionContext.trim() ? revisionContext : null,
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

  const moreDetailsPanelId = useId();

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      size="md"
      panelClassName={FINANCE_FORMAL_REFORECAST_DIALOG_SHELL_CLASS}
      headerClassName={FINANCE_FORMAL_REFORECAST_DIALOG_HEADER_CLASS}
      footerClassName={FINANCE_FORMAL_REFORECAST_DIALOG_FOOTER_CLASS}
      descriptionClassName="mt-0.5 leading-snug"
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
      <div className="space-y-2.5" data-finance-formal-reforecast-dialog>
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

        <div data-finance-disclosure="formal-reforecast-more-details">
          <button
            type="button"
            className={FINANCE_FORMAL_REFORECAST_MORE_DETAILS_TRIGGER_CLASS}
            aria-expanded={moreDetailsOpen}
            aria-controls={moreDetailsPanelId}
            onClick={() => setMoreDetailsOpen((open) => !open)}
            data-finance-formal-reforecast-more-details-trigger
            data-finance-disclosure-trigger
          >
            <span>{props.t("formalReforecast.moreDetailsTitle")}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
                moreDetailsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {moreDetailsOpen ? (
            <div
              id={moreDetailsPanelId}
              className="mt-2 space-y-2.5"
              data-finance-disclosure-panel
            >
              <SceFormField
                label={props.t("formalReforecast.reasonLabel")}
                htmlFor={reasonId}
                optional
              >
                <SceToolbarSelect
                  id={reasonId}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  disabled={submitPending}
                >
                  <option value="">{props.t("formalReforecast.reasonPlaceholder")}</option>
                  {FORECAST_REVISION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {FORECAST_REVISION_REASON_PRESENTATION[reason].label}
                    </option>
                  ))}
                </SceToolbarSelect>
              </SceFormField>
              {revisionReason === "OTHER" ? (
                <SceFormField
                  label={props.t("formalReforecast.reasonOtherContextLabel")}
                  htmlFor={reasonContextId}
                  optional
                >
                  <input
                    id={reasonContextId}
                    type="text"
                    className="fca-input w-full"
                    value={revisionContext}
                    maxLength={280}
                    placeholder={props.t("formalReforecast.reasonOtherContextPlaceholder")}
                    onChange={(e) => setRevisionContext(e.target.value)}
                    disabled={submitPending}
                  />
                </SceFormField>
              ) : null}
              <SceFormField
                label={props.t("formalReforecast.actualsThroughLabel")}
                htmlFor={actualsThroughId}
                optional
                description={props.t("formalReforecast.actualsThroughHint")}
              >
                <input
                  id={actualsThroughId}
                  type="date"
                  className="fca-input w-full max-w-xs"
                  value={effectiveActualsThrough}
                  onChange={(e) => {
                    setCustomActualsCutoff(true);
                    setActualsThroughDate(e.target.value);
                  }}
                  onBlur={refreshPreviewFromFields}
                  disabled={submitPending}
                />
              </SceFormField>
            </div>
          ) : null}
        </div>

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
          <div className={FINANCE_FORMAL_REFORECAST_PREVIEW_CLASS} data-finance-formal-reforecast-preview>
            <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="min-w-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalIncome")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatFinanceManagementPlanningMinor(
                    preview.incomeMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalExpense")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatFinanceManagementPlanningMinor(
                    preview.expenseMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="min-w-0">
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
            <p className="mt-1.5 text-[var(--muted)]">
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

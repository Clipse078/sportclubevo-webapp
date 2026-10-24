"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useId,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  budgetDraftInputFromMinor,
  formatBudgetPlanningMinor,
  formatBudgetPlanningSignedWholeMajorNumber,
  formatBudgetPlanningWholeMajorNumber,
  normalizeBudgetAmountInput,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import { computeForecastBudgetComparisonMetrics } from "@/lib/finance/forecast/forecast-budget-comparison";
import {
  buildForecastDraftAmounts,
  forecastTotalsFromDraft,
  isStaleForecastSaveResult,
  mergeForecastDraftAmount,
  type ForecastDraftAmounts,
} from "@/lib/finance/forecast/forecast-draft-editing";
import type { ForecastWorkspaceSnapshot } from "@/lib/finance/forecast/forecast-presentation";
import type { ProjectionWorkspaceViewModel } from "@/lib/finance/projection/projection-workspace-presentation";
import {
  FinanceProjectionAccountCell,
  FinanceProjectionDeltaCell,
  FinanceProjectionWorkspaceSection,
} from "@/components/admin/finance/FinanceProjectionWorkspaceSection";
import { financeVarianceComparisonSemanticTextClass } from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  createForecastAction,
  saveForecastLineAction,
} from "@/app/(admin)/dashboard/finance/forecast/actions";
import {
  deriveBudgetWorkspacePersistencePhase,
  type BudgetWorkspacePersistencePhase,
} from "@/lib/finance/budget/budget-workspace-persistence";
import {
  FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS,
  FINANCE_CONTEXT_STRIP_CLASS,
  FINANCE_CURRENCY_CONTEXT_CLASS,
  FINANCE_EMPTY_DRAFT_SURFACE_CLASS,
  FINANCE_FORECAST_MONEY_CELL_INPUT_CLASS,
  FINANCE_FORECAST_MONEY_CELL_READ_ONLY_CLASS,
  FINANCE_FORECAST_TABLES_STACK_CLASS,
  FINANCE_FORECAST_WORKSPACE_STACK_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
  FINANCE_TABLE_HEAD_ROW_CLASS,
  FINANCE_TABLE_ROW_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import {
  FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS,
  FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_TABLE_CLASS,
  FinanceVarianceComparisonColGroup,
} from "@/lib/finance/presentation/finance-variance-comparison-table-layout";

type FinanceYearOption = { id: string; name: string };

type FinanceForecastWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: ForecastWorkspaceSnapshot | null;
  projection: ProjectionWorkspaceViewModel | null;
  baseCurrency: string | null;
  hasAccounts: boolean;
  canMutate: boolean;
  canGenerateProjection: boolean;
  selectedYearId: string | null;
  formattingLocale: string;
  creation: { canInitializeFromBaseline: boolean };
};

export function FinanceForecastWorkspacePanel({
  years,
  snapshot,
  projection,
  baseCurrency,
  hasAccounts,
  canMutate,
  canGenerateProjection,
  selectedYearId,
  formattingLocale,
  creation,
}: FinanceForecastWorkspacePanelProps) {
  const t = useTranslations("Finance.forecast");
  const tVariance = useTranslations("Finance.actuals");
  const router = useRouter();
  const [workspacePending, startWorkspaceTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"EMPTY" | "FROM_BASELINE">(() =>
    creation.canInitializeFromBaseline ? "FROM_BASELINE" : "EMPTY",
  );
  const [persistencePhase, setPersistencePhase] =
    useState<BudgetWorkspacePersistencePhase>("hidden");
  const yearSelectId = useId();
  const currencyContextId = useId();
  const workspaceCurrency = snapshot?.currency ?? baseCurrency;
  const readOnly = !canMutate;

  const incomeRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "INCOME") ?? [],
    [snapshot?.rows],
  );
  const expenseRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "EXPENSE") ?? [],
    [snapshot?.rows],
  );

  const selectedYearName =
    years.find((y) => y.id === selectedYearId)?.name ?? snapshot?.financeYearName ?? "";

  function onYearChange(yearId: string) {
    if (!yearId) return;
    router.push(`/dashboard/finance/forecast?yearId=${encodeURIComponent(yearId)}`);
  }

  function runCreateForecast() {
    if (!selectedYearId) return;
    startWorkspaceTransition(async () => {
      const result = await createForecastAction({
        financeYearId: selectedYearId,
        mode: creationMode,
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback(null);
      setCreateDialogOpen(false);
      router.refresh();
    });
  }

  const creationModeOptions = useMemo(() => {
    const options: Array<{ value: "EMPTY" | "FROM_BASELINE"; label: string }> = [
      { value: "EMPTY", label: t("createModeEmpty") },
    ];
    if (creation.canInitializeFromBaseline) {
      options.push({ value: "FROM_BASELINE", label: t("createModeFromBaseline") });
    }
    return options;
  }, [creation.canInitializeFromBaseline, t]);

  if (years.length === 0) {
    return (
      <div className={FINANCE_WORKSPACE_STACK_CLASS}>
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
          <h2 className="text-base font-semibold">{t("noYearTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noYearBody")}</p>
        </section>
      </div>
    );
  }

  if (!hasAccounts) {
    return (
      <div className={FINANCE_WORKSPACE_STACK_CLASS}>
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
          <h2 className="text-base font-semibold">{t("noAccountsTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noAccountsBody")}</p>
          <Link
            href="/dashboard/finance/structure"
            className="mt-4 inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t("openStructure")}
          </Link>
        </section>
      </div>
    );
  }

  const yearSelected = Boolean(selectedYearId);
  const hasForecast = Boolean(snapshot?.versionId);
  const displayTotals = snapshot
    ? forecastTotalsFromDraft(snapshot.rows, buildForecastDraftAmounts(snapshot.rows))
    : null;

  function openCreateDialog() {
    setCreationMode(creation.canInitializeFromBaseline ? "FROM_BASELINE" : "EMPTY");
    setCreateDialogOpen(true);
  }

  return (
    <div className={FINANCE_FORECAST_WORKSPACE_STACK_CLASS}>
      <div className={FINANCE_CONTEXT_STRIP_CLASS}>
        <SceFormField label={t("yearLabel")} htmlFor={yearSelectId}>
          <SceToolbarSelect
            id={yearSelectId}
            wrapperClassName="min-w-[12rem]"
            value={selectedYearId ?? ""}
            onChange={(e) => onYearChange(e.target.value)}
          >
            <option value="" disabled>
              {t("yearPlaceholder")}
            </option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </SceToolbarSelect>
        </SceFormField>

        {yearSelected && workspaceCurrency ? (
          <SceFormField label={t("currencyLabel")} htmlFor={currencyContextId}>
            <p id={currencyContextId} className={FINANCE_CURRENCY_CONTEXT_CLASS}>
              {workspaceCurrency}
            </p>
          </SceFormField>
        ) : null}

        {hasForecast && snapshot?.versionNumber ? (
          <div className="ms-auto flex max-w-md flex-col items-end gap-0.5 text-end">
            <p className="text-xs text-[var(--muted)]">
              {t("currentVersionLabel", { version: snapshot.versionNumber })}
            </p>
            {persistencePhase !== "hidden" ? (
              <ForecastPersistenceIndicator phase={persistencePhase} t={t} />
            ) : null}
          </div>
        ) : persistencePhase !== "hidden" ? (
          <div className="ms-auto text-end">
            <ForecastPersistenceIndicator phase={persistencePhase} t={t} />
          </div>
        ) : null}
      </div>

      {!canMutate && yearSelected ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {yearSelected && projection ? (
        <FinanceProjectionWorkspaceSection
          projection={projection}
          currency={workspaceCurrency}
          formattingLocale={formattingLocale}
          canGenerate={canGenerateProjection}
        />
      ) : null}

      {yearSelected && !hasForecast && canMutate ? (
        <section className={cn(FINANCE_EMPTY_DRAFT_SURFACE_CLASS, "py-4")}>
          <h2 className="text-sm font-semibold">{t("currentForecastSectionTitle")}</h2>
          <p className="mt-1 text-sm font-medium">{t("emptyTitle", { year: selectedYearName })}</p>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Button className="mt-3 h-8 px-3 text-sm" onClick={openCreateDialog}>
            {t("createAction")}
          </Button>
        </section>
      ) : null}

      {yearSelected && hasForecast && snapshot && displayTotals ? (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("currentForecastSectionTitle")}
          </h2>
          <ForecastSummarySection
            totals={displayTotals}
            currency={workspaceCurrency}
            formattingLocale={formattingLocale}
            labels={{
              income: t("totalIncome"),
              expense: t("totalExpense"),
              result: t("plannedResult"),
            }}
          />

          <ForecastEditableSection
            snapshot={snapshot}
            projection={projection}
            incomeRows={incomeRows}
            expenseRows={expenseRows}
            readOnly={readOnly}
            formattingLocale={formattingLocale}
            yearName={selectedYearName}
            onPersistencePhaseChange={setPersistencePhase}
            t={t}
            tVariance={tVariance}
          />
        </>
      ) : null}

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title={t("createDialogTitle")}
        description={t("createDialogBody", { year: selectedYearName })}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setCreateDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={workspacePending} onClick={runCreateForecast}>
              {t("createConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SceFormField label={t("createModeLabel")}>
            <SceSegmentedControl
              aria-label={t("createModeLabel")}
              value={creationMode}
              onChange={setCreationMode}
              options={creationModeOptions}
              disabled={workspacePending}
            />
          </SceFormField>
          <p className="text-sm text-[var(--muted)]">
            {creationMode === "EMPTY"
              ? t("createModeEmptyDescription")
              : t("createModeFromBaselineDescription")}
          </p>
          {!creation.canInitializeFromBaseline ? (
            <p className="text-xs text-[var(--muted)]">{t("baselineUnavailableHint")}</p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function ForecastPersistenceIndicator(props: {
  phase: Exclude<BudgetWorkspacePersistencePhase, "hidden">;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const isError = props.phase === "error";
  return (
    <p
      className={cn(
        FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS,
        isError && "text-[var(--destructive)]",
      )}
      data-finance-forecast-persistence={props.phase}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {props.phase === "saving"
        ? props.t("persistenceSaving")
        : props.phase === "unsaved"
          ? props.t("persistenceUnsaved")
          : props.phase === "error"
            ? props.t("persistenceError")
            : props.t("persistenceSaved")}
    </p>
  );
}

function ForecastSummarySection(props: {
  totals: ReturnType<typeof forecastTotalsFromDraft>;
  currency: string | null;
  formattingLocale: string;
  labels: { income: string; expense: string; result: string };
}) {
  const resultClass = financeResultSemanticTextClass(props.totals.resultMinor);
  return (
    <section className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS} data-finance-surface="forecast-summary">
      <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
        <div className="sm:px-4 sm:first:ps-0">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.income}</dt>
          <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
            {formatBudgetPlanningMinor(
              props.totals.totalIncomeMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="sm:px-4">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.expense}</dt>
          <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
            {formatBudgetPlanningMinor(
              props.totals.totalExpenseMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div className="sm:px-4 sm:last:pe-0">
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.result}</dt>
          <dd
            className={cn(FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS, resultClass)}
            data-finance-forecast-summary="result"
          >
            {formatBudgetPlanningMinor(props.totals.resultMinor, props.currency, props.formattingLocale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ForecastEditableSection(props: {
  snapshot: ForecastWorkspaceSnapshot;
  projection: ProjectionWorkspaceViewModel | null;
  incomeRows: ForecastWorkspaceSnapshot["rows"];
  expenseRows: ForecastWorkspaceSnapshot["rows"];
  readOnly: boolean;
  formattingLocale: string;
  yearName: string;
  onPersistencePhaseChange: (phase: BudgetWorkspacePersistencePhase) => void;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
  tVariance: ReturnType<typeof useTranslations<"Finance.actuals">>;
}) {
  const [draftAmounts, setDraftAmounts] = useState<ForecastDraftAmounts>(() =>
    buildForecastDraftAmounts(props.snapshot.rows),
  );
  const [inFlightSaveCount, setInFlightSaveCount] = useState(0);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const dirtyAccountIdsRef = useRef(new Set<string>());
  const saveGenerationRef = useRef(new Map<string, number>());
  const pendingSavePromisesRef = useRef(new Set<Promise<void>>());
  const syncedVersionIdRef = useRef(props.snapshot.versionId);

  useEffect(() => {
    if (props.snapshot.versionId !== syncedVersionIdRef.current) {
      syncedVersionIdRef.current = props.snapshot.versionId;
      setDraftAmounts(buildForecastDraftAmounts(props.snapshot.rows));
      dirtyAccountIdsRef.current.clear();
      setLineErrors({});
    }
  }, [props.snapshot]);

  const syncDirtyAccountCount = useCallback(() => {
    props.onPersistencePhaseChange(
      deriveBudgetWorkspacePersistencePhase({
        editable: !props.readOnly,
        dirtyAccountCount: dirtyAccountIdsRef.current.size,
        inFlightSaveCount,
        failedLineSaveCount: Object.keys(lineErrors).length,
      }),
    );
  }, [inFlightSaveCount, lineErrors, props]);

  useEffect(() => {
    syncDirtyAccountCount();
  }, [syncDirtyAccountCount]);

  const persistLine = useCallback(
    async (accountId: string, amountMinor: number) => {
      const versionId = props.snapshot.versionId;
      if (!versionId || props.readOnly) return;
      const nextGen = (saveGenerationRef.current.get(accountId) ?? 0) + 1;
      saveGenerationRef.current.set(accountId, nextGen);
      setInFlightSaveCount((c) => c + 1);
      const savePromise = (async () => {
        try {
          const result = await saveForecastLineAction({
            forecastVersionId: versionId,
            financialAccountId: accountId,
            amountMinor,
          });
          if (isStaleForecastSaveResult(accountId, nextGen, saveGenerationRef.current)) return;
          if (result.ok) {
            dirtyAccountIdsRef.current.delete(accountId);
            setLineErrors((prev) => {
              if (!prev[accountId]) return prev;
              const next = { ...prev };
              delete next[accountId];
              return next;
            });
          } else {
            setLineErrors((prev) => ({ ...prev, [accountId]: result.error }));
          }
        } finally {
          setInFlightSaveCount((c) => Math.max(0, c - 1));
        }
      })();
      pendingSavePromisesRef.current.add(savePromise);
      await savePromise.finally(() => pendingSavePromisesRef.current.delete(savePromise));
    },
    [props.readOnly, props.snapshot.versionId],
  );

  const updateLocalDraftAmount = useCallback((accountId: string, amountMinor: number | null) => {
    setDraftAmounts((prev) => mergeForecastDraftAmount(prev, accountId, amountMinor));
    dirtyAccountIdsRef.current.add(accountId);
  }, []);

  return (
    <div className={FINANCE_FORECAST_TABLES_STACK_CLASS} data-finance-forecast-editable>
      <ForecastAccountTable
        title={props.t("incomeSectionWithYear", { year: props.yearName })}
        rows={props.incomeRows}
        projection={props.projection}
        draftAmounts={draftAmounts}
        readOnly={props.readOnly}
        formattingLocale={props.formattingLocale}
        showComparison={Boolean(props.snapshot.approvedBaselineTotals)}
        onLocalDraftChange={updateLocalDraftAmount}
        onPersist={(accountId, amountMinor) => {
          if (amountMinor === null) return;
          void persistLine(accountId, amountMinor);
        }}
        t={props.t}
        tVariance={props.tVariance}
        lineErrors={lineErrors}
      />

      <ForecastAccountTable
        title={props.t("expenseSectionWithYear", { year: props.yearName })}
        rows={props.expenseRows}
        projection={props.projection}
        draftAmounts={draftAmounts}
        readOnly={props.readOnly}
        formattingLocale={props.formattingLocale}
        showComparison={Boolean(props.snapshot.approvedBaselineTotals)}
        onLocalDraftChange={updateLocalDraftAmount}
        onPersist={(accountId, amountMinor) => {
          if (amountMinor === null) return;
          void persistLine(accountId, amountMinor);
        }}
        t={props.t}
        tVariance={props.tVariance}
        lineErrors={lineErrors}
      />
    </div>
  );
}

function ForecastAccountTable(props: {
  title: string;
  rows: ForecastWorkspaceSnapshot["rows"];
  projection: ProjectionWorkspaceViewModel | null;
  draftAmounts: ForecastDraftAmounts;
  readOnly: boolean;
  formattingLocale: string;
  showComparison: boolean;
  onLocalDraftChange: (accountId: string, amountMinor: number | null) => void;
  onPersist: (accountId: string, amountMinor: number | null) => void;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
  tVariance: ReturnType<typeof useTranslations<"Finance.actuals">>;
  lineErrors: Record<string, string>;
}) {
  const showProjectionColumns = Boolean(props.projection);
  const tableClass = props.showComparison
    ? FINANCE_VARIANCE_COMPARISON_TABLE_CLASS
    : "w-full min-w-0 table-fixed text-sm";

  return (
    <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-surface="forecast-section">
      <h3 className={cn(FINANCE_SECTION_HEADER_CLASS, "py-2 text-xs font-semibold uppercase tracking-wide")}>
        {props.title}
      </h3>
      <div className="min-w-0 overflow-x-auto">
        <table
          className={tableClass}
          data-finance-variance-comparison-table={props.showComparison ? "forecast" : undefined}
        >
          {props.showComparison ? <FinanceVarianceComparisonColGroup mode="FULL_YEAR" /> : null}
          <thead>
            <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS}>
                {props.t("accountColumn")}
              </th>
              {props.showComparison ? (
                <>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("budgetColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("forecastColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("deltaColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("ratingColumn")}
                  </th>
                </>
              ) : (
                <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                  {props.t("forecastColumn")}
                </th>
              )}
              {showProjectionColumns ? (
                <>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("projectionColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {props.t("projectionDeltaColumn")}
                  </th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const amountMinor = Object.prototype.hasOwnProperty.call(
                props.draftAmounts,
                row.accountId,
              )
                ? props.draftAmounts[row.accountId]!
                : row.amountMinor;
              const comparison = computeForecastBudgetComparisonMetrics({
                canonicalSemantic: row.semantic as "INCOME" | "EXPENSE",
                approvedBudgetMinor: row.approvedBudgetMinor,
                forecastMinor: amountMinor,
              });
              const hasComparison =
                props.showComparison &&
                comparison.rawForecastDeltaMinor !== null &&
                comparison.favorability !== null;
              const favorability = comparison.favorability;
              const rowReadOnly = props.readOnly || row.lifecycle === "ARCHIVED";

              return (
                <tr
                  key={row.accountId}
                  className={cn(
                    FINANCE_TABLE_ROW_CLASS,
                    row.lifecycle === "ARCHIVED" && "opacity-75",
                  )}
                >
                  <td className={FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS}>
                    <span className="font-medium">{row.accountName}</span>
                    {row.lifecycle === "ARCHIVED" ? (
                      <span className="ms-2 text-xs text-[var(--muted)]">
                        {props.t("archivedAccount")}
                      </span>
                    ) : null}
                  </td>
                  {props.showComparison ? (
                    <>
                      <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                        {row.approvedBudgetMinor === null
                          ? "—"
                          : formatBudgetPlanningWholeMajorNumber(
                              row.approvedBudgetMinor,
                              props.formattingLocale,
                            )}
                      </td>
                      <td className={cn(FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS, "align-middle")}>
                        <ForecastAmountCell
                          accountId={row.accountId}
                          amountMinor={amountMinor}
                          readOnly={rowReadOnly}
                          formattingLocale={props.formattingLocale}
                          error={props.lineErrors[row.accountId]}
                          onLocalDraftChange={props.onLocalDraftChange}
                          onPersist={props.onPersist}
                          label={props.t("forecastAmountLabel", { account: row.accountName })}
                        />
                      </td>
                      <td
                        className={cn(
                          FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
                          financeVarianceComparisonSemanticTextClass({
                            favorability,
                            hasComparison,
                          }),
                        )}
                      >
                        {hasComparison
                          ? formatBudgetPlanningSignedWholeMajorNumber(
                              comparison.rawForecastDeltaMinor!,
                              props.formattingLocale,
                            )
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
                          "text-xs",
                          financeVarianceComparisonSemanticTextClass({
                            favorability,
                            hasComparison,
                          }),
                        )}
                      >
                        {hasComparison && favorability
                          ? props.tVariance(
                              favorability === "FAVORABLE"
                                ? "favorabilityFavorable"
                                : favorability === "UNFAVORABLE"
                                  ? "favorabilityUnfavorable"
                                  : "favorabilityOnPlan",
                            )
                          : "—"}
                      </td>
                    </>
                  ) : (
                    <td className={cn(FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS, "align-middle")}>
                      <ForecastAmountCell
                        accountId={row.accountId}
                        amountMinor={amountMinor}
                        readOnly={rowReadOnly}
                        formattingLocale={props.formattingLocale}
                        error={props.lineErrors[row.accountId]}
                        onLocalDraftChange={props.onLocalDraftChange}
                        onPersist={props.onPersist}
                        label={props.t("forecastAmountLabel", { account: row.accountName })}
                      />
                    </td>
                  )}
                  {showProjectionColumns && props.projection ? (
                    <>
                      <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                        <FinanceProjectionAccountCell
                          accountId={row.accountId}
                          projection={props.projection}
                          formattingLocale={props.formattingLocale}
                        />
                      </td>
                      <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                        <FinanceProjectionDeltaCell
                          accountId={row.accountId}
                          projection={props.projection}
                          formattingLocale={props.formattingLocale}
                        />
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ForecastAmountCell(props: {
  accountId: string;
  amountMinor: number | null;
  readOnly: boolean;
  formattingLocale: string;
  label: string;
  error?: string;
  onLocalDraftChange: (accountId: string, amountMinor: number | null) => void;
  onPersist: (accountId: string, amountMinor: number | null) => void;
}) {
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const [editValue, setEditValue] = useState(() => budgetDraftInputFromMinor(props.amountMinor));

  const displayValue = focused
    ? editValue
    : props.amountMinor !== null
      ? formatBudgetPlanningWholeMajorNumber(props.amountMinor, props.formattingLocale)
      : "";

  if (props.readOnly) {
    return (
      <span className={FINANCE_FORECAST_MONEY_CELL_READ_ONLY_CLASS}>
        {props.amountMinor !== null
          ? formatBudgetPlanningWholeMajorNumber(props.amountMinor, props.formattingLocale)
          : "—"}
      </span>
    );
  }

  return (
    <div className="ms-auto flex max-w-[9rem] flex-col items-end gap-0.5">
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        aria-label={props.label}
        aria-invalid={props.error ? true : undefined}
        className={FINANCE_FORECAST_MONEY_CELL_INPUT_CLASS}
        value={displayValue}
        onFocus={() => {
          setFocused(true);
          setEditValue(budgetDraftInputFromMinor(props.amountMinor));
        }}
        onChange={(e) => {
          const next = normalizeBudgetAmountInput(e.target.value);
          setEditValue(next);
          if (next === "") {
            props.onLocalDraftChange(props.accountId, null);
            return;
          }
          const minor = parseBudgetInputToMinor(next);
          if (minor !== null) {
            props.onLocalDraftChange(props.accountId, minor);
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (editValue.trim() === "") {
            props.onLocalDraftChange(props.accountId, null);
            return;
          }
          const minor = parseBudgetInputToMinor(editValue);
          if (minor === null) return;
          props.onPersist(props.accountId, minor);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
      {props.error ? (
        <span className="text-xs text-[var(--destructive)]">{props.error}</span>
      ) : null}
    </div>
  );
}

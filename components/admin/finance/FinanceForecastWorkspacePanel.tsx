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
  normalizeBudgetAmountInput,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  buildForecastDraftAmounts,
  forecastTotalsFromDraft,
  isStaleForecastSaveResult,
  mergeForecastDraftAmount,
  type ForecastDraftAmounts,
} from "@/lib/finance/forecast/forecast-draft-editing";
import type { ForecastWorkspaceSnapshot } from "@/lib/finance/forecast/forecast-presentation";
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
  FINANCE_BUDGET_AMOUNT_INPUT_CLASS,
  FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS,
  FINANCE_CONTEXT_STRIP_CLASS,
  FINANCE_CURRENCY_CONTEXT_CLASS,
  FINANCE_EMPTY_DRAFT_SURFACE_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_SUMMARY_GRID_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_SURFACE_CLASS,
  FINANCE_SUMMARY_VALUE_CLASS,
  FINANCE_TABLE_HEAD_ROW_CLASS,
  FINANCE_TABLE_ROW_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

type FinanceYearOption = { id: string; name: string };

type FinanceForecastWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: ForecastWorkspaceSnapshot | null;
  baseCurrency: string | null;
  hasAccounts: boolean;
  canMutate: boolean;
  selectedYearId: string | null;
  formattingLocale: string;
  creation: { canInitializeFromBaseline: boolean };
};

export function FinanceForecastWorkspacePanel({
  years,
  snapshot,
  baseCurrency,
  hasAccounts,
  canMutate,
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
  const [creationMode, setCreationMode] = useState<"EMPTY" | "FROM_BASELINE">("EMPTY");
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

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS}>
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
          <p className="ms-auto text-sm text-[var(--muted)]">
            {t("currentVersionLabel", { version: snapshot.versionNumber })}
          </p>
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

      {yearSelected && !hasForecast && canMutate ? (
        <section className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
          <h2 className="text-base font-semibold">
            {t("emptyTitle", { year: selectedYearName })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            {t("createAction")}
          </Button>
        </section>
      ) : null}

      {yearSelected && hasForecast && snapshot && displayTotals ? (
        <>
          <ForecastSummarySection
            snapshot={snapshot}
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
            incomeRows={incomeRows}
            expenseRows={expenseRows}
            readOnly={readOnly}
            currency={workspaceCurrency}
            formattingLocale={formattingLocale}
            yearName={selectedYearName}
            onPersistencePhaseChange={setPersistencePhase}
            persistencePhase={persistencePhase}
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
        <div className="space-y-4">
          <SceFormField label={t("createModeLabel")}>
            <SceSegmentedControl
              aria-label={t("createModeLabel")}
              value={creationMode}
              onChange={setCreationMode}
              options={creationModeOptions}
              disabled={workspacePending}
            />
          </SceFormField>
          {!creation.canInitializeFromBaseline ? (
            <p className="text-xs text-[var(--muted)]">{t("baselineUnavailableHint")}</p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

function ForecastSummarySection(props: {
  snapshot: ForecastWorkspaceSnapshot;
  totals: ReturnType<typeof forecastTotalsFromDraft>;
  currency: string | null;
  formattingLocale: string;
  labels: { income: string; expense: string; result: string };
}) {
  const resultClass = financeResultSemanticTextClass(props.totals.resultMinor);
  return (
    <section className={FINANCE_SUMMARY_SURFACE_CLASS}>
      <dl className={FINANCE_SUMMARY_GRID_CLASS}>
        <div>
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.income}</dt>
          <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
            {formatBudgetPlanningMinor(
              props.totals.totalIncomeMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div>
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.expense}</dt>
          <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
            {formatBudgetPlanningMinor(
              props.totals.totalExpenseMinor,
              props.currency,
              props.formattingLocale,
            )}
          </dd>
        </div>
        <div>
          <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels.result}</dt>
          <dd className={cn(FINANCE_SUMMARY_RESULT_VALUE_CLASS, resultClass)}>
            {formatBudgetPlanningMinor(props.totals.resultMinor, props.currency, props.formattingLocale)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ForecastEditableSection(props: {
  snapshot: ForecastWorkspaceSnapshot;
  incomeRows: ForecastWorkspaceSnapshot["rows"];
  expenseRows: ForecastWorkspaceSnapshot["rows"];
  readOnly: boolean;
  currency: string | null;
  formattingLocale: string;
  yearName: string;
  persistencePhase: BudgetWorkspacePersistencePhase;
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

  const totals = forecastTotalsFromDraft(props.snapshot.rows, draftAmounts);

  return (
    <>
      {props.persistencePhase !== "hidden" ? (
        <p className={FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS}>
          {props.persistencePhase === "saving"
            ? props.t("persistenceSaving")
            : props.persistencePhase === "unsaved"
              ? props.t("persistenceUnsaved")
              : props.persistencePhase === "error"
                ? props.t("persistenceError")
                : props.t("persistenceSaved")}
        </p>
      ) : null}

      <ForecastAccountTable
        title={props.t("incomeSectionWithYear", { year: props.yearName })}
        rows={props.incomeRows}
        draftAmounts={draftAmounts}
        readOnly={props.readOnly}
        currency={props.currency}
        formattingLocale={props.formattingLocale}
        showComparison={Boolean(props.snapshot.approvedBaselineTotals)}
        onCommit={(accountId, raw) => {
          const normalized = normalizeBudgetAmountInput(raw);
          const minor = parseBudgetInputToMinor(normalized);
          if (minor === null) return;
          updateLocalDraftAmount(accountId, minor);
          void persistLine(accountId, minor);
        }}
        t={props.t}
        tVariance={props.tVariance}
        lineErrors={lineErrors}
      />

      <ForecastAccountTable
        title={props.t("expenseSectionWithYear", { year: props.yearName })}
        rows={props.expenseRows}
        draftAmounts={draftAmounts}
        readOnly={props.readOnly}
        currency={props.currency}
        formattingLocale={props.formattingLocale}
        showComparison={Boolean(props.snapshot.approvedBaselineTotals)}
        onCommit={(accountId, raw) => {
          const normalized = normalizeBudgetAmountInput(raw);
          const minor = parseBudgetInputToMinor(normalized);
          if (minor === null) return;
          updateLocalDraftAmount(accountId, minor);
          void persistLine(accountId, minor);
        }}
        t={props.t}
        tVariance={props.tVariance}
        lineErrors={lineErrors}
      />

      <section className={FINANCE_SECTION_SURFACE_CLASS}>
        <h3 className={FINANCE_SECTION_HEADER_CLASS}>{props.t("sectionTotals")}</h3>
        <p className="text-sm tabular-nums">
          {formatBudgetPlanningMinor(totals.resultMinor, props.currency, props.formattingLocale)}
        </p>
      </section>
    </>
  );
}

function ForecastAccountTable(props: {
  title: string;
  rows: ForecastWorkspaceSnapshot["rows"];
  draftAmounts: ForecastDraftAmounts;
  readOnly: boolean;
  currency: string | null;
  formattingLocale: string;
  showComparison: boolean;
  onCommit: (accountId: string, raw: string) => void;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
  tVariance: ReturnType<typeof useTranslations<"Finance.actuals">>;
  lineErrors: Record<string, string>;
}) {
  return (
    <section className={FINANCE_SECTION_SURFACE_CLASS}>
      <h3 className={FINANCE_SECTION_HEADER_CLASS}>{props.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
              <th className="text-start font-medium">{props.t("accountColumn")}</th>
              {props.showComparison ? (
                <>
                  <th className="text-end font-medium">{props.t("budgetColumn")}</th>
                  <th className="text-end font-medium">{props.t("forecastColumn")}</th>
                  <th className="text-end font-medium">{props.t("deltaColumn")}</th>
                  <th className="text-end font-medium">{props.t("ratingColumn")}</th>
                </>
              ) : (
                <th className="text-end font-medium">{props.t("forecastColumn")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => {
              const draftMinor = props.draftAmounts[row.accountId] ?? row.amountMinor;
              const inputValue =
                draftMinor === null ? "" : budgetDraftInputFromMinor(draftMinor);
              const hasComparison =
                props.showComparison &&
                row.approvedBudgetMinor !== null &&
                draftMinor !== null;
              const favorability = row.comparison.favorability;
              return (
                <tr key={row.accountId} className={FINANCE_TABLE_ROW_CLASS}>
                  <td>
                    <span className="font-medium">{row.accountName}</span>
                    {row.lifecycle === "ARCHIVED" ? (
                      <span className="ms-2 text-xs text-[var(--muted)]">{props.t("archivedAccount")}</span>
                    ) : null}
                  </td>
                  {props.showComparison ? (
                    <>
                      <td className="text-end tabular-nums">
                        {row.approvedBudgetMinor === null
                          ? "—"
                          : formatBudgetPlanningMinor(
                              row.approvedBudgetMinor,
                              props.currency,
                              props.formattingLocale,
                            )}
                      </td>
                      <td className="text-end">
                        <ForecastAmountInput
                          value={inputValue}
                          readOnly={props.readOnly || row.lifecycle === "ARCHIVED"}
                          label={props.t("forecastAmountLabel", { account: row.accountName })}
                          error={props.lineErrors[row.accountId]}
                          onCommit={(raw) => props.onCommit(row.accountId, raw)}
                        />
                      </td>
                      <td
                        className={cn(
                          "text-end tabular-nums",
                          financeVarianceComparisonSemanticTextClass({
                            favorability,
                            hasComparison,
                          }),
                        )}
                      >
                        {hasComparison && row.comparison.rawForecastDeltaMinor !== null
                          ? formatBudgetPlanningMinor(
                              row.comparison.rawForecastDeltaMinor,
                              props.currency,
                              props.formattingLocale,
                            )
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "text-end",
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
                    <td className="text-end">
                      <ForecastAmountInput
                        value={inputValue}
                        readOnly={props.readOnly || row.lifecycle === "ARCHIVED"}
                        label={props.t("forecastAmountLabel", { account: row.accountName })}
                        error={props.lineErrors[row.accountId]}
                        onCommit={(raw) => props.onCommit(row.accountId, raw)}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ForecastAmountInput(props: {
  value: string;
  readOnly: boolean;
  label: string;
  error?: string;
  onCommit: (raw: string) => void;
}) {
  const [local, setLocal] = useState(props.value);
  useEffect(() => setLocal(props.value), [props.value]);

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <input
        type="text"
        inputMode="decimal"
        aria-label={props.label}
        className={FINANCE_BUDGET_AMOUNT_INPUT_CLASS}
        value={local}
        readOnly={props.readOnly}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => props.onCommit(local)}
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

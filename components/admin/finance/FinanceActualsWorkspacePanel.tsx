"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatBudgetPlanningMinor,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import { formatFinanceYearDateInputValue } from "@/lib/finance/setup/finance-year-date-input";
import type { AccountPeriodicMetrics } from "@/lib/finance/actual/periodic-account-read-model";
import {
  measurementModeToSearchParam,
  type FinanceMeasurementMode,
} from "@/lib/finance/actual/finance-measurement-period";
import { writeFinanceMeasurementPeriodToSearchParams } from "@/lib/finance/actual/finance-measurement-period-url";
import {
  FinanceMonthPeriodSlicer,
  FinanceQuarterPeriodSlicer,
} from "@/components/admin/finance/FinanceMeasurementPeriodSlicer";
import type { ActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import {
  createActualEntryAction,
  deleteActualEntryAction,
  updateActualEntryAction,
} from "@/app/(admin)/dashboard/finance/actuals/actions";
import {
  FINANCE_ACTUALS_BOOKINGS_CELL_ACTIONS_CLASS,
  FINANCE_ACTUALS_BOOKINGS_CELL_DESCRIPTION_CLASS,
  FINANCE_ACTUALS_BOOKINGS_CELL_NUMERIC_CLASS,
  FINANCE_ACTUALS_BOOKINGS_CELL_TEXT_CLASS,
  FINANCE_ACTUALS_BOOKINGS_HEAD_ACTIONS_CLASS,
  FINANCE_ACTUALS_BOOKINGS_HEAD_NUMERIC_CLASS,
  FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS,
  FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS,
  FINANCE_ACTUALS_BOOKINGS_TABLE_SCROLL_CLASS,
  FinanceActualsBookingsColGroup,
} from "@/lib/finance/presentation/finance-actuals-bookings-table-layout";
import {
  FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS,
  FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_TABLE_CLASS,
  FinanceVarianceComparisonColGroup,
} from "@/lib/finance/presentation/finance-variance-comparison-table-layout";
import {
  financeManagementSignalPresentation,
} from "@/lib/finance/presentation/finance-management-signal-presentation";
import {
  financeResultSemanticTextClass,
} from "@/lib/finance/presentation/finance-result-presentation";
import {
  financeVarianceComparisonSemanticTextClass,
  financeVarianceFavorabilityLabelKey,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";
import {
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

type VarianceAccountRow = ActualsWorkspaceSnapshot["variance"]["accounts"][number];
type PeriodicAccountRow = AccountPeriodicMetrics;

type FinanceActualsWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: ActualsWorkspaceSnapshot;
  canMutate: boolean;
  formattingLocale: string;
};

function formatYtdCutoffLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function FinanceActualsWorkspacePanel({
  years,
  snapshot,
  canMutate,
  formattingLocale,
}: FinanceActualsWorkspacePanelProps) {
  const t = useTranslations("Finance.actuals");
  const tStructure = useTranslations("Finance.structure.semantics");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");

  const selectedYearId = snapshot.selectedYearId;
  const baseCurrency = snapshot.baseCurrency;
  const comparisonMode = snapshot.comparisonMode;
  const measurementPeriod = snapshot.measurementPeriod;
  const periodSlicer = snapshot.periodSlicer;
  const periodic = snapshot.periodic;

  const selectedYearName = years.find((y) => y.id === selectedYearId)?.name ?? "";
  const periodLabel = measurementPeriod?.displayLabel ?? selectedYearName;

  const formatMoney = (minor: number) =>
    baseCurrency
      ? formatBudgetPlanningMinor(minor, baseCurrency, formattingLocale)
      : String(minor);

  function pushContext(next: {
    yearId?: string;
    mode?: FinanceMeasurementMode;
    periodStartIndex?: number;
    periodEndIndex?: number;
    quarterIndex?: number;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.yearId) params.set("yearId", next.yearId);
    const mode = next.mode ?? comparisonMode;
    const modeParam = measurementModeToSearchParam(mode);
    if (modeParam) params.set("mode", modeParam);
    else params.delete("mode");

    if (mode === "MONTH") {
      const start =
        next.periodStartIndex ??
        measurementPeriod?.periodStartIndex ??
        measurementPeriod?.periodIndex ??
        0;
      const end =
        next.periodEndIndex ??
        measurementPeriod?.periodEndIndex ??
        start;
      writeFinanceMeasurementPeriodToSearchParams(params, mode, {
        periodStartIndex: start,
        periodEndIndex: end,
      });
    } else if (mode === "QUARTER") {
      const qIndex =
        next.quarterIndex ??
        measurementPeriod?.periodIndex ??
        0;
      writeFinanceMeasurementPeriodToSearchParams(params, mode, {
        periodStartIndex: qIndex,
        periodEndIndex: qIndex,
      });
    } else {
      writeFinanceMeasurementPeriodToSearchParams(params, mode, {
        periodStartIndex: null,
        periodEndIndex: null,
      });
    }

    router.push(`/dashboard/finance/actuals?${params.toString()}`);
  }

  function resetForm() {
    setAccountId("");
    setEffectiveDate("");
    setAmountInput("");
    setDescription("");
    setEditingId(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function entriesEmptyMessage(): string {
    if (comparisonMode === "FULL_YEAR") {
      return t("entriesEmptyFullYear", { year: selectedYearName });
    }
    if (comparisonMode === "YTD" && snapshot.ytdCutoffDate) {
      return t("entriesEmptyYtd", {
        year: selectedYearName,
        date: formatYtdCutoffLabel(snapshot.ytdCutoffDate, formattingLocale),
      });
    }
    if (comparisonMode === "QUARTER") {
      return t("entriesEmptyQuarter", { period: periodLabel });
    }
    if (
      comparisonMode === "MONTH" &&
      measurementPeriod &&
      measurementPeriod.periodStartIndex !== null &&
      measurementPeriod.periodEndIndex !== null &&
      measurementPeriod.periodStartIndex !== measurementPeriod.periodEndIndex
    ) {
      return t("entriesEmptyMonthRange", { period: periodLabel });
    }
    if (comparisonMode === "MONTH") {
      return t("entriesEmptyMonthSingle", { period: periodLabel });
    }
    return t("entriesEmptyFullYear", { year: selectedYearName });
  }

  function openEditDialog(entry: ActualsWorkspaceSnapshot["entries"][number]) {
    setEditingId(entry.id);
    setAccountId(entry.account.id);
    setEffectiveDate(formatFinanceYearDateInputValue(entry.effectiveDate));
    setAmountInput(String(entry.amountMinor / 100));
    setDescription(entry.description ?? "");
    setDialogOpen(true);
  }

  async function submitDialog() {
    if (!selectedYearId || !baseCurrency) return;
    const amountMinor = parseBudgetInputToMinor(amountInput);
    if (amountMinor === null) {
      setFeedback(t("invalidAmount"));
      return;
    }
    startTransition(async () => {
      setFeedback(null);
      const result = editingId
        ? await updateActualEntryAction({
            entryId: editingId,
            effectiveDate,
            amountMinor,
            description: description || null,
          })
        : await createActualEntryAction({
            financeYearId: selectedYearId,
            financialAccountId: accountId,
            effectiveDate,
            amountMinor,
            currency: baseCurrency,
            description: description || null,
          });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setDialogOpen(false);
      resetForm();
      router.refresh();
    });
  }

  async function handleDelete(entryId: string) {
    startTransition(async () => {
      setFeedback(null);
      const result = await deleteActualEntryAction(entryId);
      if (!result.ok) setFeedback(result.error);
      else router.refresh();
    });
  }

  const comparisonRows = useMemo(
    () =>
      snapshot.variance.accounts.filter(
        (row) => row.metrics.hasActual || row.metrics.hasApprovedBudget,
      ),
    [snapshot.variance.accounts],
  );

  const incomeComparisonRows = useMemo(
    () => comparisonRows.filter((row) => row.canonicalSemantic === "INCOME"),
    [comparisonRows],
  );

  const expenseComparisonRows = useMemo(
    () => comparisonRows.filter((row) => row.canonicalSemantic === "EXPENSE"),
    [comparisonRows],
  );

  const availability = snapshot.variance.availability;

  function renderCaptureActualButton() {
    if (!canMutate) return null;
    return (
      <Button
        variant="primary"
        onClick={openCreateDialog}
        disabled={pending}
        data-finance-actual-create
      >
        {t("captureActual")}
      </Button>
    );
  }

  if (availability === "NO_BASE_CURRENCY") {
    return (
      <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
        <p>{t("noBaseCurrency")}</p>
      </div>
    );
  }

  if (availability === "NO_FINANCE_YEAR") {
    return (
      <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
        <p>{t("noFinanceYear")}</p>
      </div>
    );
  }

  const monthRangeStart = measurementPeriod?.periodStartIndex ?? 0;
  const monthRangeEnd = measurementPeriod?.periodEndIndex ?? monthRangeStart;
  const quarterSelectedIndex = measurementPeriod?.periodIndex ?? 0;
  const useCompactQuarterLabels = selectedYearName.length > 12;

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <div className={cn(FINANCE_CONTEXT_STRIP_CLASS, "flex-col items-stretch gap-3")}>
        <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("financeYearLabel")}</span>
            <SceToolbarSelect
              value={selectedYearId ?? ""}
              onChange={(event) =>
                pushContext({ yearId: event.target.value, mode: comparisonMode })
              }
              aria-label={t("financeYearLabel")}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </SceToolbarSelect>
          </label>
          {baseCurrency ? (
            <span className={FINANCE_CURRENCY_CONTEXT_CLASS}>{baseCurrency}</span>
          ) : null}
          {canMutate ? (
            <div className="ms-auto flex shrink-0 items-center">{renderCaptureActualButton()}</div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <SceSegmentedControl<FinanceMeasurementMode>
            value={comparisonMode}
            onChange={(value) =>
              pushContext({
                yearId: selectedYearId ?? undefined,
                mode: value,
                periodStartIndex: 0,
                periodEndIndex: 0,
                quarterIndex: 0,
              })
            }
            options={[
              { value: "FULL_YEAR", label: t("modeFullYear") },
              { value: "YTD", label: t("modeYtd") },
              { value: "MONTH", label: t("modeMonth") },
              { value: "QUARTER", label: t("modeQuarter") },
            ]}
            aria-label={t("comparisonModeAria")}
          />
          {comparisonMode === "MONTH" && periodSlicer && measurementPeriod ? (
            <FinanceMonthPeriodSlicer
              options={periodSlicer.months}
              startIndex={monthRangeStart}
              endIndex={monthRangeEnd}
              disabled={pending}
              ariaLabel={t("monthSlicerAria")}
              selectedRangeAriaLabel={t("monthSlicerSelectedRange", { period: periodLabel })}
              onRangeChange={(startIndex, endIndex) =>
                pushContext({
                  yearId: selectedYearId ?? undefined,
                  mode: "MONTH",
                  periodStartIndex: startIndex,
                  periodEndIndex: endIndex,
                })
              }
            />
          ) : null}
          {comparisonMode === "QUARTER" && periodSlicer && measurementPeriod ? (
            <FinanceQuarterPeriodSlicer
              options={periodSlicer.quarters}
              selectedIndex={quarterSelectedIndex}
              useCompactLabels={useCompactQuarterLabels}
              disabled={pending}
              ariaLabel={t("quarterSlicerAria", { year: selectedYearName })}
              onSelect={(quarterIndex) =>
                pushContext({
                  yearId: selectedYearId ?? undefined,
                  mode: "QUARTER",
                  quarterIndex,
                })
              }
            />
          ) : null}
        </div>
      </div>

      {!canMutate ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {comparisonMode === "YTD" ? (
        <p className="text-sm text-muted-foreground">
          {t("ytdContextWithYear", {
            year: selectedYearName,
            date: snapshot.ytdCutoffDate
              ? formatYtdCutoffLabel(snapshot.ytdCutoffDate, formattingLocale)
              : "",
          })}
          <span className="mx-1.5 text-[var(--border-strong)]">·</span>
          <span className="text-xs">{t("ytdBudgetReferenceSecondary")}</span>
        </p>
      ) : null}
      {comparisonMode === "MONTH" || comparisonMode === "QUARTER" ? (
        <p className="text-sm text-[var(--foreground)]" data-finance-period-label>
          {t("periodContextPrimary", { period: periodLabel, year: selectedYearName })}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {t("periodBudgetReferenceSecondary")}
          </span>
        </p>
      ) : null}

      {snapshot.managementSignals.length > 0 ? (
        <div
          className="flex flex-col gap-1.5"
          data-finance-management-signals
        >
          {snapshot.managementSignals.map((signal) => {
            const { tone, Icon } = financeManagementSignalPresentation(signal.kind);
            return (
              <p
                key={signal.kind}
                className="flex items-start gap-1.5 text-xs text-[var(--muted)]"
                role="status"
              >
                <Icon
                  className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sceSemanticIconClass(tone))}
                  aria-hidden
                />
                <span>{t(`managementSignal.${signal.kind}`)}</span>
              </p>
            );
          })}
        </div>
      ) : null}

      {feedback ? <p role="alert">{feedback}</p> : null}

      <section className={FINANCE_SECTION_SURFACE_CLASS}>
        <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>
          {comparisonMode === "FULL_YEAR"
            ? t("summaryTitleWithYear", { year: selectedYearName })
            : t("summaryTitleWithPeriodAndYear", {
                period: periodLabel,
                year: selectedYearName,
              })}
        </h2>
        <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
          <div className={FINANCE_SUMMARY_GRID_CLASS}>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualIncome")}</p>
              <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatMoney(
                  periodic?.periodSummary.incomeMinor ??
                    snapshot.variance.actualSummary.incomeMinor,
                )}
              </p>
            </div>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualExpense")}</p>
              <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatMoney(
                  periodic?.periodSummary.expenseMinor ??
                    snapshot.variance.actualSummary.expenseMinor,
                )}
              </p>
            </div>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualResult")}</p>
              <p
                className={cn(
                  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
                  financeResultSemanticTextClass(
                    periodic?.periodSummary.resultMinor ??
                      snapshot.variance.actualSummary.resultMinor,
                  ),
                )}
                data-finance-actual-result="period"
              >
                {formatMoney(
                  periodic?.periodSummary.resultMinor ??
                    snapshot.variance.actualSummary.resultMinor,
                )}
              </p>
            </div>
          </div>
        </div>
        {periodic && comparisonMode !== "FULL_YEAR" && comparisonMode !== "YTD" ? (
          <div className={cn(FINANCE_SUMMARY_SURFACE_CLASS, "mt-3 opacity-90")}>
            <p className={cn(FINANCE_SUMMARY_LABEL_CLASS, "mb-2")}>
              {t("ytdSummaryContext", {
                year: selectedYearName,
                date: formatYtdCutoffLabel(measurementPeriod!.ytdCutoffDate, formattingLocale),
              })}
            </p>
            <div className={FINANCE_SUMMARY_GRID_CLASS}>
              <div>
                <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualIncome")}</p>
                <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                  {formatMoney(periodic.ytdSummary.incomeMinor)}
                </p>
              </div>
              <div>
                <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualExpense")}</p>
                <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                  {formatMoney(periodic.ytdSummary.expenseMinor)}
                </p>
              </div>
              <div>
                <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualResult")}</p>
                <p
                  className={cn(
                    FINANCE_SUMMARY_RESULT_VALUE_CLASS,
                    financeResultSemanticTextClass(periodic.ytdSummary.resultMinor),
                  )}
                  data-finance-actual-result="ytd"
                >
                  {formatMoney(periodic.ytdSummary.resultMinor)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {periodic?.budgetSummary ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("annualBudgetReferenceTitle")}:{" "}
            {formatMoney(periodic.budgetSummary.resultMinor)}{" "}
            {baseCurrency ? `(${baseCurrency})` : null}
          </p>
        ) : null}
      </section>

      {snapshot.variance.approvedBudgetVersionId && periodic ? (
        <>
          <PeriodicComparisonSection
            title={
              comparisonMode === "FULL_YEAR" || comparisonMode === "YTD"
                ? t("incomeSectionWithYear", { year: selectedYearName })
                : t("incomeSectionWithPeriodAndYear", {
                    period: periodLabel,
                    year: selectedYearName,
                  })
            }
            rows={periodic.accounts.filter((row) => row.canonicalSemantic === "INCOME")}
            comparisonMode={comparisonMode}
            formatMoney={formatMoney}
            t={t}
            legacyRows={incomeComparisonRows}
          />
          <PeriodicComparisonSection
            title={
              comparisonMode === "FULL_YEAR" || comparisonMode === "YTD"
                ? t("expenseSectionWithYear", { year: selectedYearName })
                : t("expenseSectionWithPeriodAndYear", {
                    period: periodLabel,
                    year: selectedYearName,
                  })
            }
            rows={periodic.accounts.filter((row) => row.canonicalSemantic === "EXPENSE")}
            comparisonMode={comparisonMode}
            formatMoney={formatMoney}
            t={t}
            legacyRows={expenseComparisonRows}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noApprovedBaseline")}</p>
      )}

      <section className={FINANCE_SECTION_SURFACE_CLASS}>
        <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>
          {comparisonMode === "FULL_YEAR" || comparisonMode === "YTD"
            ? t("entriesTitle", { year: selectedYearName })
            : t("entriesTitleWithPeriod", { period: periodLabel, year: selectedYearName })}
        </h2>
        {snapshot.entries.length === 0 ? (
          <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
            <p>{entriesEmptyMessage()}</p>
          </div>
        ) : (
          <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
            <div className={FINANCE_ACTUALS_BOOKINGS_TABLE_SCROLL_CLASS}>
              <table
                className={FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS}
                data-finance-actuals-bookings-table
              >
                <FinanceActualsBookingsColGroup
                  mode={canMutate ? "WITH_ACTIONS" : "VIEW_ONLY"}
                />
                <thead>
                  <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
                    <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS}>
                      {t("dateColumn")}
                    </th>
                    <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS}>
                      {t("accountColumn")}
                    </th>
                    <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS}>
                      {t("semanticColumn")}
                    </th>
                    <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_NUMERIC_CLASS}>
                      {t("amountColumn")}
                    </th>
                    <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_TEXT_CLASS}>
                      {t("descriptionColumn")}
                    </th>
                    {canMutate ? (
                      <th className={FINANCE_ACTUALS_BOOKINGS_HEAD_ACTIONS_CLASS}>
                        {t("actionsColumn")}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.entries.map((entry) => (
                    <tr key={entry.id} className={FINANCE_TABLE_ROW_CLASS}>
                      <td className={FINANCE_ACTUALS_BOOKINGS_CELL_TEXT_CLASS}>
                        {formatFinanceYearDateInputValue(entry.effectiveDate)}
                      </td>
                      <td className={FINANCE_ACTUALS_BOOKINGS_CELL_TEXT_CLASS}>
                        {entry.account.name}
                      </td>
                      <td className={FINANCE_ACTUALS_BOOKINGS_CELL_TEXT_CLASS}>
                        {entry.account.canonicalSemantic === "INCOME"
                          ? tStructure("income.label")
                          : tStructure("expense.label")}
                      </td>
                      <td className={FINANCE_ACTUALS_BOOKINGS_CELL_NUMERIC_CLASS}>
                        {formatMoney(entry.amountMinor)}
                      </td>
                      <td className={FINANCE_ACTUALS_BOOKINGS_CELL_DESCRIPTION_CLASS}>
                        {entry.description ?? "—"}
                      </td>
                      {canMutate ? (
                        <td className={FINANCE_ACTUALS_BOOKINGS_CELL_ACTIONS_CLASS}>
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEditDialog(entry)}
                            >
                              {t("editAction")}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete(entry.id)}
                              disabled={pending}
                            >
                              {t("deleteAction")}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? t("editDialogTitle") : t("createDialogTitle")}
        description={t("createDialogBody", { year: selectedYearName })}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t("cancelAction")}
            </Button>
            <Button variant="primary" onClick={submitDialog} disabled={pending}>
              {t("saveAction")}
            </Button>
          </div>
        }
      >
        {!editingId ? (
          <>
            <SceFormField label={t("financeYearLabel")} htmlFor="actual-finance-year">
              <p
                id="actual-finance-year"
                className="text-sm font-semibold text-[var(--foreground)] break-words"
                data-finance-year-name={selectedYearName}
              >
                {selectedYearName}
              </p>
            </SceFormField>
            <SceFormField label={t("accountLabel")} htmlFor="actual-account">
              <SceToolbarSelect
                id="actual-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                aria-label={t("accountLabel")}
              >
                <option value="">{t("accountLabel")}</option>
                {snapshot.selectableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.name} · ${a.canonicalSemantic === "INCOME" ? tStructure("income.label") : tStructure("expense.label")}`}
                  </option>
                ))}
              </SceToolbarSelect>
            </SceFormField>
          </>
        ) : null}
        <SceFormField label={t("dateLabel")} htmlFor="actual-date">
          <input
            id="actual-date"
            type="date"
            className="w-full rounded-md border px-3 py-2"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </SceFormField>
        <SceFormField label={t("amountLabel")} htmlFor="actual-amount">
          <input
            id="actual-amount"
            type="text"
            inputMode="decimal"
            className="w-full rounded-md border px-3 py-2"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </SceFormField>
        <SceFormField label={t("descriptionLabel")} htmlFor="actual-description">
          <input
            id="actual-description"
            type="text"
            className="w-full rounded-md border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </SceFormField>
      </Dialog>
    </div>
  );
}

function PeriodicComparisonSection(props: {
  title: string;
  rows: PeriodicAccountRow[];
  legacyRows: VarianceAccountRow[];
  comparisonMode: ActualsWorkspaceSnapshot["comparisonMode"];
  formatMoney: (minor: number) => string;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const { title, rows, legacyRows, comparisonMode, formatMoney, t } = props;

  const columnMode =
    comparisonMode === "FULL_YEAR"
      ? "FULL_YEAR"
      : comparisonMode === "YTD"
        ? "YTD"
        : "PERIOD";

  const visiblePeriodicRows = rows.filter(
    (row) =>
      (row.periodActualMinor ?? 0) > 0 ||
      (row.ytdActualMinor ?? 0) > 0 ||
      row.approvedBudgetMinor !== null,
  );

  const visibleLegacyRows = legacyRows;

  const tableRows =
    columnMode === "FULL_YEAR" || columnMode === "YTD" ? visibleLegacyRows : visiblePeriodicRows;

  return (
    <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-surface="actual-variance-group">
      <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>{title}</h2>
      <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
        <table
          className={FINANCE_VARIANCE_COMPARISON_TABLE_CLASS}
          data-finance-variance-comparison-table
        >
          <FinanceVarianceComparisonColGroup mode={columnMode} />
          <thead>
            <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS}>
                {t("accountColumn")}
              </th>
              {columnMode === "PERIOD" ? (
                <>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("periodActualColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("ytdActualColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("annualBudgetColumn")}
                  </th>
                </>
              ) : (
                <>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("budgetColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("actualColumn")}
                  </th>
                </>
              )}
              {comparisonMode === "FULL_YEAR" ? (
                <>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("deltaColumn")}
                  </th>
                  <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                    {t("favorabilityColumn")}
                  </th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {columnMode === "PERIOD"
              ? (tableRows as PeriodicAccountRow[]).map((row) => (
                  <tr key={row.accountId} className={FINANCE_TABLE_ROW_CLASS}>
                    <td className={FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS}>
                      {row.accountName}
                    </td>
                    <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                      {row.periodActualMinor !== null && row.periodActualMinor > 0
                        ? formatMoney(row.periodActualMinor)
                        : t("noActual")}
                    </td>
                    <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                      {row.ytdActualMinor !== null && row.ytdActualMinor > 0
                        ? formatMoney(row.ytdActualMinor)
                        : t("noActual")}
                    </td>
                    <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                      {row.approvedBudgetMinor !== null
                        ? formatMoney(row.approvedBudgetMinor)
                        : t("noBudget")}
                    </td>
                  </tr>
                ))
              : (tableRows as VarianceAccountRow[]).map((row) => {
                  const hasComparison = row.metrics.rawDeltaMinor !== null;
                  const varianceSemanticClass = financeVarianceComparisonSemanticTextClass({
                    favorability: row.metrics.favorability,
                    hasComparison,
                  });

                  return (
                    <tr key={row.accountId} className={FINANCE_TABLE_ROW_CLASS}>
                      <td className={FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS}>
                        {row.accountName}
                      </td>
                      <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                        {row.metrics.approvedBudgetMinor !== null
                          ? formatMoney(row.metrics.approvedBudgetMinor)
                          : t("noBudget")}
                      </td>
                      <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                        {row.metrics.hasActual
                          ? formatMoney(row.metrics.actualMinor ?? 0)
                          : t("noActual")}
                      </td>
                      {comparisonMode === "FULL_YEAR" ? (
                        <>
                          <td
                            className={cn(
                              FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
                              varianceSemanticClass,
                            )}
                            data-finance-variance-delta
                            data-finance-variance-favorability={
                              hasComparison ? row.metrics.favorability : undefined
                            }
                          >
                            {hasComparison ? formatMoney(row.metrics.rawDeltaMinor!) : "—"}
                          </td>
                          <td
                            className={cn(
                              FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
                              varianceSemanticClass,
                            )}
                            data-finance-variance-assessment
                            data-finance-variance-favorability={
                              hasComparison ? row.metrics.favorability : undefined
                            }
                          >
                            {hasComparison && row.metrics.favorability
                              ? t(financeVarianceFavorabilityLabelKey(row.metrics.favorability))
                              : "—"}
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

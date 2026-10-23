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
import type { ActualsWorkspaceSnapshot } from "@/lib/finance/services/finance-actual-query-service";
import {
  createActualEntryAction,
  deleteActualEntryAction,
  updateActualEntryAction,
} from "@/app/(admin)/dashboard/finance/actuals/actions";
import {
  FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_ACCOUNT_CLASS,
  FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS,
  FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS,
  FINANCE_VARIANCE_COMPARISON_TABLE_CLASS,
  FinanceVarianceComparisonColGroup,
} from "@/lib/finance/presentation/finance-variance-comparison-table-layout";
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

  const selectedYearName = years.find((y) => y.id === selectedYearId)?.name ?? "";

  const formatMoney = (minor: number) =>
    baseCurrency
      ? formatBudgetPlanningMinor(minor, baseCurrency, formattingLocale)
      : String(minor);

  function pushContext(next: { yearId?: string; mode?: "FULL_YEAR" | "YTD" }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.yearId) params.set("yearId", next.yearId);
    if (next.mode === "YTD") params.set("mode", "ytd");
    else if (next.mode === "FULL_YEAR") params.delete("mode");
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

  function renderCaptureActualButton(attrs?: { context: "toolbar" | "entries-header" | "empty" }) {
    if (!canMutate) return null;
    const dataAttr =
      attrs?.context === "entries-header"
        ? { "data-finance-actual-create-entries": true }
        : { "data-finance-actual-create": true };
    return (
      <Button
        variant="primary"
        onClick={openCreateDialog}
        disabled={pending}
        {...dataAttr}
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

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <div className={FINANCE_CONTEXT_STRIP_CLASS}>
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
        <SceSegmentedControl<"FULL_YEAR" | "YTD">
          value={comparisonMode}
          onChange={(value) => pushContext({ yearId: selectedYearId ?? undefined, mode: value })}
          options={[
            { value: "FULL_YEAR", label: t("modeFullYear") },
            { value: "YTD", label: t("modeYtd") },
          ]}
          aria-label={t("comparisonModeAria")}
        />
        {canMutate ? (
          <div className="ms-auto flex shrink-0 items-center">
            {renderCaptureActualButton({ context: "toolbar" })}
          </div>
        ) : null}
      </div>

      {!canMutate ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {comparisonMode === "YTD" && snapshot.ytdCutoffDate ? (
        <p className="text-sm text-muted-foreground">
          {t("ytdContextWithYear", {
            year: selectedYearName,
            date: formatYtdCutoffLabel(snapshot.ytdCutoffDate, formattingLocale),
          })}
        </p>
      ) : null}

      {comparisonMode === "YTD" ? (
        <p className="text-sm text-muted-foreground">
          {t("ytdBudgetReferenceWithYear", { year: selectedYearName })}
          {" · "}
          {t("ytdBudgetVarianceUnsupported")}
        </p>
      ) : null}

      {feedback ? <p role="alert">{feedback}</p> : null}

      <section className={FINANCE_SECTION_SURFACE_CLASS}>
        <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>
          {t("summaryTitleWithYear", { year: selectedYearName })}
        </h2>
        <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
          <div className={FINANCE_SUMMARY_GRID_CLASS}>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualIncome")}</p>
              <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatMoney(snapshot.variance.actualSummary.incomeMinor)}
              </p>
            </div>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualExpense")}</p>
              <p className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatMoney(snapshot.variance.actualSummary.expenseMinor)}
              </p>
            </div>
            <div>
              <p className={FINANCE_SUMMARY_LABEL_CLASS}>{t("actualResult")}</p>
              <p className={FINANCE_SUMMARY_RESULT_VALUE_CLASS}>
                {formatMoney(snapshot.variance.actualSummary.resultMinor)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {snapshot.variance.approvedBudgetVersionId ? (
        <>
          <VarianceComparisonSection
            title={t("incomeSectionWithYear", { year: selectedYearName })}
            rows={incomeComparisonRows}
            comparisonMode={comparisonMode}
            formatMoney={formatMoney}
            t={t}
          />
          <VarianceComparisonSection
            title={t("expenseSectionWithYear", { year: selectedYearName })}
            rows={expenseComparisonRows}
            comparisonMode={comparisonMode}
            formatMoney={formatMoney}
            t={t}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noApprovedBaseline")}</p>
      )}

      <section className={FINANCE_SECTION_SURFACE_CLASS}>
        <div
          className={cn(
            FINANCE_SECTION_HEADER_CLASS,
            "flex flex-wrap items-center justify-between gap-2 break-words",
          )}
        >
          <h2 className="min-w-0 flex-1 text-sm font-semibold">
            {t("entriesTitle", { year: selectedYearName })}
          </h2>
          {canMutate ? (
            <div className="shrink-0">{renderCaptureActualButton({ context: "entries-header" })}</div>
          ) : null}
        </div>
        {snapshot.entries.length === 0 ? (
          <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
            <p>{t("entriesEmpty")}</p>
            {canMutate ? (
              <div className="mt-4">{renderCaptureActualButton({ context: "empty" })}</div>
            ) : null}
          </div>
        ) : (
          <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
            <table className="w-full min-w-0 text-sm">
              <thead>
                <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
                  <th className="text-left">{t("dateColumn")}</th>
                  <th className="text-left">{t("accountColumn")}</th>
                  <th className="text-left">{t("semanticColumn")}</th>
                  <th className="text-right">{t("amountColumn")}</th>
                  <th className="text-left">{t("descriptionColumn")}</th>
                  {canMutate ? <th className="text-right">{t("actionsColumn")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((entry) => (
                  <tr key={entry.id} className={FINANCE_TABLE_ROW_CLASS}>
                    <td>{formatFinanceYearDateInputValue(entry.effectiveDate)}</td>
                    <td>{entry.account.name}</td>
                    <td>
                      {entry.account.canonicalSemantic === "INCOME"
                        ? tStructure("income.label")
                        : tStructure("expense.label")}
                    </td>
                    <td className="text-right">{formatMoney(entry.amountMinor)}</td>
                    <td>{entry.description ?? "—"}</td>
                    {canMutate ? (
                      <td className="space-x-2 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openEditDialog(entry)}>
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
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
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

function VarianceComparisonSection(props: {
  title: string;
  rows: VarianceAccountRow[];
  comparisonMode: ActualsWorkspaceSnapshot["comparisonMode"];
  formatMoney: (minor: number) => string;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const { title, rows, comparisonMode, formatMoney, t } = props;

  const columnMode = comparisonMode === "FULL_YEAR" ? "FULL_YEAR" : "YTD";

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
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                {t("budgetColumn")}
              </th>
              <th className={FINANCE_VARIANCE_COMPARISON_HEAD_NUMERIC_CLASS}>
                {t("actualColumn")}
              </th>
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
            {rows.map((row) => (
              <tr key={row.accountId} className={FINANCE_TABLE_ROW_CLASS}>
                <td className={FINANCE_VARIANCE_COMPARISON_ACCOUNT_CELL_CLASS}>{row.accountName}</td>
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
                    <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                      {row.metrics.rawDeltaMinor !== null
                        ? formatMoney(row.metrics.rawDeltaMinor)
                        : "—"}
                    </td>
                    <td className={FINANCE_VARIANCE_COMPARISON_NUMERIC_CELL_CLASS}>
                      {row.metrics.favorability ?? "—"}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

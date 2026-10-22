"use client";

import { useCallback, useMemo, useRef, useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { BudgetWorkspaceSnapshot } from "@/lib/finance/budget/budget-presentation";
import {
  budgetDraftInputFromMinor,
  formatBudgetPlanningMinor,
  formatBudgetPlanningWholeMajorNumber,
  normalizeBudgetAmountInput,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  buildBudgetDraftAmounts,
  budgetTotalsFromDraft,
  isStaleBudgetSaveResult,
  mergeBudgetDraftAmount,
  type BudgetDraftAmounts,
} from "@/lib/finance/budget/budget-draft-editing";
import {
  approveBudgetAction,
  ensureDraftBudgetAction,
  saveBudgetLineAction,
} from "@/app/(admin)/dashboard/finance/budget/actions";

type FinanceYearOption = { id: string; name: string };

type FinanceBudgetWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: BudgetWorkspaceSnapshot | null;
  baseCurrency: string | null;
  hasAccounts: boolean;
  canMutate: boolean;
  canApprove: boolean;
  selectedYearId: string | null;
};

export function FinanceBudgetWorkspacePanel({
  years,
  snapshot,
  baseCurrency,
  hasAccounts,
  canMutate,
  canApprove,
  selectedYearId,
}: FinanceBudgetWorkspacePanelProps) {
  const t = useTranslations("Finance.budget");
  const locale = useLocale();
  const router = useRouter();
  const [workspacePending, startWorkspaceTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const yearSelectId = useId();
  const currencyContextId = useId();
  const workspaceCurrency = snapshot?.currency ?? baseCurrency;

  const isApproved = snapshot?.status === "APPROVED";
  const isDraft = snapshot?.status === "DRAFT";
  const readOnly = !canMutate || isApproved;

  const incomeRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "INCOME") ?? [],
    [snapshot?.rows],
  );
  const expenseRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "EXPENSE") ?? [],
    [snapshot?.rows],
  );

  function onYearChange(yearId: string) {
    if (!yearId) return;
    router.push(`/dashboard/finance/budget?yearId=${encodeURIComponent(yearId)}`);
  }

  function runWorkspaceAction(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startWorkspaceTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setFeedback(null);
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  if (years.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface)] px-5 py-6">
        <h2 className="text-base font-semibold">{t("noYearTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noYearBody")}</p>
        <div className="mt-4">
          <Link
            href="/dashboard/finance/settings"
            className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t("openSetup")}
          </Link>
        </div>
      </section>
    );
  }

  if (!hasAccounts) {
    return (
      <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface)] px-5 py-6">
        <h2 className="text-base font-semibold">{t("noAccountsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noAccountsBody")}</p>
        <div className="mt-4">
          <Link
            href="/dashboard/finance/structure"
            className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t("openStructure")}
          </Link>
        </div>
      </section>
    );
  }

  const yearSelected = Boolean(selectedYearId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <SceFormField label={t("yearLabel")} htmlFor={yearSelectId}>
            <select
              id={yearSelectId}
              className="min-w-[12rem] rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
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
            </select>
          </SceFormField>

          {yearSelected ? (
            workspaceCurrency ? (
              <SceFormField label={t("currencyLabel")} htmlFor={currencyContextId}>
                <p
                  id={currencyContextId}
                  className="min-h-[2.375rem] rounded-md border border-transparent px-0 py-2 text-sm font-medium"
                  data-budget-currency={workspaceCurrency}
                >
                  {workspaceCurrency}
                </p>
              </SceFormField>
            ) : (
              <div className="max-w-md pb-2 text-sm text-[var(--muted)]">
                <p>{t("currencyUnsetHint")}</p>
                <Link href="/dashboard/finance/settings" className="font-medium underline">
                  {t("openSetup")}
                </Link>
              </div>
            )
          ) : null}
        </div>

        {isApproved ? (
          <p className="text-sm text-[var(--muted)]" data-budget-status="approved">
            {t("approvedBaselineHint", {
              date: snapshot?.approvedAt
                ? new Date(snapshot.approvedAt).toLocaleDateString()
                : "—",
              approver: snapshot?.approvedByLabel ?? "—",
            })}
          </p>
        ) : null}
      </div>

      {!yearSelected ? (
        <p className="text-sm text-[var(--muted)]">{t("selectYearHint")}</p>
      ) : null}

      {!canMutate && !isApproved && yearSelected ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {yearSelected && !snapshot?.versionId && canMutate && selectedYearId ? (
        <div className="rounded-xl border border-dashed border-[var(--sce-color-border-standard)] px-5 py-6">
          <h2 className="text-base font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Button
            className="mt-4"
            disabled={workspacePending}
            onClick={() => runWorkspaceAction(() => ensureDraftBudgetAction(selectedYearId))}
          >
            {t("startDraft")}
          </Button>
        </div>
      ) : null}

      {yearSelected && snapshot?.versionId ? (
        <BudgetWorkspaceEditor
          key={`${selectedYearId}:${snapshot.versionId}`}
          snapshot={snapshot}
          workspaceCurrency={workspaceCurrency}
          incomeRows={incomeRows}
          expenseRows={expenseRows}
          locale={locale}
          readOnly={readOnly}
          isDraft={isDraft}
          canApprove={canApprove}
          workspacePending={workspacePending}
          onApproveBlocked={() => setFeedback(t("approveBlockedPendingSave"))}
          onApprove={() => {
            if (!snapshot?.versionId) return;
            runWorkspaceAction(() => approveBudgetAction(snapshot.versionId!));
          }}
        />
      ) : null}
    </div>
  );
}

function BudgetWorkspaceEditor(props: {
  snapshot: BudgetWorkspaceSnapshot;
  workspaceCurrency: string | null;
  incomeRows: BudgetWorkspaceSnapshot["rows"];
  expenseRows: BudgetWorkspaceSnapshot["rows"];
  locale: string;
  readOnly: boolean;
  isDraft: boolean;
  canApprove: boolean;
  workspacePending: boolean;
  onApproveBlocked: () => void;
  onApprove: () => void;
}) {
  const t = useTranslations("Finance.budget");
  const [draftAmounts, setDraftAmounts] = useState<BudgetDraftAmounts>(() =>
    buildBudgetDraftAmounts(props.snapshot.rows),
  );
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [approveOpen, setApproveOpen] = useState(false);
  const dirtyAccountIdsRef = useRef(new Set<string>());
  const saveGenerationRef = useRef(new Map<string, number>());
  const pendingSavePromisesRef = useRef(new Set<Promise<void>>());
  const localTotals = useMemo(
    () => budgetTotalsFromDraft(props.snapshot.rows, draftAmounts),
    [props.snapshot.rows, draftAmounts],
  );

  const persistLine = useCallback(
    async (accountId: string, amountMinor: number) => {
      const versionId = props.snapshot.versionId;
      if (!versionId || props.readOnly) return;
      const nextGen = (saveGenerationRef.current.get(accountId) ?? 0) + 1;
      saveGenerationRef.current.set(accountId, nextGen);

      const savePromise = (async () => {
        const result = await saveBudgetLineAction({
          budgetVersionId: versionId,
          financialAccountId: accountId,
          amountMinor,
        });
        if (isStaleBudgetSaveResult(accountId, nextGen, saveGenerationRef.current)) {
          return;
        }
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
      })();

      pendingSavePromisesRef.current.add(savePromise);
      await savePromise.finally(() => {
        pendingSavePromisesRef.current.delete(savePromise);
      });
    },
    [props.readOnly, props.snapshot.versionId],
  );

  const flushPendingLineSaves = useCallback(async () => {
    await Promise.all([...pendingSavePromisesRef.current]);
  }, []);

  const flushDirtyDraftsToServer = useCallback(
    async (amounts: BudgetDraftAmounts) => {
      const dirtyIds = [...dirtyAccountIdsRef.current];
      for (const accountId of dirtyIds) {
        const amountMinor = amounts[accountId];
        if (amountMinor !== null) {
          await persistLine(accountId, amountMinor);
        }
      }
    },
    [persistLine],
  );

  const ensurePersistedForApproval = useCallback(async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    await flushDirtyDraftsToServer(draftAmounts);
    await flushPendingLineSaves();
    return dirtyAccountIdsRef.current.size === 0;
  }, [draftAmounts, flushDirtyDraftsToServer, flushPendingLineSaves]);

  const updateLocalDraftAmount = useCallback((accountId: string, amountMinor: number | null) => {
    setDraftAmounts((prev) => mergeBudgetDraftAmount(prev, accountId, amountMinor));
    dirtyAccountIdsRef.current.add(accountId);
  }, []);

  const persistDraftAmount = useCallback(
    (accountId: string, amountMinor: number | null) => {
      updateLocalDraftAmount(accountId, amountMinor);
      if (amountMinor !== null) {
        void persistLine(accountId, amountMinor);
      }
    },
    [persistLine, updateLocalDraftAmount],
  );

  return (
    <>
      <BudgetSection
        title={t("incomeSection")}
        rows={props.incomeRows}
        currency={props.workspaceCurrency}
        locale={props.locale}
        readOnly={props.readOnly}
        draftAmounts={draftAmounts}
        lineErrors={lineErrors}
        onLocalDraftChange={updateLocalDraftAmount}
        onPersist={persistDraftAmount}
      />
      <BudgetSection
        title={t("expenseSection")}
        rows={props.expenseRows}
        currency={props.workspaceCurrency}
        locale={props.locale}
        readOnly={props.readOnly}
        draftAmounts={draftAmounts}
        lineErrors={lineErrors}
        onLocalDraftChange={updateLocalDraftAmount}
        onPersist={persistDraftAmount}
      />

      <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface-2)] px-4 py-3 text-sm">
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-[var(--muted)]">{t("totalIncome")}</dt>
            <dd className="font-medium">
              {formatBudgetPlanningMinor(
                localTotals.totalIncomeMinor,
                props.workspaceCurrency,
                props.locale,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{t("totalExpense")}</dt>
            <dd className="font-medium">
              {formatBudgetPlanningMinor(
                localTotals.totalExpenseMinor,
                props.workspaceCurrency,
                props.locale,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{t("plannedResult")}</dt>
            <dd className="font-medium">
              {formatBudgetPlanningMinor(
                localTotals.resultMinor,
                props.workspaceCurrency,
                props.locale,
              )}
            </dd>
          </div>
        </dl>
      </section>

      {props.isDraft && props.canApprove ? (
        <div className="flex justify-end">
          <Button
            disabled={props.workspacePending}
            onClick={async () => {
              const ready = await ensurePersistedForApproval();
              if (!ready) {
                props.onApproveBlocked();
                return;
              }
              setApproveOpen(true);
            }}
          >
            {t("approveAction")}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={t("approveDialogTitle")}
        description={t("approveDialogBody")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={props.workspacePending}
              onClick={() => {
                void (async () => {
                  setApproveOpen(false);
                  const ready = await ensurePersistedForApproval();
                  if (!ready) {
                    props.onApproveBlocked();
                    return;
                  }
                  props.onApprove();
                })();
              }}
            >
              {t("approveConfirm")}
            </Button>
          </div>
        }
      />
    </>
  );
}

function BudgetSection(props: {
  title: string;
  rows: BudgetWorkspaceSnapshot["rows"];
  currency: string | null;
  locale: string;
  readOnly: boolean;
  draftAmounts: BudgetDraftAmounts;
  lineErrors: Record<string, string>;
  onLocalDraftChange: (accountId: string, amountMinor: number | null) => void;
  onPersist: (accountId: string, amountMinor: number | null) => void;
}) {
  const t = useTranslations("Finance.budget");

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--sce-color-border-standard)]">
      <h2 className="border-b border-[var(--sce-color-border-standard)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold">
        {props.title}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--sce-color-border-standard)] text-left text-[var(--muted)]">
            <th className="px-4 py-2 font-medium">{t("accountColumn")}</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">{t("groupColumn")}</th>
            <th className="px-4 py-2 font-medium">{t("plannedColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <BudgetAmountRow
              key={row.accountId}
              row={row}
              currency={props.currency}
              locale={props.locale}
              readOnly={props.readOnly}
              amountMinor={
                Object.prototype.hasOwnProperty.call(props.draftAmounts, row.accountId)
                  ? props.draftAmounts[row.accountId]!
                  : row.amountMinor
              }
              lineError={props.lineErrors[row.accountId]}
              onLocalDraftChange={props.onLocalDraftChange}
              onPersist={props.onPersist}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function BudgetAmountRow(props: {
  row: BudgetWorkspaceSnapshot["rows"][number];
  currency: string | null;
  locale: string;
  readOnly: boolean;
  amountMinor: number | null;
  lineError: string | undefined;
  onLocalDraftChange: (accountId: string, amountMinor: number | null) => void;
  onPersist: (accountId: string, amountMinor: number | null) => void;
}) {
  const t = useTranslations("Finance.budget");
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const [editValue, setEditValue] = useState(() => budgetDraftInputFromMinor(props.amountMinor));

  const displayValue = focused
    ? editValue
    : props.amountMinor !== null
      ? formatBudgetPlanningWholeMajorNumber(props.amountMinor, props.locale)
      : "";

  return (
    <tr
      className={cn(
        "border-b border-[var(--border)]/60 last:border-0",
        props.row.lifecycle === "ARCHIVED" && "opacity-75",
      )}
    >
      <td className="px-4 py-2">
        <span className="font-medium">{props.row.accountName}</span>
        {props.row.lifecycle === "ARCHIVED" ? (
          <span className="ms-2 text-xs text-[var(--muted)]">({t("archivedAccount")})</span>
        ) : null}
      </td>
      <td className="hidden px-4 py-2 text-[var(--muted)] sm:table-cell">
        {props.row.reportingGroupName}
      </td>
      <td className="px-4 py-2">
        {props.readOnly ? (
          <span>
            {props.amountMinor !== null
              ? formatBudgetPlanningMinor(props.amountMinor, props.currency, props.locale)
              : "—"}
          </span>
        ) : (
          <div className="space-y-1">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              aria-label={t("plannedAmountLabel", { account: props.row.accountName })}
              aria-invalid={props.lineError ? true : undefined}
              className="w-full max-w-[10rem] rounded-md border border-[var(--sce-color-border-standard)] px-2 py-1.5 text-sm"
              value={displayValue}
              onFocus={() => {
                setFocused(true);
                setEditValue(budgetDraftInputFromMinor(props.amountMinor));
              }}
              onChange={(e) => {
                const next = normalizeBudgetAmountInput(e.target.value);
                setEditValue(next);
                if (next === "") {
                  props.onLocalDraftChange(props.row.accountId, null);
                  return;
                }
                const minor = parseBudgetInputToMinor(next);
                if (minor !== null) {
                  props.onLocalDraftChange(props.row.accountId, minor);
                }
              }}
              onBlur={() => {
                setFocused(false);
                if (editValue.trim() === "") {
                  props.onLocalDraftChange(props.row.accountId, null);
                  return;
                }
                const minor = parseBudgetInputToMinor(editValue);
                if (minor === null) return;
                props.onPersist(props.row.accountId, minor);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />
            {props.lineError ? (
              <p className="text-xs text-[var(--destructive)]" role="alert">
                {props.lineError}
              </p>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}

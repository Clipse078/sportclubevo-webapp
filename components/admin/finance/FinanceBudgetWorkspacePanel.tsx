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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
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
  countFailedBudgetLineSaves,
  deriveBudgetWorkspacePersistencePhase,
  type BudgetWorkspacePersistencePhase,
} from "@/lib/finance/budget/budget-workspace-persistence";
import type { BudgetReadinessIssueCode } from "@/lib/finance/budget/budget-approval-readiness";
import {
  approveBudgetAction,
  createAnnualBudgetAction,
  saveBudgetLineAction,
  startWorkingRevisionAction,
  type CreateAnnualBudgetActionResult,
} from "@/app/(admin)/dashboard/finance/budget/actions";
import type { AnnualBudgetCreationContext } from "@/lib/finance/services/finance-annual-budget-service";
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

type FinanceBudgetWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: BudgetWorkspaceSnapshot | null;
  baseCurrency: string | null;
  hasAccounts: boolean;
  canMutate: boolean;
  canApprove: boolean;
  selectedYearId: string | null;
  formattingLocale: string;
  annualCreation: AnnualBudgetCreationContext | null;
};

export function FinanceBudgetWorkspacePanel({
  years,
  snapshot,
  baseCurrency,
  hasAccounts,
  canMutate,
  canApprove,
  selectedYearId,
  formattingLocale,
  annualCreation,
}: FinanceBudgetWorkspacePanelProps) {
  const t = useTranslations("Finance.budget");
  const router = useRouter();
  const [workspacePending, startWorkspaceTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"EMPTY" | "COPY_FROM_PRIOR">("EMPTY");
  const [copySourceYearId, setCopySourceYearId] = useState<string>("");
  const [persistencePhase, setPersistencePhase] =
    useState<BudgetWorkspacePersistencePhase>("hidden");
  const yearSelectId = useId();
  const currencyContextId = useId();
  const workspaceCurrency = snapshot?.currency ?? baseCurrency;

  const isApprovedOnly = snapshot?.status === "APPROVED";
  const isWorkingRevision = snapshot?.status === "WORKING_REVISION";
  const isDraft = snapshot?.status === "DRAFT";
  const readOnly = !canMutate || isApprovedOnly;

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
    setCreateSuccess(null);
    router.push(`/dashboard/finance/budget?yearId=${encodeURIComponent(yearId)}`);
  }

  const copySources = annualCreation?.eligibleCopySources ?? [];
  const defaultCopySourceId = annualCreation?.defaultCopySourceFinanceYearId ?? null;
  const canChoosePriorCopy = copySources.length > 0;
  const selectedYearName =
    years.find((y) => y.id === selectedYearId)?.name ?? snapshot?.financeYearName ?? "";

  useEffect(() => {
    if (!createDialogOpen) return;
    setCreationMode("EMPTY");
    setCopySourceYearId(
      annualCreation?.defaultCopySourceFinanceYearId ??
        annualCreation?.eligibleCopySources[0]?.financeYearId ??
        "",
    );
  }, [createDialogOpen, annualCreation]);

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

  function runCreateAnnualBudget() {
    if (!selectedYearId) return;
    startWorkspaceTransition(async () => {
      const result: CreateAnnualBudgetActionResult = await createAnnualBudgetAction({
        targetFinanceYearId: selectedYearId,
        mode: creationMode,
        sourceFinanceYearId:
          creationMode === "COPY_FROM_PRIOR" ? copySourceYearId || undefined : undefined,
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback(null);
      setCreateDialogOpen(false);
      if (result.summary.mode === "EMPTY") {
        setCreateSuccess(t("createSuccessEmpty", { year: selectedYearName }));
      } else {
        const income = formatBudgetPlanningMinor(
          result.summary.totalIncomeMinor,
          workspaceCurrency,
          formattingLocale,
        );
        const expense = formatBudgetPlanningMinor(
          result.summary.totalExpenseMinor,
          workspaceCurrency,
          formattingLocale,
        );
        const base = t("createSuccessCopy", {
          year: selectedYearName,
          count: result.summary.copiedLineCount,
          income,
          expense,
        });
        const excluded =
          result.summary.excludedArchivedLineCount > 0
            ? t("createSuccessCopyExcluded", {
                count: result.summary.excludedArchivedLineCount,
              })
            : "";
        setCreateSuccess(excluded ? `${base} ${excluded}` : base);
      }
      router.refresh();
    });
  }

  const creationModeOptions = useMemo(() => {
    const options: Array<{ value: "EMPTY" | "COPY_FROM_PRIOR"; label: string }> = [
      { value: "EMPTY", label: t("createModeEmpty") },
    ];
    if (canChoosePriorCopy) {
      options.push({ value: "COPY_FROM_PRIOR", label: t("createModeCopy") });
    }
    return options;
  }, [canChoosePriorCopy, t]);

  if (years.length === 0) {
    return (
      <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="prerequisite">
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
      </div>
    );
  }

  if (!hasAccounts) {
    return (
      <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="prerequisite">
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
      </div>
    );
  }

  const yearSelected = Boolean(selectedYearId);

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <div className={FINANCE_CONTEXT_STRIP_CLASS} data-finance-surface="context">
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

        {yearSelected ? (
          workspaceCurrency ? (
            <SceFormField label={t("currencyLabel")} htmlFor={currencyContextId}>
              <p
                id={currencyContextId}
                className={FINANCE_CURRENCY_CONTEXT_CLASS}
                data-budget-currency={workspaceCurrency}
                aria-readonly="true"
              >
                {workspaceCurrency}
              </p>
            </SceFormField>
          ) : (
            <div className="max-w-md pb-1 text-sm text-[var(--muted)]">
              <p>{t("currencyUnsetHint")}</p>
              <Link href="/dashboard/finance/settings" className="font-medium underline">
                {t("openSetup")}
              </Link>
            </div>
          )
        ) : null}

        {snapshot?.status && snapshot.status !== "NONE" ? (
          <div className="ms-auto flex max-w-md flex-col items-end gap-0.5 text-end">
            <p className="text-sm text-[var(--muted)]" data-budget-status={snapshot.status}>
              {t(`status.${snapshot.status}`)}
            </p>
            {persistencePhase !== "hidden" ? (
              <FinanceBudgetPersistenceIndicator phase={persistencePhase} />
            ) : null}
          </div>
        ) : persistencePhase !== "hidden" ? (
          <div className="ms-auto text-end">
            <FinanceBudgetPersistenceIndicator phase={persistencePhase} />
          </div>
        ) : null}
      </div>

      {!yearSelected ? (
        <p className="text-sm text-[var(--muted)]">{t("selectYearHint")}</p>
      ) : null}

      {!canMutate && !isApprovedOnly && yearSelected ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {yearSelected && isApprovedOnly && canMutate && selectedYearId ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="revision-start">
          <h2 className="text-base font-semibold">{t("revisionStartTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("revisionStartBody")}</p>
          <Button
            className="mt-4"
            disabled={workspacePending}
            onClick={() =>
              runWorkspaceAction(() => startWorkingRevisionAction(selectedYearId))
            }
          >
            {t("revisionStartAction")}
          </Button>
        </section>
      ) : null}

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {createSuccess ? (
        <p className="text-sm text-[var(--muted)]" role="status">
          {createSuccess}
        </p>
      ) : null}

      {yearSelected && !snapshot?.versionId && canMutate && selectedYearId ? (
        <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS} data-finance-surface="empty-draft">
          <h2 className="text-base font-semibold">
            {t("emptyTitle", { year: selectedYearName })}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Button
            className="mt-4"
            disabled={workspacePending}
            onClick={() => {
              setCreateSuccess(null);
              setCreateDialogOpen(true);
            }}
          >
            {t("createBudgetAction")}
          </Button>
        </div>
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
            <Button
              disabled={
                workspacePending ||
                (creationMode === "COPY_FROM_PRIOR" && !copySourceYearId)
              }
              onClick={runCreateAnnualBudget}
            >
              {t("createBudgetConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <SceFormField label={t("createModeLabel")}>
            <SceSegmentedControl
              aria-label={t("createModeLabel")}
              options={creationModeOptions}
              value={creationMode}
              onChange={setCreationMode}
              disabled={workspacePending}
            />
          </SceFormField>

          {creationMode === "COPY_FROM_PRIOR" && canChoosePriorCopy ? (
            <SceFormField label={t("copySourceLabel")} htmlFor="annual-budget-copy-source">
              <SceToolbarSelect
                id="annual-budget-copy-source"
                value={copySourceYearId}
                onChange={(e) => setCopySourceYearId(e.target.value)}
                disabled={workspacePending}
              >
                {copySources.map((source) => (
                  <option key={source.financeYearId} value={source.financeYearId}>
                    {t("copySourceOption", { year: source.financeYearName })}
                  </option>
                ))}
              </SceToolbarSelect>
            </SceFormField>
          ) : null}

          {creationMode === "COPY_FROM_PRIOR" && !canChoosePriorCopy ? (
            <p className="text-sm text-[var(--muted)]">{t("copySourceUnavailable")}</p>
          ) : null}
        </div>
      </Dialog>

      {yearSelected && snapshot?.versionId ? (
        <BudgetWorkspaceEditor
          key={`${selectedYearId}:${snapshot.versionId}`}
          snapshot={snapshot}
          workspaceCurrency={workspaceCurrency}
          incomeRows={incomeRows}
          expenseRows={expenseRows}
          formattingLocale={formattingLocale}
          readOnly={readOnly}
          isDraft={isDraft || isWorkingRevision}
          canApprove={canApprove}
          workspacePending={workspacePending}
          onPersistencePhaseChange={setPersistencePhase}
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

function FinanceBudgetPersistenceIndicator({
  phase,
}: {
  phase: Exclude<BudgetWorkspacePersistencePhase, "hidden">;
}) {
  const t = useTranslations("Finance.budget.persistence");
  const isError = phase === "error";
  return (
    <p
      className={cn(
        FINANCE_BUDGET_PERSISTENCE_INDICATOR_CLASS,
        isError && "text-[var(--destructive)]",
      )}
      data-budget-persistence={phase}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {t(phase)}
    </p>
  );
}

function BudgetWorkspaceEditor(props: {
  snapshot: BudgetWorkspaceSnapshot;
  workspaceCurrency: string | null;
  incomeRows: BudgetWorkspaceSnapshot["rows"];
  expenseRows: BudgetWorkspaceSnapshot["rows"];
  formattingLocale: string;
  readOnly: boolean;
  isDraft: boolean;
  canApprove: boolean;
  workspacePending: boolean;
  onPersistencePhaseChange: (phase: BudgetWorkspacePersistencePhase) => void;
  onApproveBlocked: () => void;
  onApprove: () => void;
}) {
  const t = useTranslations("Finance.budget");
  const [draftAmounts, setDraftAmounts] = useState<BudgetDraftAmounts>(() =>
    buildBudgetDraftAmounts(props.snapshot.rows),
  );
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [dirtyAccountCount, setDirtyAccountCount] = useState(0);
  const [inFlightSaveCount, setInFlightSaveCount] = useState(0);
  const [approveOpen, setApproveOpen] = useState(false);
  const dirtyAccountIdsRef = useRef(new Set<string>());
  const saveGenerationRef = useRef(new Map<string, number>());
  const pendingSavePromisesRef = useRef(new Set<Promise<void>>());

  const syncDirtyAccountCount = useCallback(() => {
    setDirtyAccountCount(dirtyAccountIdsRef.current.size);
  }, []);

  const persistencePhase = useMemo(
    () =>
      deriveBudgetWorkspacePersistencePhase({
        editable: !props.readOnly,
        dirtyAccountCount,
        inFlightSaveCount,
        failedLineSaveCount: countFailedBudgetLineSaves(lineErrors),
      }),
    [props.readOnly, dirtyAccountCount, inFlightSaveCount, lineErrors],
  );

  useEffect(() => {
    props.onPersistencePhaseChange(persistencePhase);
  }, [persistencePhase, props.onPersistencePhaseChange]);

  useEffect(
    () => () => {
      props.onPersistencePhaseChange("hidden");
    },
    [props.onPersistencePhaseChange],
  );
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

      setInFlightSaveCount((count) => count + 1);
      const savePromise = (async () => {
        try {
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
            syncDirtyAccountCount();
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
          setInFlightSaveCount((count) => Math.max(0, count - 1));
        }
      })();

      pendingSavePromisesRef.current.add(savePromise);
      await savePromise.finally(() => {
        pendingSavePromisesRef.current.delete(savePromise);
      });
    },
    [props.readOnly, props.snapshot.versionId, syncDirtyAccountCount],
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

  const updateLocalDraftAmount = useCallback(
    (accountId: string, amountMinor: number | null) => {
      setDraftAmounts((prev) => mergeBudgetDraftAmount(prev, accountId, amountMinor));
      dirtyAccountIdsRef.current.add(accountId);
      syncDirtyAccountCount();
    },
    [syncDirtyAccountCount],
  );

  const persistDraftAmount = useCallback(
    (accountId: string, amountMinor: number | null) => {
      updateLocalDraftAmount(accountId, amountMinor);
      if (amountMinor !== null) {
        void persistLine(accountId, amountMinor);
      }
    },
    [persistLine, updateLocalDraftAmount],
  );

  const readinessIssues = props.snapshot.approvalReadiness?.issues ?? [];
  const canApproveByReadiness = props.snapshot.approvalReadiness?.canApprove ?? true;

  return (
    <>
      {props.snapshot.approvedBaseline && props.snapshot.status === "WORKING_REVISION" ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="baseline">
          <h2 className="text-base font-semibold">{t("governanceBaselineTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t("governanceBaselineHint", {
              version: props.snapshot.approvedBaseline.versionNumber,
              date: props.snapshot.approvedBaseline.approvedAt
                ? new Date(props.snapshot.approvedBaseline.approvedAt).toLocaleDateString()
                : "—",
              approver: props.snapshot.approvedBaseline.approvedByLabel ?? "—",
            })}
          </p>
          <dl className={cn(FINANCE_SUMMARY_GRID_CLASS, "mt-4")}>
            <div>
              <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("totalIncome")}</dt>
              <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatBudgetPlanningMinor(
                  props.snapshot.approvedBaseline.totals.totalIncomeMinor,
                  props.snapshot.approvedBaseline.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
            <div>
              <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("totalExpense")}</dt>
              <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
                {formatBudgetPlanningMinor(
                  props.snapshot.approvedBaseline.totals.totalExpenseMinor,
                  props.snapshot.approvedBaseline.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
            <div>
              <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("plannedResult")}</dt>
              <dd className={FINANCE_SUMMARY_RESULT_VALUE_CLASS}>
                {formatBudgetPlanningMinor(
                  props.snapshot.approvedBaseline.totals.resultMinor,
                  props.snapshot.approvedBaseline.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[var(--muted)]">{t("workingRevisionHint")}</p>
        </section>
      ) : null}

      {props.isDraft &&
      props.canApprove &&
      props.snapshot.approvalReadiness &&
      props.snapshot.approvalMode ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="readiness">
          <h2 className="text-base font-semibold">
            {props.snapshot.approvalMode === "REBASELINE"
              ? t("rebaselineReadinessTitle")
              : t("readinessTitle")}
          </h2>
          {canApproveByReadiness ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {props.snapshot.approvalMode === "REBASELINE"
                ? t("rebaselineReadinessReady")
                : t("readinessReady")}
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--muted)]">
              {readinessIssues
                .filter((issue) => issue.severity === "blocker")
                .map((issue) => (
                  <li key={issue.code}>
                    {t(`readinessIssue.${issue.code}` as `readinessIssue.${BudgetReadinessIssueCode}`)}
                  </li>
                ))}
            </ul>
          )}
          {readinessIssues.some((issue) => issue.severity === "warning") ? (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--muted)]">
              {readinessIssues
                .filter((issue) => issue.severity === "warning")
                .map((issue) => (
                  <li key={issue.code}>
                    {t(`readinessIssue.${issue.code}` as `readinessIssue.${BudgetReadinessIssueCode}`)}
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {props.snapshot.versionHistory.length > 0 ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-surface="version-history">
          <h2 className="text-base font-semibold">{t("versionHistoryTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {props.snapshot.versionHistory.map((entry) => (
              <li
                key={entry.versionId}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--sce-surface-border-subtle)] pb-2 last:border-0"
              >
                <span>
                  {t("versionHistoryEntry", { number: entry.versionNumber })}{" "}
                  <span className="text-[var(--muted)]">
                    {entry.status === "APPROVED" ? t("versionApproved") : t("versionDraft")}
                  </span>
                  {entry.isCurrentBaseline ? (
                    <span className="ms-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("currentBaselineBadge")}
                    </span>
                  ) : entry.isHistoricalApproved ? (
                    <span className="ms-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("historicalApprovedBadge")}
                    </span>
                  ) : null}
                </span>
                {entry.approvedAt ? (
                  <span className="text-[var(--muted)]">
                    {new Date(entry.approvedAt).toLocaleDateString()}
                    {entry.approvedByLabel ? ` · ${entry.approvedByLabel}` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BudgetSection
        title={t("incomeSection")}
        rows={props.incomeRows}
        currency={props.workspaceCurrency}
        formattingLocale={props.formattingLocale}
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
        formattingLocale={props.formattingLocale}
        readOnly={props.readOnly}
        draftAmounts={draftAmounts}
        lineErrors={lineErrors}
        onLocalDraftChange={updateLocalDraftAmount}
        onPersist={persistDraftAmount}
      />

      <section
        className={FINANCE_SUMMARY_SURFACE_CLASS}
        data-finance-surface="summary"
        data-budget-editable-scope={
          props.snapshot.status === "WORKING_REVISION"
            ? "working-revision"
            : props.snapshot.status === "DRAFT"
              ? "draft"
              : undefined
        }
      >
        {props.snapshot.status === "WORKING_REVISION" ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("workingRevisionTotalsScope")}
          </p>
        ) : props.snapshot.status === "DRAFT" ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("draftTotalsScope")}
          </p>
        ) : null}
        <dl className={FINANCE_SUMMARY_GRID_CLASS}>
          <div>
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("totalIncome")}</dt>
            <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
              {formatBudgetPlanningMinor(
                localTotals.totalIncomeMinor,
                props.workspaceCurrency,
                props.formattingLocale,
              )}
            </dd>
          </div>
          <div>
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("totalExpense")}</dt>
            <dd className={FINANCE_SUMMARY_VALUE_CLASS}>
              {formatBudgetPlanningMinor(
                localTotals.totalExpenseMinor,
                props.workspaceCurrency,
                props.formattingLocale,
              )}
            </dd>
          </div>
          <div className="sm:border-s sm:border-[var(--sce-surface-border-subtle)] sm:ps-4">
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{t("plannedResult")}</dt>
            <dd className={FINANCE_SUMMARY_RESULT_VALUE_CLASS} data-budget-summary="result">
              {formatBudgetPlanningMinor(
                localTotals.resultMinor,
                props.workspaceCurrency,
                props.formattingLocale,
              )}
            </dd>
          </div>
        </dl>
      </section>

      {props.isDraft &&
      props.canApprove &&
      props.snapshot.approvalMode &&
      (props.snapshot.approvalMode === "FIRST_APPROVAL"
        ? !props.snapshot.approvedBaseline
        : props.snapshot.approvedBaseline) ? (
        <div className="flex justify-end">
          <Button
            disabled={props.workspacePending || !canApproveByReadiness}
            onClick={async () => {
              const ready = await ensurePersistedForApproval();
              if (!ready) {
                props.onApproveBlocked();
                return;
              }
              setApproveOpen(true);
            }}
          >
            {props.snapshot.approvalMode === "REBASELINE"
              ? t("rebaselineAction")
              : t("approveAction")}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={
          props.snapshot.approvalMode === "REBASELINE"
            ? t("rebaselineDialogTitle")
            : t("approveDialogTitle")
        }
        description={
          props.snapshot.approvalMode === "REBASELINE"
            ? t("rebaselineDialogBody")
            : t("approveDialogBody")
        }
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
              {props.snapshot.approvalMode === "REBASELINE"
                ? t("rebaselineConfirm")
                : t("approveConfirm")}
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
  formattingLocale: string;
  readOnly: boolean;
  draftAmounts: BudgetDraftAmounts;
  lineErrors: Record<string, string>;
  onLocalDraftChange: (accountId: string, amountMinor: number | null) => void;
  onPersist: (accountId: string, amountMinor: number | null) => void;
}) {
  const t = useTranslations("Finance.budget");

  return (
    <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-surface="budget-section">
      <h2 className={FINANCE_SECTION_HEADER_CLASS}>{props.title}</h2>
      <table className="w-full min-w-0 text-sm">
        <thead>
          <tr className={FINANCE_TABLE_HEAD_ROW_CLASS}>
            <th className="px-4 py-2">{t("accountColumn")}</th>
            <th className="hidden px-4 py-2 sm:table-cell">{t("groupColumn")}</th>
            <th className="px-4 py-2 text-end">{t("plannedColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <BudgetAmountRow
              key={row.accountId}
              row={row}
              currency={props.currency}
              formattingLocale={props.formattingLocale}
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
  formattingLocale: string;
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
      ? formatBudgetPlanningWholeMajorNumber(props.amountMinor, props.formattingLocale)
      : "";

  return (
    <tr
      className={cn(
        FINANCE_TABLE_ROW_CLASS,
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
      <td className="px-4 py-2 text-end align-middle">
        {props.readOnly ? (
          <span className="inline-block min-w-[11rem] text-end tabular-nums font-medium">
            {props.amountMinor !== null
              ? formatBudgetPlanningMinor(
                  props.amountMinor,
                  props.currency,
                  props.formattingLocale,
                )
              : "—"}
          </span>
        ) : (
          <div className="ms-auto max-w-[11rem] space-y-1">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              aria-label={t("plannedAmountLabel", { account: props.row.accountName })}
              aria-invalid={props.lineError ? true : undefined}
              className={FINANCE_BUDGET_AMOUNT_INPUT_CLASS}
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

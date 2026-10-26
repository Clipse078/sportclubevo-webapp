"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { FinanceBaseCurrencySelector } from "@/components/admin/finance/FinanceBaseCurrencySelector";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  budgetDraftInputFromMinor,
  formatFinanceManagementPlanningMinor,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  financeCommitmentApprovalLabelKey,
  financeCommitmentLifecycleLabelKey,
} from "@/lib/finance/commitment/finance-commitment-status-presentation";
import type { FinanceCommitmentWorkspaceSnapshot } from "@/lib/finance/services/finance-commitment-query-service";
import type { FinanceCommitmentDetailRecord } from "@/lib/finance/services/finance-commitment-query-service";
import {
  cancelFinanceCommitmentAction,
  createFinanceCommitmentAction,
  deleteDraftFinanceCommitmentAction,
  loadFinanceCommitmentDetailAction,
  submitFinanceCommitmentAction,
  updateFinanceCommitmentAction,
} from "@/app/(admin)/dashboard/finance/commitments/actions";
import {
  FINANCE_EMPTY_DRAFT_SURFACE_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_SUMMARY_GRID_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_SURFACE_CLASS,
  FINANCE_SUMMARY_VALUE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

type AccountOption = { id: string; name: string };

type FinanceCommitmentWorkspacePanelProps = {
  snapshot: FinanceCommitmentWorkspaceSnapshot;
  accounts: AccountOption[];
  formattingLocale: string;
};

const LIFECYCLE_FILTERS = ["", "DRAFT", "SUBMITTED", "ACTIVE", "FULFILLED", "CANCELLED"] as const;
const APPROVAL_FILTERS = ["", "PENDING", "APPROVED", "REJECTED", "NOT_REQUIRED"] as const;

function mapActionError(
  t: ReturnType<typeof useTranslations>,
  result: { errorKey?: string; error: string },
): string {
  if (result.errorKey) {
    try {
      return t(result.errorKey as "errors.generic");
    } catch {
      return result.error;
    }
  }
  return result.error;
}

export function FinanceCommitmentWorkspacePanel({
  snapshot,
  accounts,
  formattingLocale,
}: FinanceCommitmentWorkspacePanelProps) {
  const t = useTranslations("Finance.commitments.workspace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceCommitmentDetailRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelPhraseInput, setCancelPhraseInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState(snapshot.baseCurrency ?? "EUR");
  const [commitmentDate, setCommitmentDate] = useState("");
  const [partyName, setPartyName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");

  const selectedYearId = snapshot.selectedYearId ?? "";
  const cancelPhrase = t("cancelPhrase");

  const formatMoney = (minor: number, cur: string) =>
    formatFinanceManagementPlanningMinor(minor, cur, formattingLocale);

  function pushFilters(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (next.page === undefined) params.delete("page");
    router.push(`/dashboard/finance/commitments?${params.toString()}`);
  }

  function resetForm() {
    setTitle("");
    setAmountInput("");
    setCurrency(snapshot.baseCurrency ?? "EUR");
    setCommitmentDate("");
    setPartyName("");
    setAccountId("");
    setExpectedPaymentDate("");
    setDescription("");
    setReference("");
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  async function openDetail(id: string) {
    setDetailId(id);
    setFeedback(null);
    const loaded = await loadFinanceCommitmentDetailAction(id);
    setDetail(loaded);
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setEditOpen(false);
    setCancelOpen(false);
    setCancelPhraseInput("");
  }

  function fillFormFromDetail(d: FinanceCommitmentDetailRecord) {
    setTitle(d.title);
    setAmountInput(budgetDraftInputFromMinor(d.amountMinor));
    setCurrency(d.currency);
    setCommitmentDate(d.commitmentDateIso);
    setPartyName(d.partyName ?? "");
    setAccountId(d.financialAccountId ?? "");
    setExpectedPaymentDate(d.expectedPaymentDateIso ?? "");
    setDescription(d.description ?? "");
    setReference(d.externalReference ?? "");
  }

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const activeAmountLabel = useMemo(() => {
    if (snapshot.summary.activeAmountMinor != null && snapshot.summary.activeAmountCurrency) {
      return t("summaryActiveAmount", {
        currency: snapshot.summary.activeAmountCurrency,
      });
    }
    if (snapshot.summary.activeCount > 0) {
      return t("summaryActiveAmountMixed");
    }
    return null;
  }, [snapshot.summary, t]);

  function handleCreate() {
    if (!selectedYearId) return;
    startTransition(async () => {
      setFeedback(null);
      const amountMinor = parseBudgetInputToMinor(amountInput);
      if (amountMinor === null || amountMinor <= 0) {
        setFeedback(t("errors.validation"));
        return;
      }
      const result = await createFinanceCommitmentAction({
        financeYearId: selectedYearId,
        title,
        amountMinor,
        currency,
        commitmentDateIso: commitmentDate,
        partyName: partyName || null,
        financialAccountId: accountId || null,
        expectedPaymentDateIso: expectedPaymentDate || null,
        description: description || null,
        externalReference: reference || null,
      });
      if (!result.ok) {
        setFeedback(mapActionError(t, result));
        return;
      }
      setCreateOpen(false);
      router.refresh();
      if (result.commitmentId) void openDetail(result.commitmentId);
    });
  }

  function handleUpdate() {
    if (!detail || !selectedYearId) return;
    startTransition(async () => {
      setFeedback(null);
      const amountMinor = parseBudgetInputToMinor(amountInput);
      if (amountMinor === null || amountMinor <= 0) {
        setFeedback(t("errors.validation"));
        return;
      }
      const result = await updateFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: selectedYearId,
        title,
        amountMinor,
        currency,
        commitmentDateIso: commitmentDate,
        partyName: partyName || null,
        financialAccountId: accountId || null,
        expectedPaymentDateIso: expectedPaymentDate || null,
        description: description || null,
        externalReference: reference || null,
      });
      if (!result.ok) {
        setFeedback(mapActionError(t, result));
        return;
      }
      setEditOpen(false);
      router.refresh();
      await openDetail(detail.id);
    });
  }

  function handleSubmit() {
    if (!detail || !selectedYearId) return;
    startTransition(async () => {
      const result = await submitFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: selectedYearId,
      });
      if (!result.ok) {
        setFeedback(mapActionError(t, result));
        return;
      }
      router.refresh();
      await openDetail(detail.id);
    });
  }

  function handleCancel() {
    if (!detail || !selectedYearId || cancelPhraseInput.trim() !== cancelPhrase) return;
    startTransition(async () => {
      const result = await cancelFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: selectedYearId,
      });
      if (!result.ok) {
        setFeedback(mapActionError(t, result));
        return;
      }
      setCancelOpen(false);
      closeDetail();
      router.refresh();
    });
  }

  function handleDeleteDraft() {
    if (!detail || !selectedYearId) return;
    startTransition(async () => {
      const result = await deleteDraftFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: selectedYearId,
      });
      if (!result.ok) {
        setFeedback(mapActionError(t, result));
        return;
      }
      closeDetail();
      router.refresh();
    });
  }

  const formFields = (
    <div className="grid gap-4">
      <SceFormField label={t("fieldTitle")} required>
        <input
          className="sce-input w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
      </SceFormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <SceFormField label={t("fieldAmount")} required>
          <input
            className="sce-input w-full tabular-nums"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            inputMode="decimal"
          />
        </SceFormField>
        <SceFormField label={t("fieldCurrency")} required>
          <FinanceBaseCurrencySelector
            value={currency}
            onChange={setCurrency}
            disabled={pending}
            ariaLabel={t("fieldCurrency")}
            placeholder={t("fieldCurrency")}
          />
        </SceFormField>
      </div>
      <SceFormField label={t("fieldCommitmentDate")} required>
        <input
          type="date"
          className="sce-input w-full"
          value={commitmentDate}
          onChange={(e) => setCommitmentDate(e.target.value)}
        />
      </SceFormField>
      <SceFormField label={t("fieldParty")}>
        <input
          className="sce-input w-full"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
        />
      </SceFormField>
      <SceFormField label={t("fieldAccount")}>
        <StaticOptionSearchablePicker
          options={accountOptions}
          value={accountId}
          onChange={setAccountId}
          placeholder={t("filterAll")}
        />
      </SceFormField>
      <SceFormField label={t("fieldExpectedPayment")}>
        <input
          type="date"
          className="sce-input w-full"
          value={expectedPaymentDate}
          onChange={(e) => setExpectedPaymentDate(e.target.value)}
        />
      </SceFormField>
      <SceFormField label={t("fieldReference")}>
        <input
          className="sce-input w-full"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </SceFormField>
      <SceFormField label={t("fieldDescription")}>
        <textarea
          className="sce-input min-h-[80px] w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </SceFormField>
    </div>
  );

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS} data-finance-commitment-workspace>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-[var(--muted)]">{t("intro")}</p>
        {snapshot.capabilities.canManage ? (
          <Button type="button" onClick={openCreate} disabled={!selectedYearId || pending}>
            {t("newAction")}
          </Button>
        ) : null}
      </div>

      <div className={FINANCE_SUMMARY_GRID_CLASS}>
        <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
          <div className={FINANCE_SUMMARY_LABEL_CLASS}>{t("summaryPending")}</div>
          <div className={FINANCE_SUMMARY_VALUE_CLASS}>{snapshot.summary.submittedPendingCount}</div>
        </div>
        <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
          <div className={FINANCE_SUMMARY_LABEL_CLASS}>{t("summaryActive")}</div>
          <div className={FINANCE_SUMMARY_VALUE_CLASS}>{snapshot.summary.activeCount}</div>
        </div>
        <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
          <div className={FINANCE_SUMMARY_LABEL_CLASS}>{t("summaryDrafts")}</div>
          <div className={FINANCE_SUMMARY_VALUE_CLASS}>{snapshot.summary.draftCount}</div>
        </div>
        {activeAmountLabel && snapshot.summary.activeAmountMinor != null ? (
          <div className={FINANCE_SUMMARY_SURFACE_CLASS}>
            <div className={FINANCE_SUMMARY_LABEL_CLASS}>{activeAmountLabel}</div>
            <div className={FINANCE_SUMMARY_VALUE_CLASS}>
              {formatMoney(
                snapshot.summary.activeAmountMinor,
                snapshot.summary.activeAmountCurrency ?? currency,
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "flex flex-col gap-3 p-4")}>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-[var(--muted)]">
            {t("filterYear")}
            <SceToolbarSelect
              value={selectedYearId}
              onChange={(e) => pushFilters({ yearId: e.target.value })}
              aria-label={t("filterYear")}
            >
              {snapshot.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </SceToolbarSelect>
          </label>
          <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-[var(--muted)]">
            {t("filterLifecycle")}
            <SceToolbarSelect
              value={snapshot.filters.lifecycleStatus ?? ""}
              onChange={(e) =>
                pushFilters({ lifecycle: e.target.value || undefined, page: "1" })
              }
              aria-label={t("filterLifecycle")}
            >
              {LIFECYCLE_FILTERS.map((value) => (
                <option key={value || "all"} value={value}>
                  {value
                    ? t(financeCommitmentLifecycleLabelKey(value))
                    : t("filterAll")}
                </option>
              ))}
            </SceToolbarSelect>
          </label>
          <label className="flex min-w-[12rem] flex-col gap-1 text-xs text-[var(--muted)]">
            {t("filterApproval")}
            <SceToolbarSelect
              value={snapshot.filters.approvalStatus ?? ""}
              onChange={(e) =>
                pushFilters({ approval: e.target.value || undefined, page: "1" })
              }
              aria-label={t("filterApproval")}
            >
              {APPROVAL_FILTERS.map((value) => (
                <option key={value || "all"} value={value}>
                  {value
                    ? t(financeCommitmentApprovalLabelKey(value))
                    : t("filterAll")}
                </option>
              ))}
            </SceToolbarSelect>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-[var(--muted)]">
            {t("filterSearch")}
            <input
              className="sce-input w-full"
              defaultValue={snapshot.filters.search ?? ""}
              placeholder={t("filterSearchPlaceholder")}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                pushFilters({ q: (e.target as HTMLInputElement).value, page: "1" });
              }}
            />
          </label>
        </div>

        {feedback ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {feedback}
          </p>
        ) : null}

        {snapshot.items.length === 0 ? (
          <div className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}>
            <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("emptyTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("emptyBody")}</p>
            {snapshot.capabilities.canManage ? (
              <Button type="button" className="mt-4" onClick={openCreate} disabled={!selectedYearId}>
                {t("newAction")}
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--sce-color-border-standard)]">
            {snapshot.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 px-1 py-3 text-left transition-colors hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => void openDetail(item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                      <span>{t(financeCommitmentLifecycleLabelKey(item.lifecycleStatus))}</span>
                      {item.approvalStatus === "PENDING" ? (
                        <span>{t(financeCommitmentApprovalLabelKey(item.approvalStatus))}</span>
                      ) : null}
                      {item.partyName ? <span>{item.partyName}</span> : null}
                      {item.responsibleDisplayName ? <span>{item.responsibleDisplayName}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular-nums font-medium">
                      {formatMoney(item.amountMinor, item.currency)}
                    </div>
                    {item.expectedPaymentDateIso ? (
                      <div className="text-xs text-[var(--muted)]">{item.expectedPaymentDateIso}</div>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {snapshot.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-[var(--muted)]">
              {t("pagination", {
                page: snapshot.pagination.page,
                totalPages: snapshot.pagination.totalPages,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={snapshot.pagination.page <= 1 || pending}
                onClick={() =>
                  pushFilters({ page: String(Math.max(1, snapshot.pagination.page - 1)) })
                }
              >
                ←
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={snapshot.pagination.page >= snapshot.pagination.totalPages || pending}
                onClick={() =>
                  pushFilters({ page: String(snapshot.pagination.page + 1) })
                }
              >
                →
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t("createTitle")}>
        {formFields}
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
            {t("dismiss")}
          </Button>
          <Button type="button" onClick={handleCreate} disabled={pending}>
            {t("createConfirm")}
          </Button>
        </div>
      </Dialog>

      <Sheet open={Boolean(detailId && detail)} onClose={closeDetail} title={detail?.title ?? t("detailTitle")}>
        {detail ? (
          <div className={FINANCE_WORKSPACE_STACK_CLASS}>
            <section className={FINANCE_SECTION_SURFACE_CLASS}>
              <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionStatus")}</h3>
              <p className="mt-2 text-sm">
                {t(financeCommitmentLifecycleLabelKey(detail.lifecycleStatus))}
                {detail.approvalStatus !== "NOT_REQUIRED" ? (
                  <> · {t(financeCommitmentApprovalLabelKey(detail.approvalStatus))}</>
                ) : null}
              </p>
              {detail.approvalStatus === "PENDING" ? (
                <p className="mt-2 text-xs text-[var(--muted)]">{t("awaitingApprovalHint")}</p>
              ) : null}
            </section>
            <section className={FINANCE_SECTION_SURFACE_CLASS}>
              <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionAmount")}</h3>
              <p className="mt-2 text-lg tabular-nums font-medium">
                {formatMoney(detail.amountMinor, detail.currency)}
              </p>
            </section>
            <section className={FINANCE_SECTION_SURFACE_CLASS}>
              <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionParty")}</h3>
              <dl className="mt-2 grid gap-2 text-sm">
                {detail.partyName ? (
                  <div>
                    <dt className="text-[var(--muted)]">{t("fieldParty")}</dt>
                    <dd>{detail.partyName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[var(--muted)]">{t("fieldCommitmentDate")}</dt>
                  <dd>{detail.commitmentDateIso}</dd>
                </div>
                {detail.expectedPaymentDateIso ? (
                  <div>
                    <dt className="text-[var(--muted)]">{t("fieldExpectedPayment")}</dt>
                    <dd>{detail.expectedPaymentDateIso}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
            {(detail.financialAccountName || detail.costCenterName) && (
              <section className={FINANCE_SECTION_SURFACE_CLASS}>
                <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionClassification")}</h3>
                <dl className="mt-2 grid gap-2 text-sm">
                  {detail.financialAccountName ? (
                    <div>
                      <dt className="text-[var(--muted)]">{t("fieldAccount")}</dt>
                      <dd>{detail.financialAccountName}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            )}
            <div className="flex flex-wrap gap-2">
              {detail.canEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    fillFormFromDetail(detail);
                    setEditOpen(true);
                  }}
                >
                  {t("editAction")}
                </Button>
              ) : null}
              {detail.canSubmit ? (
                <Button type="button" onClick={handleSubmit} disabled={pending}>
                  {t("submitAction")}
                </Button>
              ) : null}
              {detail.canCancel && detail.lifecycleStatus !== "CANCELLED" ? (
                <Button type="button" variant="secondary" onClick={() => setCancelOpen(true)}>
                  {t("cancelAction")}
                </Button>
              ) : null}
              {detail.lifecycleStatus === "DRAFT" && detail.canEdit ? (
                <Button type="button" variant="secondary" onClick={handleDeleteDraft}>
                  {t("deleteDraftAction")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Sheet>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={t("editAction")}>
        {formFields}
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
            {t("dismiss")}
          </Button>
          <Button type="button" onClick={handleUpdate} disabled={pending}>
            {t("createConfirm")}
          </Button>
        </div>
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancelTitle")}>
        <p className="text-sm text-[var(--muted)]">{t("cancelBody")}</p>
        <SceFormField
          className="mt-4"
          label={t("cancelConfirmLabel", { phrase: cancelPhrase })}
        >
          <input
            className="sce-input w-full"
            value={cancelPhraseInput}
            onChange={(e) => setCancelPhraseInput(e.target.value)}
            autoComplete="off"
          />
        </SceFormField>
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
            {t("dismiss")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={cancelPhraseInput.trim() !== cancelPhrase || pending}
            onClick={handleCancel}
          >
            {t("cancelAction")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

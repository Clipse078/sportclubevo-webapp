"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceTextInput } from "@/components/sce/forms/SceTextInput";
import { SceTextarea } from "@/components/sce/forms/SceTextarea";
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
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_SUMMARY_GRID_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_SURFACE_CLASS,
  FINANCE_SUMMARY_VALUE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { formatFinanceCalendarDateLabel } from "@/lib/finance/setup/finance-year-period-display";

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
  const formFieldId = useId();
  const titleFieldId = `${formFieldId}-title`;
  const amountFieldId = `${formFieldId}-amount`;
  const commitmentDateFieldId = `${formFieldId}-commitment-date`;
  const partyFieldId = `${formFieldId}-party`;
  const expectedPaymentFieldId = `${formFieldId}-expected-payment`;
  const referenceFieldId = `${formFieldId}-reference`;
  const descriptionFieldId = `${formFieldId}-description`;
  const cancelPhraseFieldId = `${formFieldId}-cancel-phrase`;

  const formatMoney = (minor: number, cur: string) =>
    formatFinanceManagementPlanningMinor(minor, cur, formattingLocale);

  const formatCalendarDate = (iso: string) =>
    formatFinanceCalendarDateLabel(iso, formattingLocale);

  function commitmentDetailFieldRow(label: string, value: string) {
    return (
      <div
        key={label}
        className="grid min-w-0 gap-0.5 sm:grid-cols-[minmax(9rem,42%)_1fr] sm:gap-4"
      >
        <dt className="text-[var(--muted)]">{label}</dt>
        <dd className="min-w-0 break-words text-[var(--foreground)]">{value}</dd>
      </div>
    );
  }

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

  const createDialogFooter = (
    <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
      <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
        {t("dismiss")}
      </Button>
      <Button type="button" onClick={handleCreate} disabled={pending}>
        {t("createConfirm")}
      </Button>
    </div>
  );

  const editDialogFooter = (
    <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
      <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
        {t("dismiss")}
      </Button>
      <Button type="button" onClick={handleUpdate} disabled={pending}>
        {t("createConfirm")}
      </Button>
    </div>
  );

  const formFields = (
    <div className="grid min-w-0 gap-4" data-finance-commitment-form>
      <SceFormField label={t("fieldTitle")} htmlFor={titleFieldId} required>
        <SceTextInput
          id={titleFieldId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          disabled={pending}
        />
      </SceFormField>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <SceFormField label={t("fieldAmount")} htmlFor={amountFieldId} required>
          <SceTextInput
            id={amountFieldId}
            className="tabular-nums"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            inputMode="decimal"
            disabled={pending}
          />
        </SceFormField>
        <SceFormField label={t("fieldCurrency")} required>
          <div className="min-w-0 max-w-full [&>div]:min-w-0 [&>div]:max-w-full [&>div]:sm:min-w-0">
            <FinanceBaseCurrencySelector
              value={currency}
              onChange={setCurrency}
              disabled={pending}
              ariaLabel={t("fieldCurrency")}
              placeholder={t("fieldCurrency")}
            />
          </div>
        </SceFormField>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <SceFormField label={t("fieldCommitmentDate")} htmlFor={commitmentDateFieldId} required>
          <SceTextInput
            id={commitmentDateFieldId}
            type="date"
            value={commitmentDate}
            onChange={(e) => setCommitmentDate(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
        <SceFormField label={t("fieldExpectedPayment")} htmlFor={expectedPaymentFieldId}>
          <SceTextInput
            id={expectedPaymentFieldId}
            type="date"
            value={expectedPaymentDate}
            onChange={(e) => setExpectedPaymentDate(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
      </div>
      <SceFormField label={t("fieldParty")} htmlFor={partyFieldId}>
        <SceTextInput
          id={partyFieldId}
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          disabled={pending}
        />
      </SceFormField>
      <SceFormField label={t("fieldAccount")}>
        <div className="min-w-0 max-w-full">
          <StaticOptionSearchablePicker
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
            placeholder={t("filterAll")}
            disabled={pending}
            ariaLabel={t("fieldAccount")}
          />
        </div>
      </SceFormField>
      <SceFormField label={t("fieldReference")} htmlFor={referenceFieldId}>
        <SceTextInput
          id={referenceFieldId}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={pending}
        />
      </SceFormField>
      <SceFormField label={t("fieldDescription")} htmlFor={descriptionFieldId}>
        <SceTextarea
          id={descriptionFieldId}
          className="min-h-[5rem]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
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
              className={FINANCE_FIELD_CONTROL_CLASS}
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
                      <div className="text-xs text-[var(--muted)]">
                        {formatCalendarDate(item.expectedPaymentDateIso)}
                      </div>
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

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("createTitle")}
        size="lg"
        footer={createDialogFooter}
        panelClassName="min-w-0 max-w-full"
      >
        {formFields}
      </Dialog>

      <Sheet open={Boolean(detailId && detail)} onClose={closeDetail} title={detail?.title ?? t("detailTitle")}>
        {detail ? (
          <div
            className={cn(FINANCE_WORKSPACE_STACK_CLASS, "min-w-0 max-w-full overflow-x-hidden")}
            data-finance-commitment-detail
          >
            <div className="min-w-0 space-y-1">
              <p className={cn(FINANCE_SUMMARY_RESULT_VALUE_CLASS, "break-words")}>
                {formatMoney(detail.amountMinor, detail.currency)}
              </p>
              <p className="text-sm text-[var(--foreground)]">
                {t(financeCommitmentLifecycleLabelKey(detail.lifecycleStatus))}
                {detail.approvalStatus !== "NOT_REQUIRED" ? (
                  <>
                    {" · "}
                    {t(financeCommitmentApprovalLabelKey(detail.approvalStatus))}
                  </>
                ) : null}
              </p>
              {detail.approvalStatus === "PENDING" ? (
                <p className="text-xs text-[var(--muted)]">{t("awaitingApprovalHint")}</p>
              ) : null}
            </div>

            <section className={FINANCE_SECTION_SURFACE_CLASS}>
              <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionParty")}</h3>
              <dl className="space-y-2 px-4 py-3 text-sm">
                {detail.partyName
                  ? commitmentDetailFieldRow(t("fieldParty"), detail.partyName)
                  : null}
                {commitmentDetailFieldRow(
                  t("fieldCommitmentDate"),
                  formatCalendarDate(detail.commitmentDateIso),
                )}
                {detail.expectedPaymentDateIso
                  ? commitmentDetailFieldRow(
                      t("fieldExpectedPayment"),
                      formatCalendarDate(detail.expectedPaymentDateIso),
                    )
                  : null}
              </dl>
            </section>

            {detail.financialAccountName || detail.costCenterName ? (
              <section className={FINANCE_SECTION_SURFACE_CLASS}>
                <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("detailSectionClassification")}</h3>
                <dl className="space-y-2 px-4 py-3 text-sm">
                  {detail.financialAccountName
                    ? commitmentDetailFieldRow(t("fieldAccount"), detail.financialAccountName)
                    : null}
                  {detail.costCenterName
                    ? commitmentDetailFieldRow(t("fieldCostCenter"), detail.costCenterName)
                    : null}
                </dl>
              </section>
            ) : null}

            {detail.externalReference || detail.description ? (
              <div className="min-w-0 space-y-3 text-sm">
                {detail.externalReference ? (
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--muted)]">{t("fieldReference")}</div>
                    <p className="mt-1 break-words text-[var(--foreground)]">{detail.externalReference}</p>
                  </div>
                ) : null}
                {detail.description ? (
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--muted)]">{t("fieldDescription")}</div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[var(--foreground)]">
                      {detail.description}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className="flex min-w-0 flex-col gap-2 pt-1"
              data-finance-commitment-detail-actions
            >
              {detail.canSubmit ? (
                <Button type="button" onClick={handleSubmit} disabled={pending} className="w-full sm:w-auto">
                  {t("submitAction")}
                </Button>
              ) : null}
              {detail.canEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    fillFormFromDetail(detail);
                    setEditOpen(true);
                  }}
                >
                  {t("editAction")}
                </Button>
              ) : null}
              {((detail.canCancel && detail.lifecycleStatus !== "CANCELLED") ||
                (detail.lifecycleStatus === "DRAFT" && detail.canEdit)) && (
                <div className="flex flex-wrap gap-2 border-t border-[var(--sce-surface-border-subtle)] pt-3">
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
              )}
            </div>
          </div>
        ) : null}
      </Sheet>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("editAction")}
        size="lg"
        footer={editDialogFooter}
        panelClassName="min-w-0 max-w-full"
      >
        {formFields}
      </Dialog>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={t("cancelTitle")}>
        <p className="text-sm text-[var(--muted)]">{t("cancelBody")}</p>
        <SceFormField
          className="mt-4"
          label={t("cancelConfirmLabel", { phrase: cancelPhrase })}
          htmlFor={cancelPhraseFieldId}
        >
          <SceTextInput
            id={cancelPhraseFieldId}
            value={cancelPhraseInput}
            onChange={(e) => setCancelPhraseInput(e.target.value)}
            autoComplete="off"
            disabled={pending}
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

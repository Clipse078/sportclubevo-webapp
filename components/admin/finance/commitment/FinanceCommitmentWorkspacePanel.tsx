"use client";

import { useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
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
import { FinanceCommitmentDetailSheetBody } from "@/components/admin/finance/commitment/FinanceCommitmentDetailSheetBody";
import {
  FinanceCommitmentListHeader,
  FinanceCommitmentListRow,
} from "@/components/admin/finance/commitment/FinanceCommitmentListRow";
import { FinanceCommitmentRejectDialog } from "@/components/admin/finance/commitment/FinanceCommitmentRejectDialog";
import { FinanceCommitmentSummarySegments } from "@/components/admin/finance/commitment/FinanceCommitmentSummarySegments";
import type { FinanceCommitmentWorkspaceSnapshot } from "@/lib/finance/services/finance-commitment-query-service";
import type { FinanceCommitmentDetailRecord } from "@/lib/finance/services/finance-commitment-query-service";
import {
  approveFinanceCommitmentAction,
  cancelFinanceCommitmentAction,
  createFinanceCommitmentAction,
  deleteDraftFinanceCommitmentAction,
  loadFinanceCommitmentDetailAction,
  rejectFinanceCommitmentAction,
  submitFinanceCommitmentAction,
  updateFinanceCommitmentAction,
} from "@/app/(admin)/dashboard/finance/commitments/actions";
import {
  FINANCE_COMMITMENT_EMPTY_IN_SURFACE_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_FILTERS_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_LIST_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_SURFACE_CLASS,
  FINANCE_FIELD_CONTROL_CLASS,
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

function CommitmentFormSection({
  label,
  variant,
  children,
}: {
  label: string;
  variant: "primary" | "secondary" | "optional";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid min-w-0 gap-4",
        variant === "optional" && "text-[var(--text-2)]",
      )}
      data-finance-commitment-form-section={variant}
      aria-label={label}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</h3>
      {children}
    </section>
  );
}

const COMMITMENT_CREATE_DIALOG_SIZE = "standard" as const;

type CommitmentFormFieldKey = "title" | "amount" | "commitmentDate" | "currency";

function isIsoCalendarDateInYearRange(
  isoDate: string,
  year: { startDateIso: string; endDateIso: string },
): boolean {
  return isoDate >= year.startDateIso && isoDate <= year.endDateIso;
}

function CommitmentFormFeedback({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-3 py-2 text-sm text-[var(--destructive)]"
      role="alert"
      data-finance-commitment-form-feedback
      data-testid="finance-commitment-form-feedback"
    >
      {message}
    </p>
  );
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelPhraseInput, setCancelPhraseInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CommitmentFormFieldKey, string>>
  >({});
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const detailMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

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
  const selectedYear = useMemo(
    () => snapshot.years.find((y) => y.id === selectedYearId) ?? null,
    [snapshot.years, selectedYearId],
  );
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
  const rejectReasonFieldId = `${formFieldId}-reject-reason`;

  const formatMoney = (minor: number, cur: string) =>
    formatFinanceManagementPlanningMinor(minor, cur, formattingLocale);

  const formatCalendarDate = (iso: string) =>
    formatFinanceCalendarDateLabel(iso, formattingLocale);

  function pushFilters(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (next.page === undefined) params.delete("page");
    router.push(`/dashboard/finance/commitments?${params.toString()}`);
  }

  function clearFormFeedback() {
    setFormFeedback(null);
    setFieldErrors({});
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
    clearFormFeedback();
  }

  function commitmentDateYearErrorMessage(): string {
    if (!selectedYear) return t("errors.invalidYear");
    return t("errors.commitmentDateOutsideYear", {
      yearName: selectedYear.name,
      startDate: formatFinanceCalendarDateLabel(selectedYear.startDateIso, formattingLocale),
      endDate: formatFinanceCalendarDateLabel(selectedYear.endDateIso, formattingLocale),
    });
  }

  function validateDraftFormFields(): boolean {
    clearFormFeedback();
    const nextErrors: Partial<Record<CommitmentFormFieldKey, string>> = {};
    let summary: string | null = null;

    if (!selectedYearId) {
      summary = t("errors.noFinanceYearSelected");
    }
    if (!title.trim()) {
      nextErrors.title = t("errors.fieldTitleRequired");
    }
    if (!commitmentDate.trim()) {
      nextErrors.commitmentDate = t("errors.fieldCommitmentDateRequired");
    } else if (selectedYear && !isIsoCalendarDateInYearRange(commitmentDate, selectedYear)) {
      nextErrors.commitmentDate = commitmentDateYearErrorMessage();
    }
    const amountMinor = parseBudgetInputToMinor(amountInput);
    if (amountMinor === null || amountMinor <= 0) {
      nextErrors.amount = t("errors.fieldAmountRequired");
    }
    if (!currency.trim()) {
      nextErrors.currency = t("errors.invalidCurrency");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormFeedback(summary ?? t("errors.validation"));
      return false;
    }
    if (summary) {
      setFormFeedback(summary);
      return false;
    }
    return true;
  }

  function applyServerFormFailure(result: {
    ok: false;
    errorCode?: string;
    errorKey?: string;
    error: string;
  }) {
    const message = mapActionError(t, result);
    setFormFeedback(message);
    if (result.errorCode === "FINANCE_INVALID_YEAR") {
      setFieldErrors((prev) => ({
        ...prev,
        commitmentDate: commitmentDateYearErrorMessage(),
      }));
    }
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
    setDeleteOpen(false);
    setCancelPhraseInput("");
    setDetailMenuOpen(false);
    setRejectOpen(false);
    setRejectReason("");
    setRejectError(null);
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
    if (!validateDraftFormFields()) return;
    const amountMinor = parseBudgetInputToMinor(amountInput);
    if (amountMinor === null) return;
    startTransition(async () => {
      setFeedback(null);
      try {
        const result = await createFinanceCommitmentAction({
          financeYearId: selectedYearId,
          title: title.trim(),
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
          applyServerFormFailure(result);
          return;
        }
        clearFormFeedback();
        setCreateOpen(false);
        router.refresh();
        if (result.commitmentId) void openDetail(result.commitmentId);
      } catch {
        setFormFeedback(t("errors.generic"));
      }
    });
  }

  function handleUpdate() {
    if (!detail || !validateDraftFormFields()) return;
    const amountMinor = parseBudgetInputToMinor(amountInput);
    if (amountMinor === null) return;
    startTransition(async () => {
      setFeedback(null);
      try {
        const result = await updateFinanceCommitmentAction({
          commitmentId: detail.id,
          financeYearId: selectedYearId,
          title: title.trim(),
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
          applyServerFormFailure(result);
          return;
        }
        clearFormFeedback();
        setEditOpen(false);
        router.refresh();
        await openDetail(detail.id);
      } catch {
        setFormFeedback(t("errors.generic"));
      }
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

  function handleApprove() {
    if (!detail || !selectedYearId) return;
    startTransition(async () => {
      const result = await approveFinanceCommitmentAction({
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

  function handleRejectConfirm() {
    if (!detail || !selectedYearId) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      setRejectError(t("approvalRejectReasonTooShort"));
      return;
    }
    startTransition(async () => {
      const result = await rejectFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: selectedYearId,
        comment: reason,
      });
      if (!result.ok) {
        setRejectError(mapActionError(t, result));
        return;
      }
      setRejectOpen(false);
      setRejectReason("");
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
      setDeleteOpen(false);
      closeDetail();
      router.refresh();
    });
  }

  const canDeleteDraft =
    detail?.lifecycleStatus === "DRAFT" &&
    !detail.submittedAtIso &&
    detail.canEdit;
  const showCancelInOverflowMenu =
    detail != null &&
    detail.canCancel &&
    (detail.lifecycleStatus === "SUBMITTED" || detail.lifecycleStatus === "ACTIVE");
  const showDeleteInOverflowMenu = canDeleteDraft === true;
  const showLifecycleOverflow = showCancelInOverflowMenu || showDeleteInOverflowMenu;

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
        {t("editSaveConfirm")}
      </Button>
    </div>
  );

  const formFields = (
    <div className="grid min-w-0 gap-6" data-finance-commitment-form>
      <CommitmentFormFeedback message={formFeedback} />
      <CommitmentFormSection label={t("formSectionPrimary")} variant="primary">
        <SceFormField
          label={t("fieldTitle")}
          htmlFor={titleFieldId}
          required
          error={fieldErrors.title}
        >
          <SceTextInput
            id={titleFieldId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            disabled={pending}
          />
        </SceFormField>
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
          <SceFormField
            label={t("fieldAmount")}
            htmlFor={amountFieldId}
            required
            error={fieldErrors.amount}
          >
            <SceTextInput
              id={amountFieldId}
              className="tabular-nums"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              inputMode="decimal"
              disabled={pending}
            />
          </SceFormField>
          <SceFormField label={t("fieldCurrency")} required error={fieldErrors.currency}>
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
        <SceFormField
          label={t("fieldCommitmentDate")}
          htmlFor={commitmentDateFieldId}
          required
          description={t("fieldCommitmentDateHint")}
          error={fieldErrors.commitmentDate}
        >
          <SceTextInput
            id={commitmentDateFieldId}
            type="date"
            value={commitmentDate}
            onChange={(e) => setCommitmentDate(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
      </CommitmentFormSection>

      <CommitmentFormSection label={t("formSectionSecondary")} variant="secondary">
        <SceFormField label={t("fieldParty")} htmlFor={partyFieldId} optional>
          <SceTextInput
            id={partyFieldId}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
        <SceFormField
          label={t("fieldExpectedPayment")}
          htmlFor={expectedPaymentFieldId}
          optional
          description={t("fieldExpectedPaymentHint")}
        >
          <SceTextInput
            id={expectedPaymentFieldId}
            type="date"
            value={expectedPaymentDate}
            onChange={(e) => setExpectedPaymentDate(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
        <SceFormField label={t("fieldAccount")} optional>
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
      </CommitmentFormSection>

      <CommitmentFormSection label={t("formSectionOptional")} variant="optional">
        <SceFormField label={t("fieldReference")} htmlFor={referenceFieldId} optional>
          <SceTextInput
            id={referenceFieldId}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
        <SceFormField label={t("fieldDescription")} htmlFor={descriptionFieldId} optional>
          <SceTextarea
            id={descriptionFieldId}
            className="min-h-[4.5rem]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </SceFormField>
      </CommitmentFormSection>
    </div>
  );

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS} data-finance-commitment-workspace>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{t("intro")}</p>
        {snapshot.capabilities.canManage ? (
          <Button
            type="button"
            className="h-9 shrink-0 sm:ms-4"
            onClick={openCreate}
            disabled={!selectedYearId || pending}
          >
            {t("newAction")}
          </Button>
        ) : null}
      </div>

      <FinanceCommitmentSummarySegments
        pendingCount={snapshot.summary.submittedPendingCount}
        activeCount={snapshot.summary.activeCount}
        draftCount={snapshot.summary.draftCount}
        canApprove={snapshot.capabilities.canApprove}
        activeAmountLabel={activeAmountLabel}
        activeAmountFormatted={
          snapshot.summary.activeAmountMinor != null
            ? formatMoney(
                snapshot.summary.activeAmountMinor,
                snapshot.summary.activeAmountCurrency ?? currency,
              )
            : null
        }
        t={t}
      />

      <div
        className={FINANCE_COMMITMENT_OPERATIONAL_SURFACE_CLASS}
        data-finance-commitment-operational-surface
      >
        <div className={FINANCE_COMMITMENT_OPERATIONAL_FILTERS_CLASS}>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
            <label className="flex min-w-[10.5rem] flex-col gap-1 text-[0.6875rem] font-medium text-[var(--muted)]">
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
            <label className="flex min-w-[10.5rem] flex-col gap-1 text-[0.6875rem] font-medium text-[var(--muted)]">
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
            <label className="flex min-w-[10.5rem] flex-col gap-1 text-[0.6875rem] font-medium text-[var(--muted)]">
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
            <label className="flex min-w-[10.5rem] flex-1 flex-col gap-1 text-[0.6875rem] font-medium text-[var(--muted)]">
              {t("filterSearch")}
              <input
                className={cn(FINANCE_FIELD_CONTROL_CLASS, "h-9")}
                defaultValue={snapshot.filters.search ?? ""}
                placeholder={t("filterSearchPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  pushFilters({ q: (e.target as HTMLInputElement).value, page: "1" });
                }}
              />
            </label>
          </div>
        </div>

        <div className={FINANCE_COMMITMENT_OPERATIONAL_LIST_CLASS}>
          {feedback ? (
            <p className="px-2 py-2 text-sm text-[var(--destructive)]" role="alert">
              {feedback}
            </p>
          ) : null}

          {snapshot.items.length === 0 ? (
            <div
              className={FINANCE_COMMITMENT_EMPTY_IN_SURFACE_CLASS}
              data-finance-commitment-empty
            >
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("emptyTitle")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{t("emptyBody")}</p>
              {snapshot.capabilities.canManage ? (
                <Button
                  type="button"
                  className="mt-5 h-9"
                  onClick={openCreate}
                  disabled={!selectedYearId}
                >
                  {t("newAction")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div data-finance-commitment-list className="min-w-0">
              <FinanceCommitmentListHeader t={t} layout="workspace" />
              <ul className="divide-y divide-[var(--sce-surface-border-subtle)]/80">
                {snapshot.items.map((item) => (
                  <li key={item.id}>
                    <FinanceCommitmentListRow
                      item={item}
                      t={t}
                      formatMoney={formatMoney}
                      formatCalendarDate={formatCalendarDate}
                      selected={detailId === item.id}
                      onOpen={() => void openDetail(item.id)}
                      layout="workspace"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[var(--sce-surface-border-subtle)]/80 px-2 py-3 text-sm">
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
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("createTitle")}
        description={t("createDescription")}
        size={COMMITMENT_CREATE_DIALOG_SIZE}
        footer={createDialogFooter}
        panelClassName="min-w-0 max-w-full"
      >
        <div className="min-w-0" data-finance-commitment-create-dialog>
          {formFields}
        </div>
      </Dialog>

      <Sheet
        open={Boolean(detailId && detail)}
        onClose={closeDetail}
        title={detail?.title ?? t("detailTitle")}
        fitContent
      >
        {detail ? (
          <FinanceCommitmentDetailSheetBody
            detail={detail}
            t={t}
            formatMoney={formatMoney}
            formattingLocale={formattingLocale}
            formatCalendarDate={formatCalendarDate}
            pending={pending}
            detailMenuOpen={detailMenuOpen}
            onDetailMenuOpenChange={setDetailMenuOpen}
            detailMenuTriggerRef={detailMenuTriggerRef}
            showLifecycleOverflow={showLifecycleOverflow}
            showCancelInOverflowMenu={showCancelInOverflowMenu}
            showDeleteInOverflowMenu={showDeleteInOverflowMenu}
            onApprove={detail.canApprove ? handleApprove : undefined}
            onReject={
              detail.canApprove
                ? () => {
                    setRejectReason("");
                    setRejectError(null);
                    setRejectOpen(true);
                  }
                : undefined
            }
            onSubmit={detail.canSubmit ? handleSubmit : undefined}
            onEdit={
              detail.canEdit
                ? () => {
                    fillFormFromDetail(detail);
                    clearFormFeedback();
                    setEditOpen(true);
                  }
                : undefined
            }
            onCancelOpen={() => {
              setDetailMenuOpen(false);
              setCancelOpen(true);
            }}
            onDeleteOpen={() => {
              setDetailMenuOpen(false);
              setDeleteOpen(true);
            }}
            mode="workspace"
          />
        ) : null}
      </Sheet>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("editAction")}
        size={COMMITMENT_CREATE_DIALOG_SIZE}
        footer={editDialogFooter}
        panelClassName="min-w-0 max-w-full"
      >
        <div className="min-w-0" data-finance-commitment-edit-dialog>
          {formFields}
        </div>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t("deleteDraftTitle")}>
        <div className="space-y-3 text-sm text-[var(--text-2)]" data-finance-commitment-delete-dialog>
          <p>{t("deleteDraftBody", { title: detail?.title ?? "" })}</p>
        </div>
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
            {t("dismiss")}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={handleDeleteDraft}>
            {t("deleteDraftConfirm")}
          </Button>
        </div>
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

      <FinanceCommitmentRejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        rejectError={rejectError}
        pending={pending}
        onConfirm={handleRejectConfirm}
        fieldId={rejectReasonFieldId}
        t={t}
        dismissLabel={t("dismiss")}
      />
    </div>
  );
}

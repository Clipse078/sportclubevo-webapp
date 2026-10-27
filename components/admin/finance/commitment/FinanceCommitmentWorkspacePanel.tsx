"use client";

import { useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Ban, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
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
import {
  SceOverflowMenu,
  SceOverflowMenuDivider,
  SceOverflowMenuItem,
} from "@/components/sce/actions/SceOverflowMenu";
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
  FINANCE_EMPTY_DRAFT_SURFACE_CLASS,
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-[var(--muted)]">{t("intro")}</p>
        {snapshot.capabilities.canManage ? (
          <Button type="button" onClick={openCreate} disabled={!selectedYearId || pending}>
            {t("newAction")}
          </Button>
        ) : null}
      </div>

      <div
        className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS}
        data-finance-commitment-status-summary
      >
        <div className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
          <div
            className={cn(
              "min-w-0 sm:px-4",
              snapshot.summary.submittedPendingCount > 0 &&
                "sm:rounded-md sm:bg-[var(--surface-2)]/60 sm:py-1",
            )}
            data-finance-commitment-summary-pending
          >
            <div
              className={cn(
                FINANCE_SUMMARY_LABEL_CLASS,
                snapshot.summary.submittedPendingCount > 0 && "text-[var(--foreground)]",
              )}
            >
              {t("summaryPending")}
            </div>
            <div
              className={cn(
                FINANCE_SUMMARY_STRIP_VALUE_CLASS,
                snapshot.summary.submittedPendingCount > 0 &&
                  "text-base text-[var(--foreground)]",
              )}
            >
              {snapshot.summary.submittedPendingCount}
            </div>
            {snapshot.capabilities.canApprove && snapshot.summary.submittedPendingCount > 0 ? (
              <Link
                href="/dashboard/finance/commitments/approvals"
                className="mt-1 inline-block text-xs font-medium text-[var(--link)] hover:underline"
                data-finance-commitment-approval-inbox-link
              >
                {t("openApprovalInbox")}
              </Link>
            ) : null}
          </div>
          <div className="min-w-0 sm:px-4">
            <div className={FINANCE_SUMMARY_LABEL_CLASS}>{t("summaryActive")}</div>
            <div className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>{snapshot.summary.activeCount}</div>
          </div>
          <div className="min-w-0 sm:px-4">
            <div className={FINANCE_SUMMARY_LABEL_CLASS}>{t("summaryDrafts")}</div>
            <div className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>{snapshot.summary.draftCount}</div>
          </div>
        </div>
        {activeAmountLabel && snapshot.summary.activeAmountMinor != null ? (
          <p className="mt-2 border-t border-[var(--sce-surface-border-subtle)] pt-2 text-xs text-[var(--muted)]">
            <span className="font-medium text-[var(--foreground)]">
              {formatMoney(
                snapshot.summary.activeAmountMinor,
                snapshot.summary.activeAmountCurrency ?? currency,
              )}
            </span>
            <span className="ms-2">{activeAmountLabel}</span>
          </p>
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
          <ul
            className="divide-y divide-[var(--sce-color-border-standard)]"
            data-finance-commitment-list
          >
            {snapshot.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full min-w-0 flex-col gap-2 px-1 py-3 text-left transition-colors hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  onClick={() => void openDetail(item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--foreground)]">{item.title}</div>
                    {item.partyName ? (
                      <div className="mt-0.5 truncate text-sm text-[var(--text-2)]">
                        {item.partyName}
                      </div>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-medium text-[var(--muted)]">
                        {t(financeCommitmentLifecycleLabelKey(item.lifecycleStatus))}
                      </span>
                      {item.approvalStatus === "PENDING" ? (
                        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-medium text-[var(--foreground)]">
                          {t(financeCommitmentApprovalLabelKey(item.approvalStatus))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end sm:text-right">
                    <div className="tabular-nums text-sm font-semibold text-[var(--foreground)]">
                      {formatMoney(item.amountMinor, item.currency)}
                    </div>
                    {item.expectedPaymentDateIso ? (
                      <div className="text-xs text-[var(--muted)]">
                        <span className="sr-only">{t("colExpectedPayment")}: </span>
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
        description={t("createDescription")}
        size={COMMITMENT_CREATE_DIALOG_SIZE}
        footer={createDialogFooter}
        panelClassName="min-w-0 max-w-full"
      >
        <div className="min-w-0" data-finance-commitment-create-dialog>
          {formFields}
        </div>
      </Dialog>

      <Sheet open={Boolean(detailId && detail)} onClose={closeDetail} title={detail?.title ?? t("detailTitle")}>
        {detail ? (
          <div
            className={cn("min-w-0 max-w-full space-y-5 overflow-x-hidden pb-2")}
            data-finance-commitment-detail
          >
            {detail.partyName ? (
              <p className="text-sm text-[var(--text-2)]">{detail.partyName}</p>
            ) : null}

            <div className="min-w-0 space-y-1">
              <p className={cn(FINANCE_SUMMARY_RESULT_VALUE_CLASS, "break-words")}>
                {formatMoney(detail.amountMinor, detail.currency)}
              </p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {t(financeCommitmentLifecycleLabelKey(detail.lifecycleStatus))}
                {detail.approvalStatus !== "NOT_REQUIRED" ? (
                  <>
                    {" · "}
                    {t(financeCommitmentApprovalLabelKey(detail.approvalStatus))}
                  </>
                ) : null}
              </p>
              {detail.approvalStatus === "PENDING" && !detail.canApprove ? (
                <p className="text-xs text-[var(--muted)]">{t("awaitingApprovalHint")}</p>
              ) : null}
              {detail.approvalDecidedByDisplayName && detail.approvalDecidedAtIso ? (
                <p className="text-xs text-[var(--muted)]">
                  {t("approvalDecisionMeta", {
                    name: detail.approvalDecidedByDisplayName,
                    date: formatCalendarDate(detail.approvalDecidedAtIso.slice(0, 10)),
                  })}
                </p>
              ) : null}
              {!detail.canEdit && detail.lifecycleStatus !== "DRAFT" ? (
                <p className="text-xs text-[var(--muted)]" data-finance-commitment-edit-blocked>
                  {t("editUnavailableSubmitted")}
                </p>
              ) : null}
            </div>

            <dl className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm">
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
              {detail.responsibleDisplayName
                ? commitmentDetailFieldRow(t("fieldResponsible"), detail.responsibleDisplayName)
                : null}
            </dl>

            {detail.financialAccountName || detail.costCenterName ? (
              <dl className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("detailSectionClassification")}
                </dt>
                {detail.financialAccountName
                  ? commitmentDetailFieldRow(t("fieldAccount"), detail.financialAccountName)
                  : null}
                {detail.costCenterName
                  ? commitmentDetailFieldRow(t("fieldCostCenter"), detail.costCenterName)
                  : null}
              </dl>
            ) : null}

            {detail.approvalDecisionHistory.length > 0 ? (
              <div
                className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm"
                data-finance-commitment-approval-history
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("detailSectionApproval")}
                </div>
                <ul className="space-y-2">
                  {detail.approvalDecisionHistory.map((row) => (
                    <li key={row.decidedAtIso} className="min-w-0">
                      <div className="font-medium text-[var(--foreground)]">
                        {t(financeCommitmentApprovalLabelKey(row.decision))}
                        {row.decidedByDisplayName ? (
                          <span className="font-normal text-[var(--muted)]">
                            {" "}
                            · {row.decidedByDisplayName}
                          </span>
                        ) : null}
                      </div>
                      {row.comment ? (
                        <p className="mt-0.5 break-words text-[var(--text-2)]">{row.comment}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.externalReference || detail.description ? (
              <div className="min-w-0 space-y-3 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm">
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
              className="flex min-w-0 flex-col gap-3 border-t border-[var(--sce-surface-border-subtle)] pt-4"
              data-finance-commitment-detail-actions
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {detail.canApprove ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      disabled={pending}
                      className="w-full sm:w-auto"
                      data-finance-commitment-approve-action
                    >
                      {t("approveAction")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={pending}
                      onClick={() => {
                        setRejectReason("");
                        setRejectError(null);
                        setRejectOpen(true);
                      }}
                      data-finance-commitment-reject-action
                    >
                      {t("rejectAction")}
                    </Button>
                  </>
                ) : null}
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
                      clearFormFeedback();
                      setEditOpen(true);
                    }}
                  >
                    {t("editAction")}
                  </Button>
                ) : null}
                {showLifecycleOverflow ? (
                  <div className="sm:ms-auto" data-finance-commitment-lifecycle-menu>
                    <SceOverflowMenu
                      open={detailMenuOpen}
                      onOpenChange={setDetailMenuOpen}
                      anchorRef={detailMenuTriggerRef}
                      triggerLabel={t("detailMenuTrigger")}
                      menuLabel={t("detailMenuLabel")}
                      triggerIcon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
                      floatingLayer="composer"
                    >
                      {showCancelInOverflowMenu ? (
                        <SceOverflowMenuItem
                          icon={<Ban className="h-4 w-4" />}
                          label={t("cancelAction")}
                          onSelect={() => {
                            setDetailMenuOpen(false);
                            setCancelOpen(true);
                          }}
                        />
                      ) : null}
                      {showDeleteInOverflowMenu ? (
                        <>
                          {showCancelInOverflowMenu ? <SceOverflowMenuDivider /> : null}
                          <SceOverflowMenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            label={t("deleteDraftAction")}
                            destructive
                            onSelect={() => {
                              setDetailMenuOpen(false);
                              setDeleteOpen(true);
                            }}
                          />
                        </>
                      ) : null}
                    </SceOverflowMenu>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
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

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t("rejectDialogTitle")}
        description={t("rejectDialogDescription")}
      >
        <SceFormField label={t("rejectReasonLabel")} htmlFor={rejectReasonFieldId}>
          <SceTextarea
            id={rejectReasonFieldId}
            className={cn(FINANCE_FIELD_CONTROL_CLASS, "min-h-[5rem]")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={pending}
            placeholder={t("rejectReasonPlaceholder")}
          />
        </SceFormField>
        {rejectError ? (
          <p className="mt-2 text-sm text-[var(--destructive)]" role="alert">
            {rejectError}
          </p>
        ) : null}
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" onClick={() => setRejectOpen(false)}>
            {t("dismiss")}
          </Button>
          <Button type="button" variant="danger" disabled={pending} onClick={handleRejectConfirm}>
            {t("rejectConfirmAction")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

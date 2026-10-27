"use client";

import { useCallback, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceTextarea } from "@/components/sce/forms/SceTextarea";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  financeCommitmentApprovalLabelKey,
  financeCommitmentLifecycleLabelKey,
} from "@/lib/finance/commitment/finance-commitment-status-presentation";
import type {
  FinanceCommitmentApprovalInboxSnapshot,
  FinanceCommitmentDetailRecord,
} from "@/lib/finance/services/finance-commitment-query-service";
import {
  approveFinanceCommitmentAction,
  loadFinanceCommitmentDetailAction,
  rejectFinanceCommitmentAction,
} from "@/app/(admin)/dashboard/finance/commitments/actions";
import {
  FINANCE_EMPTY_DRAFT_SURFACE_CLASS,
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { formatFinanceCalendarDateLabel } from "@/lib/finance/setup/finance-year-period-display";

type FinanceCommitmentApprovalInboxPanelProps = {
  snapshot: FinanceCommitmentApprovalInboxSnapshot;
  formattingLocale: string;
};

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

export function FinanceCommitmentApprovalInboxPanel({
  snapshot,
  formattingLocale,
}: FinanceCommitmentApprovalInboxPanelProps) {
  const t = useTranslations("Finance.commitments.approvalInbox");
  const tWorkspace = useTranslations("Finance.commitments.workspace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceCommitmentDetailRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);

  const rejectFieldId = useId();
  const selectedYearId = snapshot.selectedYearId ?? "";

  const formatMoney = useCallback(
    (minor: number, cur: string) =>
      formatFinanceManagementPlanningMinor(minor, cur, formattingLocale),
    [formattingLocale],
  );

  const formatCalendarDate = (iso: string) =>
    formatFinanceCalendarDateLabel(iso, formattingLocale);

  function pushYear(yearId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (yearId) params.set("yearId", yearId);
    else params.delete("yearId");
    router.push(`/dashboard/finance/commitments/approvals?${params.toString()}`);
  }

  async function openDetail(commitmentId: string) {
    setFeedback(null);
    setDetailId(commitmentId);
    const loaded = await loadFinanceCommitmentDetailAction(commitmentId);
    setDetail(loaded);
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setRejectOpen(false);
    setRejectReason("");
    setRejectError(null);
  }

  function handleApprove() {
    if (!detail) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await approveFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: detail.financeYearId,
      });
      if (!result.ok) {
        setFeedback(mapActionError(tWorkspace, result));
        return;
      }
      closeDetail();
      router.refresh();
    });
  }

  function handleRejectConfirm() {
    if (!detail) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      setRejectError(t("rejectReasonTooShort"));
      return;
    }
    setRejectError(null);
    startTransition(async () => {
      const result = await rejectFinanceCommitmentAction({
        commitmentId: detail.id,
        financeYearId: detail.financeYearId,
        comment: reason,
      });
      if (!result.ok) {
        setRejectError(mapActionError(tWorkspace, result));
        return;
      }
      setRejectOpen(false);
      closeDetail();
      router.refresh();
    });
  }

  const decisionContext = useMemo(() => {
    if (!detail) return null;
    return {
      amount: formatMoney(detail.amountMinor, detail.currency),
      lifecycle: tWorkspace(financeCommitmentLifecycleLabelKey(detail.lifecycleStatus)),
      approval: tWorkspace(financeCommitmentApprovalLabelKey(detail.approvalStatus)),
    };
  }, [detail, formatMoney, tWorkspace]);

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS} data-finance-commitment-approval-inbox>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl space-y-2">
          <p className="text-sm text-[var(--muted)]">{t("intro")}</p>
          <Link
            href="/dashboard/finance/commitments"
            className="text-sm font-medium text-[var(--link)] hover:underline"
          >
            {t("backToWorkspace")}
          </Link>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {t("pendingCountLabel")}
          </div>
          <div className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {snapshot.pendingCount}
          </div>
        </div>
      </div>

      <div className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "flex flex-col gap-3 p-4")}>
        <label className="flex min-w-[12rem] max-w-xs flex-col gap-1 text-xs text-[var(--muted)]">
          {tWorkspace("filterYear")}
          <SceToolbarSelect
            value={selectedYearId}
            onChange={(e) => pushYear(e.target.value)}
            aria-label={tWorkspace("filterYear")}
          >
            {snapshot.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </SceToolbarSelect>
        </label>

        {feedback ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {feedback}
          </p>
        ) : null}

        {snapshot.pendingItems.length === 0 ? (
          <div
            className={FINANCE_EMPTY_DRAFT_SURFACE_CLASS}
            data-finance-commitment-approval-zero
          >
            <h3 className={FINANCE_SECTION_HEADER_CLASS}>{t("zeroTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("zeroBody")}</p>
          </div>
        ) : (
          <ul
            className="divide-y divide-[var(--sce-color-border-standard)]"
            data-finance-commitment-approval-pending-list
          >
            {snapshot.pendingItems.map((item) => (
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
                    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                      <span>{formatCalendarDate(item.commitmentDateIso)}</span>
                      {item.financialAccountName ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="break-words">{item.financialAccountName}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end sm:text-right">
                    <div className="tabular-nums text-base font-semibold text-[var(--foreground)]">
                      {formatMoney(item.amountMinor, item.currency)}
                    </div>
                    {item.expectedPaymentDateIso ? (
                      <div className="text-xs text-[var(--muted)]">
                        {t("expectedPaymentShort", {
                          date: formatCalendarDate(item.expectedPaymentDateIso),
                        })}
                      </div>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {snapshot.recentDecisions.length > 0 ? (
        <div className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "p-4")}>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-medium text-[var(--foreground)]"
            onClick={() => setShowRecent((v) => !v)}
            aria-expanded={showRecent}
          >
            {t("recentDecisionsToggle")}
            <span className="text-[var(--muted)]">{showRecent ? "−" : "+"}</span>
          </button>
          {showRecent ? (
            <ul className="mt-3 divide-y divide-[var(--sce-color-border-standard)] text-sm">
              {snapshot.recentDecisions.map((row) => (
                <li key={`${row.id}-${row.decidedAtIso}`} className="py-2">
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <span className="font-medium">{row.title}</span>
                      <span className="ms-2 text-[var(--muted)]">
                        {tWorkspace(financeCommitmentApprovalLabelKey(row.approvalStatus))}
                      </span>
                    </div>
                    <div className="tabular-nums text-[var(--foreground)]">
                      {formatMoney(row.amountMinor, row.currency)}
                    </div>
                  </div>
                  {row.decisionComment ? (
                    <p className="mt-1 break-words text-xs text-[var(--muted)]">
                      {row.decisionComment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Sheet
        open={Boolean(detailId && detail)}
        onClose={closeDetail}
        title={detail?.title ?? t("decisionSheetTitle")}
      >
        {detail && decisionContext ? (
          <div
            className="min-w-0 max-w-full space-y-5 overflow-x-hidden pb-2"
            data-finance-commitment-approval-decision
          >
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("decisionPrompt")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {decisionContext.amount}
              </p>
              {detail.partyName ? (
                <p className="text-sm text-[var(--text-2)]">{detail.partyName}</p>
              ) : null}
              <p className="text-sm text-[var(--foreground)]">
                {decisionContext.lifecycle} · {decisionContext.approval}
              </p>
            </div>

            <dl className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm">
              <div className="grid min-w-0 gap-0.5 sm:grid-cols-[minmax(9rem,42%)_1fr]">
                <dt className="text-[var(--muted)]">{tWorkspace("fieldCommitmentDate")}</dt>
                <dd className="break-words">{formatCalendarDate(detail.commitmentDateIso)}</dd>
              </div>
              {detail.expectedPaymentDateIso ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[minmax(9rem,42%)_1fr]">
                  <dt className="text-[var(--muted)]">{tWorkspace("fieldExpectedPayment")}</dt>
                  <dd className="break-words">
                    {formatCalendarDate(detail.expectedPaymentDateIso)}
                  </dd>
                </div>
              ) : null}
              {detail.financialAccountName ? (
                <div className="grid min-w-0 gap-0.5 sm:grid-cols-[minmax(9rem,42%)_1fr]">
                  <dt className="text-[var(--muted)]">{tWorkspace("fieldAccount")}</dt>
                  <dd className="break-words">{detail.financialAccountName}</dd>
                </div>
              ) : null}
            </dl>

            {detail.description ? (
              <div className="min-w-0 border-t border-[var(--sce-surface-border-subtle)] pt-4 text-sm">
                <div className="text-xs font-medium text-[var(--muted)]">
                  {tWorkspace("fieldDescription")}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{detail.description}</p>
              </div>
            ) : null}

            {detail.canApprove ? (
              <div
                className="flex min-w-0 flex-col gap-2 border-t border-[var(--sce-surface-border-subtle)] pt-4 sm:flex-row sm:flex-wrap"
                data-finance-commitment-approval-actions
              >
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={pending}
                  onClick={handleApprove}
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
                >
                  {t("rejectAction")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t("rejectDialogTitle")}
        description={t("rejectDialogDescription")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button type="button" variant="secondary" onClick={() => setRejectOpen(false)}>
              {tWorkspace("dismiss")}
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={handleRejectConfirm}>
              {t("rejectConfirmAction")}
            </Button>
          </div>
        }
      >
        <SceFormField label={t("rejectReasonLabel")} htmlFor={rejectFieldId}>
          <SceTextarea
            id={rejectFieldId}
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
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
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
  FINANCE_COMMITMENT_EMPTY_IN_SURFACE_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_FILTERS_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_LIST_CLASS,
  FINANCE_COMMITMENT_OPERATIONAL_SURFACE_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { formatFinanceCalendarDateLabel } from "@/lib/finance/setup/finance-year-period-display";
import { FinanceCommitmentApprovalBadge } from "@/components/admin/finance/commitment/FinanceCommitmentStatusBadge";
import { FinanceCommitmentDetailSheetBody } from "@/components/admin/finance/commitment/FinanceCommitmentDetailSheetBody";
import {
  FinanceCommitmentListHeader,
  FinanceCommitmentListRow,
} from "@/components/admin/finance/commitment/FinanceCommitmentListRow";
import { FinanceCommitmentRejectDialog } from "@/components/admin/finance/commitment/FinanceCommitmentRejectDialog";
import { Sheet } from "@/components/ui/Sheet";

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
        <div
          className={cn(
            "rounded-md border border-[var(--sce-surface-border-subtle)] px-3 py-2 text-end",
            snapshot.pendingCount > 0 &&
              "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)]/20",
          )}
          data-finance-commitment-approval-pending-kpi
        >
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("pendingCountLabel")}
          </div>
          <div className="text-2xl font-semibold tabular-nums leading-tight text-[var(--foreground)]">
            {snapshot.pendingCount}
          </div>
        </div>
      </div>

      <div
        className={FINANCE_COMMITMENT_OPERATIONAL_SURFACE_CLASS}
        data-finance-commitment-operational-surface
      >
        <div className={FINANCE_COMMITMENT_OPERATIONAL_FILTERS_CLASS}>
          <label className="flex min-w-[10.5rem] max-w-xs flex-col gap-1 text-[0.6875rem] font-medium text-[var(--muted)]">
            {tWorkspace("filterYear")}
            <SceToolbarSelect
              value={snapshot.selectedYearId ?? ""}
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
        </div>

        <div className={FINANCE_COMMITMENT_OPERATIONAL_LIST_CLASS}>
          {feedback ? (
            <p className="px-2 py-2 text-sm text-[var(--destructive)]" role="alert">
              {feedback}
            </p>
          ) : null}

          {snapshot.pendingItems.length === 0 ? (
            <div
              className={FINANCE_COMMITMENT_EMPTY_IN_SURFACE_CLASS}
              data-finance-commitment-approval-zero
            >
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("zeroTitle")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{t("zeroBody")}</p>
            </div>
          ) : (
            <div data-finance-commitment-approval-pending-list className="min-w-0">
              <FinanceCommitmentListHeader t={tWorkspace} layout="inbox" />
              <ul className="divide-y divide-[var(--sce-surface-border-subtle)]/80">
                {snapshot.pendingItems.map((item) => (
                  <li key={item.id}>
                    <FinanceCommitmentListRow
                      item={item}
                      t={tWorkspace}
                      formatMoney={formatMoney}
                      formatCalendarDate={formatCalendarDate}
                      selected={detailId === item.id}
                      onOpen={() => void openDetail(item.id)}
                      layout="inbox"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {snapshot.recentDecisions.length > 0 ? (
        <div className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "!px-4 !py-3")}>
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
            <ul className="mt-2 divide-y divide-[var(--sce-color-border-standard)] text-sm">
              {snapshot.recentDecisions.map((row) => (
                <li key={`${row.id}-${row.decidedAtIso}`} className="py-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <span className="font-medium">{row.title}</span>
                      <FinanceCommitmentApprovalBadge
                        status={row.approvalStatus}
                        t={tWorkspace}
                      />
                    </div>
                    <div className="tabular-nums font-medium text-[var(--foreground)]">
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
        fitContent
      >
        {detail ? (
          <div data-finance-commitment-approval-decision>
            <FinanceCommitmentDetailSheetBody
              detail={detail}
              t={tWorkspace}
              formatMoney={formatMoney}
              formatCalendarDate={formatCalendarDate}
              pending={pending}
              detailMenuOpen={false}
              onDetailMenuOpenChange={() => {}}
              detailMenuTriggerRef={{ current: null }}
              showLifecycleOverflow={false}
              showCancelInOverflowMenu={false}
              showDeleteInOverflowMenu={false}
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
              mode="inbox"
            />
          </div>
        ) : null}
      </Sheet>

      <FinanceCommitmentRejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        rejectError={rejectError}
        pending={pending}
        onConfirm={handleRejectConfirm}
        fieldId={rejectFieldId}
        t={t}
        dismissLabel={tWorkspace("dismiss")}
      />
    </div>
  );
}

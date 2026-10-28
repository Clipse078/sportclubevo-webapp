"use client";

import type { ReactNode, RefObject } from "react";
import { Ban, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  SceOverflowMenu,
  SceOverflowMenuDivider,
  SceOverflowMenuItem,
} from "@/components/sce/actions/SceOverflowMenu";
import { cn } from "@/lib/cn";
import type { FinanceCommitmentDetailRecord } from "@/lib/finance/services/finance-commitment-query-service";
import {
  financeCommitmentApproveButtonClassName,
  FinanceCommitmentStatusBadgeRow,
} from "@/components/admin/finance/commitment/FinanceCommitmentStatusBadge";
import {
  FINANCE_COMMITMENT_DETAIL_SECTION_TITLE_CLASS,
  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { FinanceCommitmentApprovalExplanationText } from "@/components/admin/finance/commitment/FinanceCommitmentApprovalExplanation";
import { resolveFinanceCommitmentDraftSubmitMessageKey } from "@/lib/finance/commitment/finance-commitment-approval-policy-presentation";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)]/80 pt-4"
    >
      <h3 className={FINANCE_COMMITMENT_DETAIL_SECTION_TITLE_CLASS}>{title}</h3>
      {children}
    </section>
  );
}

function DetailFieldGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <dl className="min-w-0 space-y-1.5 text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid min-w-0 gap-0.5 sm:grid-cols-[minmax(8.5rem,38%)_1fr] sm:gap-3"
        >
          <dt className="text-[var(--muted)]">{row.label}</dt>
          <dd className="min-w-0 break-words text-[var(--foreground)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type FinanceCommitmentDecisionHistoryProps = {
  history: FinanceCommitmentDetailRecord["approvalDecisionHistory"];
  t: TranslateFn;
  formatCalendarDate: (iso: string) => string;
};

export function FinanceCommitmentDecisionHistory({
  history,
  t,
  formatCalendarDate,
}: FinanceCommitmentDecisionHistoryProps) {
  if (history.length <= 1) return null;
  return (
    <DetailSection title={t("detailSectionDecisionHistory")}>
      <ol
        className="min-w-0 space-y-2 text-sm"
        data-finance-commitment-approval-history
      >
        {history.map((row, index) => {
          const dateLabel = formatCalendarDate(row.decidedAtIso.slice(0, 10));
          return (
            <li
              key={`${row.decidedAtIso}-${index}`}
              className="relative min-w-0 border-s border-[var(--sce-surface-border-subtle)] ps-3"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                <span className="font-medium text-[var(--foreground)]">
                  {t(
                    row.decision === "APPROVED"
                      ? "approvalApproved"
                      : "approvalRejected",
                  )}
                </span>
                <span className="text-[var(--muted)] tabular-nums">{dateLabel}</span>
                {row.decidedByDisplayName ? (
                  <>
                    <span className="text-[var(--muted)]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[var(--text-2)]">{row.decidedByDisplayName}</span>
                  </>
                ) : null}
              </div>
              {row.comment ? (
                <p className="mt-1 break-words text-xs text-[var(--text-2)]">{row.comment}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </DetailSection>
  );
}

export type FinanceCommitmentDetailSheetBodyProps = {
  detail: FinanceCommitmentDetailRecord;
  t: TranslateFn;
  formatMoney: (minor: number, cur: string) => string;
  formattingLocale: string;
  formatCalendarDate: (iso: string) => string;
  pending: boolean;
  detailMenuOpen: boolean;
  onDetailMenuOpenChange: (open: boolean) => void;
  detailMenuTriggerRef: RefObject<HTMLButtonElement | null>;
  showLifecycleOverflow: boolean;
  showCancelInOverflowMenu: boolean;
  showDeleteInOverflowMenu: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  onCancelOpen?: () => void;
  onDeleteOpen?: () => void;
  /** Inbox mode hides secondary lifecycle actions unless provided. */
  mode?: "workspace" | "inbox";
};

export function FinanceCommitmentDetailSheetBody({
  detail,
  t,
  formatMoney,
  formattingLocale,
  formatCalendarDate,
  pending,
  detailMenuOpen,
  onDetailMenuOpenChange,
  detailMenuTriggerRef,
  showLifecycleOverflow,
  showCancelInOverflowMenu,
  showDeleteInOverflowMenu,
  onApprove,
  onReject,
  onSubmit,
  onEdit,
  onCancelOpen,
  onDeleteOpen,
  mode = "workspace",
}: FinanceCommitmentDetailSheetBodyProps) {
  const basicsRows: Array<{ label: string; value: string }> = [
    { label: t("fieldCommitmentDate"), value: formatCalendarDate(detail.commitmentDateIso) },
  ];
  if (detail.expectedPaymentDateIso) {
    basicsRows.push({
      label: t("fieldExpectedPayment"),
      value: formatCalendarDate(detail.expectedPaymentDateIso),
    });
  }
  if (detail.financialAccountName) {
    basicsRows.push({ label: t("fieldAccount"), value: detail.financialAccountName });
  }
  if (detail.costCenterName) {
    basicsRows.push({ label: t("fieldCostCenter"), value: detail.costCenterName });
  }
  if (detail.externalReference) {
    basicsRows.push({ label: t("fieldReference"), value: detail.externalReference });
  }
  if (detail.responsibleDisplayName) {
    basicsRows.push({ label: t("fieldResponsible"), value: detail.responsibleDisplayName });
  }

  const latestDecisionComment =
    detail.approvalDecisionHistory[detail.approvalDecisionHistory.length - 1]?.comment ?? null;

  const showDecisionMeta =
    detail.approvalDecidedByDisplayName &&
    detail.approvalDecidedAtIso &&
    detail.approvalStatus !== "PENDING";

  const showDecisionReasonSection =
    detail.approvalStatus === "REJECTED" && Boolean(latestDecisionComment?.trim());

  const showPrimaryDecisionActions =
    detail.canApprove && onApprove && onReject && mode === "workspace";

  const showInboxDecisionActions =
    detail.canApprove && onApprove && onReject && mode === "inbox";

  return (
    <div
      className="min-w-0 max-w-full space-y-4 overflow-x-hidden"
      data-finance-commitment-detail
    >
      <div className="min-w-0 space-y-2.5">
        {detail.partyName ? (
          <p className="text-sm text-[var(--text-2)]">{detail.partyName}</p>
        ) : null}

        <p
          className={cn(
            FINANCE_SUMMARY_RESULT_VALUE_CLASS,
            "text-[1.75rem] leading-none tracking-tight break-words sm:text-[1.875rem]",
          )}
        >
          {formatMoney(detail.amountMinor, detail.currency)}
        </p>

        <FinanceCommitmentStatusBadgeRow
          lifecycleStatus={detail.lifecycleStatus}
          approvalStatus={detail.approvalStatus}
          t={t}
          className="gap-2"
        />

        {detail.approvalExplanation ? (
          <FinanceCommitmentApprovalExplanationText
            explanation={detail.approvalExplanation}
            t={t}
            formattingLocale={formattingLocale}
          />
        ) : null}

        {detail.approvalStatus === "PENDING" && !detail.canApprove && !detail.approvalExplanation ? (
          <p className="text-xs text-[var(--muted)]">{t("awaitingApprovalHint")}</p>
        ) : null}

        {showDecisionMeta ? (
          <p className="text-xs text-[var(--muted)]">
            {t("approvalDecisionMeta", {
              name: detail.approvalDecidedByDisplayName ?? "",
              date: formatCalendarDate(detail.approvalDecidedAtIso!.slice(0, 10)),
            })}
          </p>
        ) : null}

        {!detail.canEdit && detail.lifecycleStatus !== "DRAFT" ? (
          <p className="text-xs text-[var(--muted)]" data-finance-commitment-edit-blocked>
            {t("editUnavailableSubmitted")}
          </p>
        ) : null}
      </div>

      {showPrimaryDecisionActions || showInboxDecisionActions ? (
        <div
          className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          data-finance-commitment-detail-actions
        >
          <Button
            type="button"
            onClick={onApprove}
            disabled={pending}
            className={cn("h-9 w-full sm:w-auto", financeCommitmentApproveButtonClassName())}
            data-finance-commitment-approve-action
          >
            {t("approveAction")}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-9 w-full sm:w-auto"
            disabled={pending}
            onClick={onReject}
            data-finance-commitment-reject-action
          >
            {t("rejectAction")}
          </Button>
          {showLifecycleOverflow && mode === "workspace" ? (
            <div className="sm:ms-auto" data-finance-commitment-lifecycle-menu>
              <SceOverflowMenu
                open={detailMenuOpen}
                onOpenChange={onDetailMenuOpenChange}
                anchorRef={detailMenuTriggerRef}
                triggerLabel={t("detailMenuTrigger")}
                menuLabel={t("detailMenuLabel")}
                triggerIcon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
                floatingLayer="composer"
              >
                {showCancelInOverflowMenu && onCancelOpen ? (
                  <SceOverflowMenuItem
                    icon={<Ban className="h-4 w-4" />}
                    label={t("cancelAction")}
                    onSelect={onCancelOpen}
                  />
                ) : null}
                {showDeleteInOverflowMenu && onDeleteOpen ? (
                  <>
                    {showCancelInOverflowMenu ? <SceOverflowMenuDivider /> : null}
                    <SceOverflowMenuItem
                      icon={<Trash2 className="h-4 w-4" />}
                      label={t("deleteDraftAction")}
                      destructive
                      onSelect={onDeleteOpen}
                    />
                  </>
                ) : null}
              </SceOverflowMenu>
            </div>
          ) : null}
        </div>
      ) : null}

      {basicsRows.length > 0 ? (
        <DetailSection title={t("detailSectionBasics")}>
          <DetailFieldGrid rows={basicsRows} />
        </DetailSection>
      ) : null}

      {detail.description ? (
        <DetailSection title={t("fieldDescription")}>
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
            {detail.description}
          </p>
        </DetailSection>
      ) : null}

      {showDecisionReasonSection ? (
        <DetailSection title={t("detailSectionDecision")}>
          <div className="space-y-1 text-sm">
            <p className="text-xs font-medium text-[var(--muted)]">{t("rejectReasonLabel")}</p>
            <p className="break-words text-[var(--foreground)]">&ldquo;{latestDecisionComment}&rdquo;</p>
          </div>
        </DetailSection>
      ) : null}

      <FinanceCommitmentDecisionHistory
        history={detail.approvalDecisionHistory}
        t={t}
        formatCalendarDate={formatCalendarDate}
      />

      {!showPrimaryDecisionActions && !showInboxDecisionActions ? (
        <div
          className="flex min-w-0 flex-col gap-2 border-t border-[var(--sce-surface-border-subtle)]/80 pt-4 sm:flex-row sm:flex-wrap sm:items-center"
          data-finance-commitment-detail-actions
        >
          {detail.canSubmit && onSubmit ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              className="h-9 w-full sm:w-auto"
              data-finance-commitment-submit-action
            >
              {t(resolveFinanceCommitmentDraftSubmitMessageKey(detail.approvalExplanation))}
            </Button>
          ) : null}
          {detail.canEdit && onEdit ? (
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full sm:w-auto"
              onClick={onEdit}
            >
              {t("editAction")}
            </Button>
          ) : null}
          {showLifecycleOverflow && mode === "workspace" ? (
            <div className="sm:ms-auto" data-finance-commitment-lifecycle-menu>
              <SceOverflowMenu
                open={detailMenuOpen}
                onOpenChange={onDetailMenuOpenChange}
                anchorRef={detailMenuTriggerRef}
                triggerLabel={t("detailMenuTrigger")}
                menuLabel={t("detailMenuLabel")}
                triggerIcon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
                floatingLayer="composer"
              >
                {showCancelInOverflowMenu && onCancelOpen ? (
                  <SceOverflowMenuItem
                    icon={<Ban className="h-4 w-4" />}
                    label={t("cancelAction")}
                    onSelect={onCancelOpen}
                  />
                ) : null}
                {showDeleteInOverflowMenu && onDeleteOpen ? (
                  <>
                    {showCancelInOverflowMenu ? <SceOverflowMenuDivider /> : null}
                    <SceOverflowMenuItem
                      icon={<Trash2 className="h-4 w-4" />}
                      label={t("deleteDraftAction")}
                      destructive
                      onSelect={onDeleteOpen}
                    />
                  </>
                ) : null}
              </SceOverflowMenu>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

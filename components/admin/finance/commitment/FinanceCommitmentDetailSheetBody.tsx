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
  FinanceCommitmentApprovalBadge,
  FinanceCommitmentStatusBadgeRow,
  financeCommitmentApproveButtonClassName,
} from "@/components/admin/finance/commitment/FinanceCommitmentStatusBadge";
import { FINANCE_SUMMARY_RESULT_VALUE_CLASS } from "@/lib/finance/finance-workspace-surfaces";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-2 border-t border-[var(--sce-surface-border-subtle)] pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
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
  if (history.length === 0) return null;
  return (
    <DetailSection title={t("detailSectionDecisionHistory")}>
      <ol
        className="min-w-0 space-y-2.5 text-sm"
        data-finance-commitment-approval-history
      >
        {history.map((row, index) => {
          const dateLabel = formatCalendarDate(row.decidedAtIso.slice(0, 10));
          return (
            <li key={`${row.decidedAtIso}-${index}`} className="relative min-w-0 ps-4">
              <span
                className="absolute start-0 top-2 h-1.5 w-1.5 rounded-full bg-[var(--sce-surface-border-strong)]"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <FinanceCommitmentApprovalBadge status={row.decision} t={t} />
                <span className="text-xs text-[var(--muted)] tabular-nums">{dateLabel}</span>
                {row.decidedByDisplayName ? (
                  <>
                    <span className="text-xs text-[var(--muted)]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-[var(--text-2)]">{row.decidedByDisplayName}</span>
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

  const showDecisionMeta =
    detail.approvalDecidedByDisplayName &&
    detail.approvalDecidedAtIso &&
    detail.approvalStatus !== "PENDING";

  const showPrimaryDecisionActions =
    detail.canApprove && onApprove && onReject && mode === "workspace";

  const showInboxDecisionActions =
    detail.canApprove && onApprove && onReject && mode === "inbox";

  return (
    <div
      className="min-w-0 max-w-full space-y-3 overflow-x-hidden pb-1"
      data-finance-commitment-detail
    >
      {detail.partyName ? (
        <p className="text-sm text-[var(--text-2)]">{detail.partyName}</p>
      ) : null}

      <div className="min-w-0 space-y-2">
        <p className={cn(FINANCE_SUMMARY_RESULT_VALUE_CLASS, "text-2xl break-words sm:text-[1.65rem]")}>
          {formatMoney(detail.amountMinor, detail.currency)}
        </p>
        <FinanceCommitmentStatusBadgeRow
          lifecycleStatus={detail.lifecycleStatus}
          approvalStatus={detail.approvalStatus}
          t={t}
        />
        {detail.approvalStatus === "PENDING" && !detail.canApprove ? (
          <p className="text-xs text-[var(--muted)]">{t("awaitingApprovalHint")}</p>
        ) : null}
        {showDecisionMeta ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span>
              {t("approvalDecisionMeta", {
                name: detail.approvalDecidedByDisplayName ?? "",
                date: formatCalendarDate(detail.approvalDecidedAtIso!.slice(0, 10)),
              })}
            </span>
          </div>
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
            className={cn("w-full sm:w-auto", financeCommitmentApproveButtonClassName())}
            data-finance-commitment-approve-action
          >
            {t("approveAction")}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="w-full sm:w-auto"
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

      {detail.approvalStatus !== "NOT_REQUIRED" &&
      detail.approvalStatus !== "PENDING" &&
      detail.approvalDecisionHistory.length > 0 ? (
        <DetailSection title={t("detailSectionApproval")}>
          <div className="space-y-2 text-sm">
            <FinanceCommitmentApprovalBadge status={detail.approvalStatus} t={t} />
            {detail.approvalDecisionHistory[detail.approvalDecisionHistory.length - 1]?.comment ? (
              <p className="break-words text-xs text-[var(--text-2)]">
                {
                  detail.approvalDecisionHistory[detail.approvalDecisionHistory.length - 1]
                    ?.comment
                }
              </p>
            ) : null}
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
          className="flex min-w-0 flex-col gap-2 border-t border-[var(--sce-surface-border-subtle)] pt-3 sm:flex-row sm:flex-wrap sm:items-center"
          data-finance-commitment-detail-actions
        >
          {detail.canSubmit && onSubmit ? (
            <Button type="button" onClick={onSubmit} disabled={pending} className="w-full sm:w-auto">
              {t("submitAction")}
            </Button>
          ) : null}
          {detail.canEdit && onEdit ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
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

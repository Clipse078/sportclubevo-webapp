"use client";

import { cn } from "@/lib/cn";
import type { FinanceCommitmentListItem } from "@/lib/finance/services/finance-commitment-query-service";
import { FinanceCommitmentStatusBadgeRow } from "@/components/admin/finance/commitment/FinanceCommitmentStatusBadge";

type TranslateFn = (key: string) => string;

const WORKSPACE_GRID =
  "sm:grid-cols-[minmax(0,1.55fr)_minmax(0,1.05fr)_minmax(6.5rem,0.72fr)_minmax(4.25rem,0.48fr)_minmax(4.25rem,0.48fr)_minmax(0,0.62fr)_minmax(10.5rem,1fr)]";

const INBOX_GRID =
  "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.95fr)_minmax(6.5rem,0.72fr)_minmax(4.25rem,0.48fr)_minmax(0,0.68fr)_minmax(10rem,1fr)]";

export type FinanceCommitmentListRowProps = {
  item: FinanceCommitmentListItem;
  t: TranslateFn;
  formatMoney: (minor: number, cur: string) => string;
  formatCalendarDate: (iso: string) => string;
  selected?: boolean;
  onOpen: () => void;
  layout?: "workspace" | "inbox";
};

export function FinanceCommitmentListRow({
  item,
  t,
  formatMoney,
  formatCalendarDate,
  selected = false,
  onOpen,
  layout = "workspace",
}: FinanceCommitmentListRowProps) {
  const gridClass = layout === "inbox" ? INBOX_GRID : WORKSPACE_GRID;

  return (
    <button
      type="button"
      className={cn(
        "group flex w-full min-w-0 cursor-pointer flex-col gap-1.5 px-2 py-2 text-left transition-[background-color,box-shadow] duration-150",
        "hover:bg-[var(--surface-2)]/65",
        selected &&
          "bg-[var(--surface-2)]/90 shadow-[inset_2px_0_0_0_var(--sce-primary)]",
        "sm:grid sm:items-center sm:gap-x-3 sm:py-[0.4375rem]",
        gridClass,
      )}
      onClick={onOpen}
      data-finance-commitment-list-row
      data-commitment-id={item.id}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium leading-snug text-[var(--foreground)]">
          {item.title}
        </div>
        {item.partyName ? (
          <div className="truncate text-xs text-[var(--text-2)] sm:hidden">{item.partyName}</div>
        ) : null}
      </div>

      <div className="hidden min-w-0 truncate text-xs text-[var(--text-2)] sm:block">
        {item.partyName ?? "—"}
      </div>

      <div className="tabular-nums text-sm font-semibold tracking-tight text-[var(--foreground)] sm:text-end">
        {formatMoney(item.amountMinor, item.currency)}
      </div>

      <div className="hidden text-xs text-[var(--muted)] tabular-nums sm:block">
        {formatCalendarDate(item.commitmentDateIso)}
      </div>

      {layout === "workspace" ? (
        <div className="hidden text-xs text-[var(--muted)] tabular-nums sm:block">
          {item.expectedPaymentDateIso
            ? formatCalendarDate(item.expectedPaymentDateIso)
            : "—"}
        </div>
      ) : null}

      <div className="hidden min-w-0 truncate text-xs text-[var(--text-2)] sm:block">
        {item.financialAccountName ?? "—"}
      </div>

      <div className="min-w-0 justify-self-stretch sm:min-w-[10rem] sm:justify-self-end">
        <FinanceCommitmentStatusBadgeRow
          lifecycleStatus={item.lifecycleStatus}
          approvalStatus={item.approvalStatus}
          t={t}
          className="sm:flex-nowrap sm:justify-end"
        />
      </div>
    </button>
  );
}

export function FinanceCommitmentListHeader({
  t,
  layout = "workspace",
}: {
  t: TranslateFn;
  layout?: "workspace" | "inbox";
}) {
  const gridClass = layout === "inbox" ? INBOX_GRID : WORKSPACE_GRID;

  return (
    <div
      className={cn(
        "hidden min-w-0 border-b border-[var(--sce-surface-border-subtle)]/70 px-2 pb-2 pt-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-[var(--muted)] sm:grid sm:gap-x-3",
        gridClass,
      )}
      data-finance-commitment-list-header
    >
      <span>{t("colTitle")}</span>
      <span>{t("colParty")}</span>
      <span className="text-end">{t("colAmount")}</span>
      <span>{t("colCommitmentDate")}</span>
      {layout === "workspace" ? <span>{t("colExpectedPayment")}</span> : null}
      <span>{t("colAccount")}</span>
      <span className="text-end">{t("colStatus")}</span>
    </div>
  );
}

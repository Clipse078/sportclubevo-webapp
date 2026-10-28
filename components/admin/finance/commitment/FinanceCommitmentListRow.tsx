"use client";

import { cn } from "@/lib/cn";
import type { FinanceCommitmentListItem } from "@/lib/finance/services/finance-commitment-query-service";
import { FinanceCommitmentStatusBadgeRow } from "@/components/admin/finance/commitment/FinanceCommitmentStatusBadge";

type TranslateFn = (key: string) => string;

const WORKSPACE_GRID =
  "sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(5rem,0.65fr)_minmax(4.5rem,0.55fr)_minmax(4.5rem,0.55fr)_minmax(0,0.7fr)_minmax(0,7.5rem)]";

const INBOX_GRID =
  "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(5rem,0.65fr)_minmax(4.5rem,0.55fr)_minmax(0,0.75fr)_minmax(0,7rem)]";

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
        "group flex w-full min-w-0 flex-col gap-2 px-2 py-2.5 text-left transition-colors",
        "hover:bg-[var(--surface-2)]/80",
        selected && "bg-[var(--surface-2)]",
        "sm:grid sm:items-center sm:gap-x-3",
        gridClass,
      )}
      onClick={onOpen}
      data-finance-commitment-list-row
      data-commitment-id={item.id}
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-[var(--foreground)]">{item.title}</div>
        {item.partyName ? (
          <div className="truncate text-xs text-[var(--text-2)] sm:hidden">{item.partyName}</div>
        ) : null}
      </div>

      <div className="hidden min-w-0 truncate text-xs text-[var(--text-2)] sm:block">
        {item.partyName ?? "—"}
      </div>

      <div className="tabular-nums text-sm font-semibold text-[var(--foreground)] sm:text-end">
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

      <div className="min-w-0 justify-self-start sm:justify-self-end">
        <FinanceCommitmentStatusBadgeRow
          lifecycleStatus={item.lifecycleStatus}
          approvalStatus={item.approvalStatus}
          t={t}
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
        "hidden min-w-0 px-2 pb-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-[var(--muted)] sm:grid sm:gap-x-3",
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

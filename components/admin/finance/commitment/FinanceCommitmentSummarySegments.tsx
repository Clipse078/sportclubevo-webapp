"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clock3, FileEdit, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

type TranslateFn = (key: string) => string;

export type FinanceCommitmentSummarySegmentsProps = {
  pendingCount: number;
  activeCount: number;
  draftCount: number;
  canApprove: boolean;
  activeAmountLabel: string | null;
  activeAmountFormatted: string | null;
  t: TranslateFn;
};

function Segment({
  icon,
  label,
  count,
  accent,
  href,
  linkLabel,
  dataAttr,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  accent?: "attention" | "default";
  href?: string;
  linkLabel?: string;
  dataAttr?: string;
}) {
  const inner = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm,0.25rem)]",
          accent === "attention" && count > 0
            ? "bg-[var(--sce-warning-light)] text-[var(--sce-color-status-warning)]"
            : "bg-[var(--surface-2)]/70 text-[var(--muted)]",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-[0.6875rem] font-medium leading-tight",
            accent === "attention" && count > 0
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)]",
          )}
        >
          {label}
        </div>
        <div className="text-lg font-semibold tabular-nums leading-none tracking-tight text-[var(--foreground)]">
          {count}
        </div>
      </div>
    </div>
  );

  const className = cn(
    "min-w-0 px-3 py-2 sm:px-4 sm:py-2.5",
    accent === "attention" &&
      count > 0 &&
      "bg-[var(--sce-warning-light)]/15 sm:rounded-none",
    href && count > 0 && "transition-colors hover:bg-[var(--surface-2)]/50",
  );

  if (href && count > 0) {
    return (
      <Link
        href={href}
        className={className}
        data-finance-commitment-summary-segment={dataAttr}
        data-finance-commitment-approval-inbox-link={dataAttr === "pending" ? true : undefined}
        aria-label={linkLabel ?? label}
        title={linkLabel}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={className} data-finance-commitment-summary-segment={dataAttr}>
      {inner}
    </div>
  );
}

export function FinanceCommitmentSummarySegments({
  pendingCount,
  activeCount,
  draftCount,
  canApprove,
  activeAmountLabel,
  activeAmountFormatted,
  t,
}: FinanceCommitmentSummarySegmentsProps) {
  const pendingHref =
    canApprove && pendingCount > 0 ? "/dashboard/finance/commitments/approvals" : undefined;

  return (
    <div
      className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "py-0")}
      data-finance-commitment-status-summary
    >
      <div className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
        <Segment
          dataAttr="pending"
          icon={<Clock3 className="h-3.5 w-3.5" strokeWidth={2} />}
          label={t("summaryPending")}
          count={pendingCount}
          accent={pendingCount > 0 ? "attention" : "default"}
          href={pendingHref}
          linkLabel={pendingHref ? t("summaryPendingOpenApprovals") : undefined}
        />
        <Segment
          dataAttr="active"
          icon={<CircleDot className="h-3.5 w-3.5" strokeWidth={2} />}
          label={t("summaryActive")}
          count={activeCount}
        />
        <Segment
          dataAttr="drafts"
          icon={<FileEdit className="h-3.5 w-3.5" strokeWidth={2} />}
          label={t("summaryDrafts")}
          count={draftCount}
        />
      </div>
      {activeAmountLabel && activeAmountFormatted ? (
        <p className="border-t border-[var(--sce-surface-border-subtle)]/80 px-4 py-2 text-xs text-[var(--muted)] sm:px-5">
          <span className="font-semibold tabular-nums text-[var(--foreground)]">
            {activeAmountFormatted}
          </span>
          <span className="ms-2">{activeAmountLabel}</span>
        </p>
      ) : null}
    </div>
  );
}

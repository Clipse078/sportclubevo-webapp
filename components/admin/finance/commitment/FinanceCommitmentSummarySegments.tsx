"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Clock3, FileEdit, CircleDot } from "lucide-react";
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
    <>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
            accent === "attention"
              ? "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-color-status-warning)]"
              : "border-[var(--sce-surface-border-subtle)] bg-[var(--surface-2)]/50 text-[var(--muted)]",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div
            className={cn(
              "text-xs font-medium",
              accent === "attention" ? "text-[var(--foreground)]" : "text-[var(--muted)]",
            )}
          >
            {label}
          </div>
          <div className="text-lg font-semibold tabular-nums leading-tight text-[var(--foreground)]">
            {count}
          </div>
        </div>
        {href && count > 0 ? (
          <ChevronRight
            className="ms-auto h-4 w-4 shrink-0 text-[var(--muted)]"
            aria-hidden="true"
          />
        ) : null}
      </div>
      {href && count > 0 && linkLabel ? (
        <span className="mt-1 block text-xs font-medium text-[var(--link)]">{linkLabel}</span>
      ) : null}
    </>
  );

  const className = cn(
    "min-w-0 rounded-md px-2 py-2 transition-colors sm:px-3",
    accent === "attention" && count > 0 && "bg-[var(--sce-warning-light)]/25 ring-1 ring-inset ring-[var(--sce-warning-border)]/40",
    href && count > 0 && "hover:bg-[var(--surface-2)]/60",
  );

  if (href && count > 0) {
    return (
      <Link
        href={href}
        className={className}
        data-finance-commitment-summary-segment={dataAttr}
        data-finance-commitment-approval-inbox-link={dataAttr === "pending" ? true : undefined}
        aria-label={linkLabel ?? label}
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
      className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "py-2.5")}
      data-finance-commitment-status-summary
    >
      <div className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
        <Segment
          dataAttr="pending"
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label={t("summaryPending")}
          count={pendingCount}
          accent={pendingCount > 0 ? "attention" : "default"}
          href={pendingHref}
          linkLabel={pendingHref ? t("summaryPendingOpenApprovals") : undefined}
        />
        <Segment
          dataAttr="active"
          icon={<CircleDot className="h-3.5 w-3.5" />}
          label={t("summaryActive")}
          count={activeCount}
        />
        <Segment
          dataAttr="drafts"
          icon={<FileEdit className="h-3.5 w-3.5" />}
          label={t("summaryDrafts")}
          count={draftCount}
        />
      </div>
      {activeAmountLabel && activeAmountFormatted ? (
        <p className="mt-2 border-t border-[var(--sce-surface-border-subtle)] pt-2 text-xs text-[var(--muted)]">
          <span className="font-medium tabular-nums text-[var(--foreground)]">
            {activeAmountFormatted}
          </span>
          <span className="ms-2">{activeAmountLabel}</span>
        </p>
      ) : null}
    </div>
  );
}

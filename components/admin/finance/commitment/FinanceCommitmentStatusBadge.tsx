"use client";

import {
  Ban,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileEdit,
  Send,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import {
  financeCommitmentApprovalBadgeVariant,
  financeCommitmentApprovalLabelKey,
  financeCommitmentLifecycleBadgeVariant,
  financeCommitmentLifecycleLabelKey,
} from "@/lib/finance/commitment/finance-commitment-status-presentation";

type TranslateFn = (key: string) => string;

const BADGE_ICON_CLASS = "h-3 w-3 shrink-0 opacity-90";

function LifecycleIcon({ status }: { status: string }) {
  switch (status) {
    case "DRAFT":
      return <FileEdit className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "SUBMITTED":
      return <Send className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "ACTIVE":
      return <CircleDot className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "FULFILLED":
      return <CheckCircle2 className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "CANCELLED":
      return <Ban className={BADGE_ICON_CLASS} aria-hidden="true" />;
    default:
      return null;
  }
}

function ApprovalIcon({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <Clock3 className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "APPROVED":
      return <CheckCircle2 className={BADGE_ICON_CLASS} aria-hidden="true" />;
    case "REJECTED":
      return <XCircle className={BADGE_ICON_CLASS} aria-hidden="true" />;
    default:
      return null;
  }
}

type FinanceCommitmentLifecycleBadgeProps = {
  status: string;
  t: TranslateFn;
  size?: "sm" | "default";
  className?: string;
};

export function FinanceCommitmentLifecycleBadge({
  status,
  t,
  size = "sm",
  className,
}: FinanceCommitmentLifecycleBadgeProps) {
  const label = t(financeCommitmentLifecycleLabelKey(status));
  return (
    <Badge
      variant={financeCommitmentLifecycleBadgeVariant(status)}
      size={size}
      className={cn("max-w-full", className)}
      data-finance-commitment-lifecycle-badge
      data-status={status}
    >
      <LifecycleIcon status={status} />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

type FinanceCommitmentApprovalBadgeProps = {
  status: string;
  t: TranslateFn;
  size?: "sm" | "default";
  className?: string;
};

export function FinanceCommitmentApprovalBadge({
  status,
  t,
  size = "sm",
  className,
}: FinanceCommitmentApprovalBadgeProps) {
  const variant = financeCommitmentApprovalBadgeVariant(status);
  if (variant == null) return null;
  const label = t(financeCommitmentApprovalLabelKey(status));
  return (
    <Badge
      variant={variant}
      size={size}
      className={cn("max-w-full", className)}
      data-finance-commitment-approval-badge
      data-status={status}
    >
      <ApprovalIcon status={status} />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

type FinanceCommitmentStatusBadgeRowProps = {
  lifecycleStatus: string;
  approvalStatus: string;
  t: TranslateFn;
  className?: string;
  /** When false, hide approval badge if NOT_REQUIRED (default true). */
  showNotRequiredApproval?: boolean;
};

export function FinanceCommitmentStatusBadgeRow({
  lifecycleStatus,
  approvalStatus,
  t,
  className,
  showNotRequiredApproval = false,
}: FinanceCommitmentStatusBadgeRowProps) {
  const showApproval =
    approvalStatus !== "NOT_REQUIRED" || showNotRequiredApproval;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 sm:flex-nowrap",
        className,
      )}
      data-finance-commitment-status-row
    >
      <FinanceCommitmentLifecycleBadge status={lifecycleStatus} t={t} />
      {showApproval ? (
        <FinanceCommitmentApprovalBadge status={approvalStatus} t={t} />
      ) : null}
    </div>
  );
}

export function financeCommitmentApproveButtonClassName(): string {
  return cn(
    "border-transparent bg-[var(--sce-color-status-success)] text-white",
    "hover:bg-[var(--sce-success-hover)]",
    "focus-visible:ring-[var(--sce-color-status-success)]",
  );
}

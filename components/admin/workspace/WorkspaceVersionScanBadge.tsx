"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

import type { WorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";

type Props = {
  scan: WorkspaceVersionScanPublicDto | undefined;
  compact?: boolean;
};

export function WorkspaceVersionScanBadge({ scan, compact = false }: Props) {
  const t = useTranslations("Workspace.scan");

  if (!scan) return null;

  const { contentAvailabilityReason } = scan;

  if (contentAvailabilityReason === "AVAILABLE") {
    return null;
  }

  if (contentAvailabilityReason === "BEING_CHECKED") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200 ${
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        } font-medium`}
        data-testid="workspace-scan-badge-being-checked"
      >
        <ShieldQuestion className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
        {t("beingChecked")}
      </span>
    );
  }

  if (contentAvailabilityReason === "BLOCKED") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-800 dark:text-red-200 ${
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        } font-medium`}
        data-testid="workspace-scan-badge-blocked"
      >
        <ShieldAlert className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
        {t("blocked")}
      </span>
    );
  }

  if (contentAvailabilityReason === "CHECK_FAILED") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-900 dark:text-orange-200 ${
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        } font-medium`}
        data-testid="workspace-scan-badge-check-failed"
      >
        <ShieldAlert className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
        {t("checkFailed")}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] text-[var(--text-2)] ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      } font-medium`}
      data-testid="workspace-scan-badge-unavailable"
    >
      <ShieldCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      {t("notAvailable")}
    </span>
  );
}

export function workspaceScanBlocksContentDelivery(
  scan: WorkspaceVersionScanPublicDto | undefined,
): boolean {
  return Boolean(scan && !scan.contentAvailable);
}

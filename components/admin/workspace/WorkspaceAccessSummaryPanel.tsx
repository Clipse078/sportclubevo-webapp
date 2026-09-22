"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

import type { WorkspaceAccessSummaryViewModel } from "@/lib/workspace/access/access-management-dto";

type WorkspaceAccessSummaryPanelProps = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  canManageAccess: boolean;
  onManageAccess?: () => void;
};

export function WorkspaceAccessSummaryPanel({
  resourceType,
  resourceId,
  canManageAccess,
  onManageAccess,
}: WorkspaceAccessSummaryPanelProps) {
  const t = useTranslations("Workspace.access");
  const [summary, setSummary] = useState<WorkspaceAccessSummaryViewModel | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const path =
      resourceType === "FOLDER"
        ? `/api/workspace/folders/${encodeURIComponent(resourceId)}/access-summary`
        : `/api/workspace/documents/${encodeURIComponent(resourceId)}/access-summary`;

    fetch(path)
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<{ summary: WorkspaceAccessSummaryViewModel }>;
      })
      .then((data) => {
        if (!cancelled) {
          setSummary(data.summary);
          setStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId, resourceType]);

  if (status === "loading") {
    return (
      <p className="text-xs text-[var(--muted)]">{t("summaryLoading")}</p>
    );
  }

  if (status === "error" || !summary || summary.entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("summaryTitle")}
        </h3>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-[var(--text-2)]">
        {summary.entries.map((entry) => (
          <li key={`${entry.audienceLabel}-${entry.levelLabel}`}>
            {entry.audienceLabel} · {entry.levelLabel}
          </li>
        ))}
        {summary.moreCount > 0 ? (
          <li className="text-xs text-[var(--muted)]">
            {t("summaryMore", { count: summary.moreCount })}
          </li>
        ) : null}
      </ul>
      {canManageAccess && onManageAccess ? (
        <button
          type="button"
          onClick={onManageAccess}
          className="mt-3 text-xs font-semibold text-[var(--blue)] hover:underline"
        >
          {t("manageButton")}
        </button>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";

import type { WorkspaceAccessSummaryViewModel } from "@/lib/workspace/access/access-management-dto";

import { WorkspaceAccessEntryRow } from "./WorkspaceAccessEntryRow";

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
      <p className="text-xs text-[var(--muted)]" role="status">
        {t("summaryLoading")}
      </p>
    );
  }

  if (status === "error" || !summary) {
    return (
      <p className="text-sm text-[var(--text-2)]" role="alert">
        {t("summaryLoadError")}
      </p>
    );
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby="workspace-access-summary-heading"
      data-testid="workspace-access-summary"
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden="true" />
          <h3
            id="workspace-access-summary-heading"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            {t("summaryTitle")}
          </h3>
        </div>
        <p className="mt-2 text-sm font-medium text-[var(--text)]">
          {summary.policyModeHeadline}
        </p>
        <p className="mt-1 text-xs text-[var(--text-2)]">
          {summary.inheritanceDescription}
        </p>
      </div>

      {summary.actorAuthority ? (
        <div data-testid="workspace-access-actor-authority">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("actorAuthoritySection")}
          </h4>
          <p className="mt-2 text-sm text-[var(--text)]">
            {summary.actorAuthority.effectiveLevelLabel}
            {summary.actorAuthority.sourceKind === "CLUB_ADMIN"
              ? ` · ${summary.actorAuthority.sourceLabel}`
              : null}
          </p>
        </div>
      ) : null}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("configuredAccessSection")}
        </h4>
        {summary.effectiveAccess.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-2)]">{t("summaryEmpty")}</p>
        ) : (
          <ul className="mt-2 space-y-2" data-testid="workspace-access-effective-list">
            {summary.effectiveAccess.map((entry) => (
              <WorkspaceAccessEntryRow
                key={`${entry.audienceKey}-${entry.effectiveLevel}`}
                entry={entry}
                multiplePathsLabel={(count) => t("multiplePaths", { count })}
                configuredLevelLabel={t("configuredLevelLabel")}
                effectiveLevelLabel={t("effectiveLevelLabel")}
                inheritedBadgeLabel={t("inheritedBadge")}
              />
            ))}
            {summary.moreCount > 0 ? (
              <li className="text-xs text-[var(--muted)]">
                {t("summaryMore", { count: summary.moreCount })}
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {canManageAccess && onManageAccess ? (
        <button
          type="button"
          onClick={onManageAccess}
          className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          data-testid="workspace-access-manage-button"
        >
          {t("manageButton")}
        </button>
      ) : !canManageAccess ? (
        <p className="text-xs text-[var(--muted)]">{t("restrictHint")}</p>
      ) : null}
    </section>
  );
}

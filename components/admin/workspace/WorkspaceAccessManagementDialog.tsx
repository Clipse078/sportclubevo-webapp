"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import { Dialog } from "@/components/ui/Dialog";
import type {
  WorkspaceAccessManagementViewModel,
  WorkspaceAccessSummaryViewModel,
} from "@/lib/workspace/access/access-management-dto";

import { WorkspaceAccessGrantEditor } from "./WorkspaceAccessGrantEditor";
import { WorkspaceAccessEntryRow } from "./WorkspaceAccessEntryRow";

type WorkspaceAccessManagementDialogProps = {
  open: boolean;
  onClose: () => void;
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  resourceName: string;
  onSaved?: () => void;
};

export function WorkspaceAccessManagementDialog({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  onSaved,
}: WorkspaceAccessManagementDialogProps) {
  const t = useTranslations("Workspace.access");
  const [viewModel, setViewModel] =
    useState<WorkspaceAccessManagementViewModel | null>(null);
  const [actorSummary, setActorSummary] =
    useState<WorkspaceAccessSummaryViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageAccessLost, setManageAccessLost] = useState(false);

  const apiBase =
    resourceType === "FOLDER"
      ? `/api/workspace/folders/${encodeURIComponent(resourceId)}/access`
      : `/api/workspace/documents/${encodeURIComponent(resourceId)}/access`;

  const summaryBase =
    resourceType === "FOLDER"
      ? `/api/workspace/folders/${encodeURIComponent(resourceId)}/access-summary`
      : `/api/workspace/documents/${encodeURIComponent(resourceId)}/access-summary`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setManageAccessLost(false);
    try {
      const [accessRes, summaryRes] = await Promise.all([
        fetch(apiBase),
        fetch(summaryBase),
      ]);
      const data = (await accessRes.json()) as {
        accessManagement?: WorkspaceAccessManagementViewModel;
        error?: string;
      };
      if (accessRes.status === 403) {
        setManageAccessLost(true);
        throw new Error(data.error ?? t("loadError"));
      }
      if (!accessRes.ok) {
        throw new Error(data.error ?? t("loadError"));
      }
      setViewModel(data.accessManagement ?? null);

      if (summaryRes.ok) {
        const summaryData = (await summaryRes.json()) as {
          summary?: WorkspaceAccessSummaryViewModel;
        };
        setActorSummary(summaryData.summary ?? null);
      } else {
        setActorSummary(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
      setViewModel(null);
      setActorSummary(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, summaryBase]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function returnToInheritance() {
    if (!viewModel) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessInheritanceMode: WorkspaceAccessInheritanceMode.INHERIT,
          grants: [],
        }),
      });
      const data = (await res.json()) as {
        accessManagement?: WorkspaceAccessManagementViewModel;
        error?: string;
      };
      if (res.status === 403) {
        setManageAccessLost(true);
        throw new Error(data.error ?? t("saveError"));
      }
      if (!res.ok) {
        throw new Error(data.error ?? t("saveError"));
      }
      setViewModel(data.accessManagement ?? null);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("dialogTitle")}
      description={t("dialogDescription", { name: resourceName })}
      size="workspace"
      footer={
        <button type="button" className="fca-button-secondary" onClick={onClose}>
          {t("closeButton")}
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-[var(--sce-danger)]">
          {error}
        </p>
      ) : null}

      {manageAccessLost ? (
        <p className="text-sm text-[var(--muted)]">{t("manageAccessLost")}</p>
      ) : null}

      {viewModel && !manageAccessLost ? (
        <div className="space-y-6">
          {actorSummary?.actorAuthority ? (
            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3">
              <h3 className="text-xs font-semibold text-[var(--text-2)]">
                {t("actorAuthoritySection")}
              </h3>
              <p className="mt-1 text-sm font-medium text-[var(--text)]">
                {actorSummary.actorAuthority.effectiveLevelLabel}
                {actorSummary.actorAuthority.sourceKind === "CLUB_ADMIN"
                  ? ` · ${actorSummary.actorAuthority.sourceLabel}`
                  : null}
              </p>
              {actorSummary.actorAuthority.configuredActorLevelLabel &&
              actorSummary.actorAuthority.sourceKind === "CLUB_ADMIN" ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("configuredAccessSection")}:{" "}
                  {actorSummary.actorAuthority.configuredActorLevelLabel}
                </p>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="workspace-who-has-access">
            <h3
              id="workspace-who-has-access"
              className="text-sm font-semibold text-[var(--text)]"
            >
              {t("whoHasAccessHeading")}
            </h3>
            <ul className="mt-3 space-y-2">
              {viewModel.effectiveAccess.map((entry) => (
                <WorkspaceAccessEntryRow
                  key={`eff-${entry.audienceKey}-${entry.effectiveLevelLabel}`}
                  entry={entry}
                  multiplePathsLabel={(count) => t("multiplePaths", { count })}
                  configuredLevelLabel={t("configuredLevelLabel")}
                  effectiveLevelLabel={t("effectiveLevelLabel")}
                  inheritedBadgeLabel={t("inheritedBadge")}
                />
              ))}
              {viewModel.inheritedAccess.map((entry, index) => (
                <li
                  key={`inh-${entry.inheritedFromResourceId}-${index}`}
                  className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm"
                >
                  <p className="font-medium text-[var(--text)]">
                    {entry.audienceLabel} · {entry.levelLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-2)]">
                    {t("inheritedFrom", { name: entry.inheritedFromResourceName })}
                  </p>
                </li>
              ))}
            </ul>
            {viewModel.inheritedAccess.length > 0 ? (
              <p className="mt-2 text-xs text-[var(--muted)]">{t("inheritedReadOnlyHint")}</p>
            ) : null}
          </section>

          {viewModel.canManage ? (
            <WorkspaceAccessGrantEditor
              apiBase={apiBase}
              viewModel={viewModel}
              onViewModelUpdated={setViewModel}
              onSaved={onSaved}
              onManageAccessLost={() => {
                setManageAccessLost(true);
                void load();
              }}
            />
          ) : null}

          {viewModel.policyMode === WorkspaceAccessInheritanceMode.EXPLICIT ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void returnToInheritance()}
              className="fca-button-secondary text-sm disabled:opacity-60"
            >
              {saving ? t("saving") : t("returnToInheritance")}
            </button>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

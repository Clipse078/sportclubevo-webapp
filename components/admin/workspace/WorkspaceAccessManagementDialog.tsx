"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import { Dialog } from "@/components/ui/Dialog";
import type { WorkspaceAccessManagementViewModel } from "@/lib/workspace/access/access-management-dto";

import { WorkspaceAccessGrantEditor } from "./WorkspaceAccessGrantEditor";

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageAccessLost, setManageAccessLost] = useState(false);

  const apiBase =
    resourceType === "FOLDER"
      ? `/api/workspace/folders/${encodeURIComponent(resourceId)}/access`
      : `/api/workspace/documents/${encodeURIComponent(resourceId)}/access`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setManageAccessLost(false);
    try {
      const res = await fetch(apiBase);
      const data = (await res.json()) as {
        accessManagement?: WorkspaceAccessManagementViewModel;
        error?: string;
      };
      if (res.status === 403) {
        setManageAccessLost(true);
        throw new Error(data.error ?? t("loadError"));
      }
      if (!res.ok) {
        throw new Error(data.error ?? t("loadError"));
      }
      setViewModel(data.accessManagement ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
      setViewModel(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

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
        <button
          type="button"
          className="fca-button-secondary"
          onClick={onClose}
        >
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
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("resourceSection")}
            </h3>
            <p className="mt-1 text-sm font-medium text-[var(--text)]">
              {viewModel.resource.name}
            </p>
            <p className="mt-1 text-xs text-[var(--text-2)]">
              {viewModel.policyModeLabel}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {viewModel.inheritDescription}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("effectiveSection")}
            </h3>
            <ul className="mt-2 space-y-2">
              {viewModel.effectiveAccess.map((entry) => (
                <li
                  key={`${entry.audienceKey}-${entry.effectiveLevelLabel}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <p className="font-medium text-[var(--text)]">
                    {entry.audienceLabel} · {entry.effectiveLevelLabel}
                  </p>
                  <p className="text-xs text-[var(--text-2)]">
                    {entry.sourceLabel}
                  </p>
                  {entry.ancestorCapLabel ? (
                    <p className="text-xs text-[var(--muted)]">
                      {entry.ancestorCapLabel}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
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

          {viewModel.inheritedAccess.length > 0 ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("inheritedSection")}
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-2)]">
                {viewModel.inheritedAccess.map((entry, index) => (
                  <li key={`${entry.inheritedFromResourceId}-${index}`}>
                    {entry.audienceLabel} · {entry.levelLabel} —{" "}
                    {t("inheritedFrom", { name: entry.inheritedFromResourceName })}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t("inheritedReadOnlyHint")}
              </p>
            </section>
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

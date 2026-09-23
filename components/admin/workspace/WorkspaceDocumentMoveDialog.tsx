"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { buildWorkspaceBreadcrumbs } from "@/lib/workspace/breadcrumbs";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";

type WorkspaceDocumentMoveDialogProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  currentFolderId: string | null;
  currentFolderLabel: string;
  folders: WorkspaceFolderDto[];
};

function flattenFolders(items: WorkspaceFolderDto[]): WorkspaceFolderDto[] {
  return items.flatMap((f) => [f, ...flattenFolders(f.children)]);
}

export function WorkspaceDocumentMoveDialog({
  open,
  onClose,
  documentId,
  documentName,
  currentFolderId,
  currentFolderLabel,
  folders,
}: WorkspaceDocumentMoveDialogProps) {
  const t = useTranslations("Workspace.moveDocument");
  const router = useRouter();
  const [folderId, setFolderId] = useState(currentFolderId ?? "");
  const [pending, setPending] = useState(false);
  const [impactMessage, setImpactMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFolderId(currentFolderId ?? "");
      setError(null);
      setImpactMessage(null);
    }
  }, [open, currentFolderId]);

  useEffect(() => {
    if (!open) return;

    const targetId = folderId.trim() || null;
    if (targetId === (currentFolderId ?? null)) {
      setImpactMessage(null);
      return;
    }

    let cancelled = false;
    void fetch(
      `/api/workspace/documents/${encodeURIComponent(documentId)}/move-impact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetId }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.impact?.accessChange === "REDUCTION") {
          setImpactMessage(t("accessReductionHint"));
        } else if (data?.allowed === false && data?.message) {
          setImpactMessage(data.message as string);
        } else {
          setImpactMessage(null);
        }
      })
      .catch(() => {
        if (!cancelled) setImpactMessage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, folderId, documentId, currentFolderId, t]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const targetId = folderId.trim() || null;

    try {
      const impactRes = await fetch(
        `/api/workspace/documents/${encodeURIComponent(documentId)}/move-impact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: targetId }),
        },
      );
      const impactData = await impactRes.json().catch(() => null);
      if (!impactData?.allowed) {
        throw new Error(
          (impactData?.message as string | undefined) ??
            t("moveDeniedAccess"),
        );
      }

      const response = await fetch(
        `/api/workspace/documents/${encodeURIComponent(documentId)}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: targetId }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? t("errorGeneric"));
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  const options = flattenFolders(folders);

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      title={t("title", { name: documentName })}
      description={t("description")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          >
            {t("submit")}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <p className="text-xs text-[var(--text-2)]">
          {t("currentFolderLabel")}: <strong>{currentFolderLabel}</strong>
        </p>

        <label className="block text-sm font-medium text-[var(--text)]" htmlFor="doc-move-target">
          {t("targetLabel")}
        </label>
        <select
          id="doc-move-target"
          value={folderId}
          disabled={pending}
          onChange={(e) => setFolderId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--blue)] disabled:opacity-60"
        >
          <option value="">{t("rootOption")}</option>
          {options.map((folder) => {
            const path = buildWorkspaceBreadcrumbs(folders, folder.id)
              .map((b) => b.name)
              .join(" / ");
            return (
              <option key={folder.id} value={folder.id}>
                {path || folder.name}
              </option>
            );
          })}
        </select>

        {impactMessage ? (
          <p className="text-xs leading-5 text-[var(--sce-warning)]" role="status">
            {impactMessage}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-[var(--sce-danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

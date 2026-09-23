"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteFolderButton } from "@/app/(admin)/dashboard/workspace/DeleteFolderButton";
import { RestoreFolderButton } from "@/app/(admin)/dashboard/workspace/RestoreFolderButton";
import { restoreWorkspaceFolderFromTrashAction } from "@/app/(admin)/dashboard/workspace/actions";
import { WorkspaceDocumentDeleteControl } from "./WorkspaceDocumentDeleteControl";

type LifecycleItem = {
  id: string;
  name: string;
  kind: "folder" | "document";
  archivedAt?: string | null;
  trashedAt?: string | null;
};

type WorkspaceLifecycleManagementPanelProps = {
  view: "archived" | "trash";
  folders: LifecycleItem[];
  documents: LifecycleItem[];
  canDelete: boolean;
};

function RestoreTrashedFolderButton({
  folderId,
  folderName,
}: {
  folderId: string;
  folderName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const formData = new FormData();
    formData.set("folderId", folderId);
    startTransition(async () => {
      const result = await restoreWorkspaceFolderFromTrashAction(formData);
      if (!result.ok) {
        setError(result.message ?? "Wiederherstellung fehlgeschlagen.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {pending ? "Wird wiederhergestellt…" : "Wiederherstellen"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DocumentRestoreButton({
  documentId,
  mode,
}: {
  documentId: string;
  mode: "archived" | "trash";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setPending(true);
    setError(null);
    const path =
      mode === "archived"
        ? `/api/workspace/documents/${encodeURIComponent(documentId)}/restore`
        : `/api/workspace/documents/${encodeURIComponent(documentId)}/restore-trash`;

    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Wiederherstellung fehlgeschlagen.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wiederherstellung fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void restore()}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {pending ? "Wird wiederhergestellt…" : "Wiederherstellen"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function WorkspaceLifecycleManagementPanel({
  view,
  folders,
  documents,
  canDelete,
}: WorkspaceLifecycleManagementPanelProps) {
  const title = view === "archived" ? "Archivierte Inhalte" : "Papierkorb";
  const empty =
    folders.length === 0 && documents.length === 0
      ? view === "archived"
        ? "Keine archivierten Inhalte."
        : "Der Papierkorb ist leer."
      : null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      {empty ? (
        <p className="mt-3 text-sm text-[var(--text-2)]">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {folders.map((folder) => (
            <li
              key={`folder-${folder.id}`}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text)]">
                  {folder.name}
                </p>
                <p className="text-xs text-[var(--muted)]">Ordner</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {view === "archived" ? (
                  <RestoreFolderButton folderId={folder.id} folderName={folder.name} />
                ) : (
                  <RestoreTrashedFolderButton folderId={folder.id} folderName={folder.name} />
                )}
                {view === "trash" && canDelete ? (
                  <DeleteFolderButton folderId={folder.id} folderName={folder.name} variant="subtle" />
                ) : null}
              </div>
            </li>
          ))}
          {documents.map((doc) => (
            <li
              key={`doc-${doc.id}`}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <a
                  href={`/dashboard/workspace?document=${encodeURIComponent(doc.id)}&view=${view}`}
                  className="truncate text-sm font-medium text-[var(--blue)] hover:underline"
                >
                  {doc.name}
                </a>
                <p className="text-xs text-[var(--muted)]">Dokument</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DocumentRestoreButton documentId={doc.id} mode={view} />
                {view === "trash" && canDelete ? (
                  <div className="rounded-lg border border-[var(--border)] p-1">
                    <WorkspaceDocumentDeleteControl
                      documentId={doc.id}
                      documentName={doc.name}
                      canDelete
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

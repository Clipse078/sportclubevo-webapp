"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderClosed, FolderOpen } from "lucide-react";

import { moveWorkspaceFolderAction } from "@/app/(admin)/dashboard/workspace/actions";
import { CreateSubfolderForm } from "@/components/admin/workspace/CreateSubfolderForm";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";
import {
  readInternalDragPayload,
  writeInternalDragPayload,
  isExternalFileDrag,
} from "@/lib/workspace/drag-transfer";

type WorkspaceFolderTreePanelProps = {
  folders: WorkspaceFolderDto[];
  selectedFolderId: string | null;
  canManage: boolean;
};

type FolderTreeProps = {
  folders: WorkspaceFolderDto[];
  selectedFolderId: string | null;
  canManage: boolean;
  depth?: number;
  dragFolderId: string | null;
  dropTargetId: string | null;
  onDragStart: (folder: WorkspaceFolderDto) => void;
  onDragEnd: () => void;
  onDragOverFolder: (folderId: string | null) => void;
  onDropOnFolder: (folderId: string | null) => void;
};

function FolderTree({
  folders,
  selectedFolderId,
  canManage,
  depth = 0,
  dragFolderId,
  dropTargetId,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDropOnFolder,
}: FolderTreeProps) {
  return (
    <ul className={depth === 0 ? "space-y-px" : "mt-px space-y-px"}>
      {folders.map((folder) => {
        const isSelected = folder.id === selectedFolderId;
        const FolderIcon = isSelected ? FolderOpen : FolderClosed;
        const hasChildren = folder.children.length > 0;
        const isDragging = dragFolderId === folder.id;
        const isDropTarget = dropTargetId === folder.id;

        return (
          <li key={folder.id}>
            <div
              className={[
                "group flex items-center gap-1 rounded-md transition-colors duration-100",
                isDropTarget ? "ring-2 ring-[var(--blue)] ring-inset" : "",
                isDragging ? "opacity-50" : "",
              ].join(" ")}
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
              onDragOver={(event) => {
                if (!canManage || !dragFolderId) return;
                if (isExternalFileDrag(event.dataTransfer)) return;
                event.preventDefault();
                onDragOverFolder(folder.id);
              }}
              onDrop={(event) => {
                if (!canManage || !dragFolderId) return;
                event.preventDefault();
                onDropOnFolder(folder.id);
              }}
            >
              {canManage ? (
                <button
                  type="button"
                  draggable
                  aria-label={`Ordner ${folder.name} verschieben`}
                  className="inline-flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-[var(--muted)] opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
                  onDragStart={(event) => {
                    writeInternalDragPayload(event.dataTransfer, {
                      kind: "FOLDER",
                      folderId: folder.id,
                      folderName: folder.name,
                    });
                    onDragStart(folder);
                  }}
                  onDragEnd={onDragEnd}
                >
                  ⋮⋮
                </button>
              ) : null}
              <Link
                href={`/dashboard/workspace?folder=${encodeURIComponent(folder.id)}`}
                aria-current={isSelected ? "page" : undefined}
                title={folder.name.length > 24 ? folder.name : undefined}
                className={[
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-100",
                  isSelected
                    ? "bg-[var(--blue)] font-semibold text-white"
                    : "font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                <FolderIcon
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    isSelected
                      ? "text-white/80"
                      : "text-[var(--muted)] group-hover:text-[var(--text-2)]"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate">{folder.name}</span>
              </Link>
            </div>

            {canManage && isSelected ? (
              <div className="mt-px pr-2 pl-6">
                <CreateSubfolderForm parentId={folder.id} />
              </div>
            ) : null}

            {hasChildren ? (
              <FolderTree
                folders={folder.children}
                selectedFolderId={selectedFolderId}
                canManage={canManage}
                depth={depth + 1}
                dragFolderId={dragFolderId}
                dropTargetId={dropTargetId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOverFolder={onDragOverFolder}
                onDropOnFolder={onDropOnFolder}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function WorkspaceFolderTreePanel({
  folders,
  selectedFolderId,
  canManage,
}: WorkspaceFolderTreePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);

  async function executeMove(folderId: string, newParentId: string | null) {
    setMoveMessage(null);

    const impactRes = await fetch(
      `/api/workspace/folders/${encodeURIComponent(folderId)}/move-impact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newParentId }),
      },
    );
    const impactData = (await impactRes.json()) as {
      allowed?: boolean;
      message?: string | null;
      impact?: { outcome?: string; accessChange?: string };
    };

    if (!impactData.allowed) {
      setMoveMessage(
        impactData.message ??
          "Verschieben nicht möglich (Berechtigungen würden erweitert).",
      );
      return;
    }

    if (impactData.impact?.accessChange === "REDUCTION") {
      const confirmed = window.confirm(
        "Hinweis: Durch den Verschieben werden die effektiven Berechtigungen für diesen Ordner und Unterinhalte enger.",
      );
      if (!confirmed) return;
    }

    const formData = new FormData();
    formData.set("folderId", folderId);
    formData.set("parentId", newParentId ?? "");

    startTransition(async () => {
      const result = await moveWorkspaceFolderAction(formData);
      if (!result.ok) {
        setMoveMessage(result.message ?? "Verschieben fehlgeschlagen.");
        return;
      }
      router.refresh();
    });
  }

  function handleDropOnFolder(targetFolderId: string | null) {
    const payload = dragFolderId
      ? ({ kind: "FOLDER" as const, folderId: dragFolderId, folderName: "" })
      : null;
    if (!payload?.folderId || payload.folderId === targetFolderId) {
      setDragFolderId(null);
      setDropTargetId(null);
      return;
    }
    void executeMove(payload.folderId, targetFolderId);
    setDragFolderId(null);
    setDropTargetId(null);
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
      {moveMessage ? (
        <p role="alert" className="mb-2 text-xs text-[var(--sce-danger)]">
          {moveMessage}
        </p>
      ) : null}
      {isPending ? (
        <p className="mb-2 text-xs text-[var(--muted)]">Ordner wird verschoben …</p>
      ) : null}
      <FolderTree
        folders={folders}
        selectedFolderId={selectedFolderId}
        canManage={canManage}
        dragFolderId={dragFolderId}
        dropTargetId={dropTargetId}
        onDragStart={(folder) => setDragFolderId(folder.id)}
        onDragEnd={() => {
          setDragFolderId(null);
          setDropTargetId(null);
        }}
        onDragOverFolder={setDropTargetId}
        onDropOnFolder={handleDropOnFolder}
      />
    </div>
  );
}

export function parseInternalFolderDrag(
  dataTransfer: DataTransfer,
): string | null {
  const payload = readInternalDragPayload(dataTransfer);
  if (payload?.kind === "FOLDER") return payload.folderId;
  return null;
}

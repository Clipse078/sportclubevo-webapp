"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useCallback, useEffect } from "react";
import { isExternalFileDrag } from "@/lib/workspace/drag-transfer";
import { CalendarClock, FolderClosed } from "lucide-react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { BreadcrumbItem } from "@/lib/workspace/breadcrumbs";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";
import type { WorkspaceLifecycleView } from "@/lib/workspace/command/workspace-command-context";
import {
  buildActiveFolderCommandContext,
  withDocumentSelection,
} from "@/lib/workspace/command/workspace-command-context";

import { WorkspaceBreadcrumbs } from "./WorkspaceBreadcrumbs";
import { WorkspaceDocumentTable } from "./WorkspaceDocumentTable";
import { WorkspaceDocumentEmptyState } from "./WorkspaceDocumentEmptyState";
import { WorkspaceUploadDropzone } from "./WorkspaceUploadDropzone";
import { WorkspaceAccessManagementDialog } from "./WorkspaceAccessManagementDialog";
import { WorkspaceAccessSummaryPanel } from "./WorkspaceAccessSummaryPanel";
import { WorkspaceCommandBar } from "./WorkspaceCommandBar";
import { WorkspaceUploadProvider } from "./WorkspaceUploadContext";
import { WorkspaceDocumentVersionHistoryDialog } from "./WorkspaceDocumentVersionHistoryDialog";
import { WorkspaceUploadProgress } from "./WorkspaceUploadProgress";
import { WorkspaceDocumentInspectorActionsProvider } from "./inspector/WorkspaceDocumentInspectorActionsContext";
import type { DocumentInspectorWorkflowCapabilitiesDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import { WorkspaceDocumentInspectorSkeleton } from "./inspector/WorkspaceDocumentInspectorView";
import { useWorkspaceRecentRecorder } from "./useWorkspaceCollaboration";
import { WorkspaceFavoriteToggle } from "./WorkspaceFavoriteToggle";
import { WorkspaceActiveBrowseLayout } from "./WorkspaceActiveBrowseLayout";
import { WorkspaceInspectorToggleButton } from "./WorkspaceInspectorToggleButton";
import { WorkspaceListViewOptions } from "./WorkspaceListViewOptions";

export type WorkspaceClientShellPane = "all" | "main" | "inspector";

type WorkspaceClientShellProps = {
  documents: WorkspaceDocumentListItemDto[];
  initialSelectedDocumentId?: string | null;
  folderId: string;
  folderName: string;
  folderDescription?: string | null;
  folderCreatedAt: string;
  folderUpdatedAt: string;
  folderPath: BreadcrumbItem[];
  canManage: boolean;
  canUpload?: boolean;
  canCreateFolder?: boolean;
  canManageFolderAccess?: boolean;
  canDelete?: boolean;
  lifecycleView?: WorkspaceLifecycleView;
  folderManagementSlot?: React.ReactNode;
  documentInspectorSlot?: React.ReactNode;
  documentWorkflowCapabilities?: DocumentInspectorWorkflowCapabilitiesDto;
  documentTaskCreateDialogProps?: Omit<
    ContextualTaskCreateDialogProps,
    "open" | "onOpenChange"
  > | null;
  folderTree?: WorkspaceFolderDto[];
  pane?: WorkspaceClientShellPane;
  /** When set with resizable layout, renders folder tree in the left pane. */
  navSlot?: React.ReactNode;
  navDrawerTitle?: string;
  resizableLayout?: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function WorkspaceClientShellInner({
  documents,
  initialSelectedDocumentId = null,
  folderId,
  folderName,
  folderDescription,
  folderCreatedAt,
  folderUpdatedAt,
  folderPath,
  canManage: _canManage,
  canUpload = false,
  canCreateFolder = false,
  canManageFolderAccess = false,
  canDelete = false,
  lifecycleView = "active",
  folderManagementSlot,
  documentInspectorSlot,
  documentWorkflowCapabilities = { canCreateTask: false, canCreateRequirement: false },
  documentTaskCreateDialogProps = null,
  folderTree = [],
  pane = "all",
  navSlot,
  navDrawerTitle,
  resizableLayout = false,
}: WorkspaceClientShellProps) {
  const t = useTranslations("Workspace");
  const router = useRouter();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialSelectedDocumentId,
  );

  useWorkspaceRecentRecorder({
    folderId: folderId,
    documentId: selectedDocumentId,
  });

  useEffect(() => {
    setSelectedDocumentId(initialSelectedDocumentId ?? null);
  }, [initialSelectedDocumentId]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [requirementCreateOpen, setRequirementCreateOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<{
    resourceType: "FOLDER" | "DOCUMENT";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const selectedDocument =
    documents.find((d) => d.id === selectedDocumentId) ?? null;

  const commandContext = useMemo(() => {
    const base = buildActiveFolderCommandContext({
      folderId,
      folderName,
      canUpload,
      canCreateFolder,
      canManageFolder: canManageFolderAccess,
      canDelete,
      lifecycleView,
    });
    if (!selectedDocument) return base;
    const scan = selectedDocument.currentVersion?.scan;
    const contentDeliveryAvailable = scan ? scan.contentAvailable : true;
    return withDocumentSelection(base, {
      id: selectedDocument.id,
      hasCurrentVersion: Boolean(selectedDocument.currentVersion),
      canEditDocument: Boolean(selectedDocument.canEditDocument),
      canManageAccess: Boolean(selectedDocument.canManageAccess),
      contentDeliveryAvailable,
    });
  }, [
    canCreateFolder,
    canDelete,
    canManageFolderAccess,
    canUpload,
    folderId,
    folderName,
    lifecycleView,
    selectedDocument,
  ]);

  function handleSelectDocument(id: string) {
    const nextId = selectedDocumentId === id ? null : id;
    setSelectedDocumentId(nextId);
    const params = new URLSearchParams();
    params.set("folder", folderId);
    if (nextId) {
      params.set("document", nextId);
    }
    router.push(`/dashboard/workspace?${params.toString()}`, { scroll: false });
  }

  const handleContentDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload) return;
      if (!isExternalFileDrag(event.dataTransfer)) return;
      event.preventDefault();
      setIsDragOver(true);
    },
    [canUpload],
  );

  const handleContentDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!canUpload || !isExternalFileDrag(event.dataTransfer)) return;
      event.preventDefault();
    },
    [canUpload],
  );

  const docCount = documents.length;
  const hasDocuments = docCount > 0;
  const countLabel =
    docCount === 1
      ? t("documents.countSingular")
      : t("documents.countPlural", { count: docCount });

  const mainPanel = (
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
          <div className="min-w-0">
            <WorkspaceBreadcrumbs path={folderPath} />
            <h2 className="mt-1 truncate text-base font-semibold text-[var(--text)]">{folderName}</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{countLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasDocuments ? <WorkspaceListViewOptions /> : null}
            {resizableLayout ? <WorkspaceInspectorToggleButton /> : null}
          </div>
        </div>

        <WorkspaceCommandBar
          context={commandContext}
          selectedDocument={selectedDocument}
          onOpenVersionHistory={() => setVersionHistoryOpen(true)}
          workflowCapabilities={documentWorkflowCapabilities}
          taskCreateDialogProps={documentTaskCreateDialogProps}
          onCreateRequirement={
            documentWorkflowCapabilities.canCreateRequirement
              ? () => setRequirementCreateOpen(true)
              : undefined
          }
          folderTree={folderTree}
          currentFolderLabel={folderPath.map((p) => p.name).join(" / ") || folderName}
        />

        <div className="border-b border-[var(--border)] px-5 py-2 empty:hidden">
          <WorkspaceUploadProgress />
        </div>

        <div
          className="relative flex-1 overflow-y-auto overflow-x-hidden"
          onDragEnter={handleContentDragEnter}
          onDragOver={handleContentDragOver}
        >
          {canUpload ? (
            <WorkspaceUploadDropzone
              folderName={folderName}
              onDragStateChange={setIsDragOver}
            />
          ) : null}

          {hasDocuments ? (
            <div
              className={`relative transition-colors duration-150 ${
                isDragOver ? "bg-[var(--blue-light)]/30" : ""
              }`}
            >
              <WorkspaceDocumentTable
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={handleSelectDocument}
                folders={folderTree}
                currentFolderLabel={folderPath.map((p) => p.name).join(" / ") || folderName}
                workflowCapabilities={documentWorkflowCapabilities}
                taskCreateDialogProps={documentTaskCreateDialogProps}
                onCreateRequirement={
                  documentWorkflowCapabilities.canCreateRequirement
                    ? () => setRequirementCreateOpen(true)
                    : undefined
                }
              />
            </div>
          ) : (
            <WorkspaceDocumentEmptyState
              isDragging={isDragOver}
              canManage={canUpload}
            />
          )}
        </div>
      </section>
  );

  const inspectorPanel = (
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:min-w-[280px]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {selectedDocument ? (
            documentInspectorSlot ? (
              <WorkspaceDocumentInspectorActionsProvider
                value={{
                  onOpenVersionHistory: () => setVersionHistoryOpen(true),
                  onManageDocumentAccess: () =>
                    setAccessTarget({
                      resourceType: "DOCUMENT",
                      resourceId: selectedDocument.id,
                      resourceName: selectedDocument.name,
                    }),
                  requirementCreateOpen,
                  setRequirementCreateOpen,
                }}
              >
                {documentInspectorSlot}
              </WorkspaceDocumentInspectorActionsProvider>
            ) : (
              <WorkspaceDocumentInspectorSkeleton />
            )
          ) : (
            <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <FolderClosed className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                <h2 className="truncate text-sm font-semibold text-[var(--text)]">
                  {t("folderDetails.panelTitle")}
                </h2>
              </div>
              <WorkspaceFavoriteToggle resourceType="FOLDER" resourceId={folderId} />
            </div>
            <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 px-5 py-5">
              <WorkspaceAccessSummaryPanel
                key={folderId}
                resourceType="FOLDER"
                resourceId={folderId}
                canManageAccess={canManageFolderAccess}
                onManageAccess={() =>
                  setAccessTarget({
                    resourceType: "FOLDER",
                    resourceId: folderId,
                    resourceName: folderName,
                  })
                }
              />
              <dl className="space-y-4">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {t("folderDetails.nameLabelTitle")}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--text)]">{folderName}</dd>
                </div>

                {folderManagementSlot ? (
                  <div className="border-t border-[var(--border)] pt-3">{folderManagementSlot}</div>
                ) : null}

                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {t("folderDetails.descriptionLabel")}
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--text-2)]">
                    {folderDescription || t("folderDetails.noDescription")}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    {t("folderDetails.createdLabel")}
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--text-2)]">
                    {formatDate(folderCreatedAt)}
                  </dd>
                </div>

                <div>
                  <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    {t("folderDetails.updatedLabel")}
                  </dt>
                  <dd className="mt-1 text-sm text-[var(--text-2)]">
                    {formatDate(folderUpdatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
            </div>
            </>
          )}
        </div>
      </aside>
  );

  const body =
    pane === "inspector" ? (
      inspectorPanel
    ) : pane === "main" ? (
      mainPanel
    ) : resizableLayout && navSlot ? (
      <WorkspaceActiveBrowseLayout
        nav={navSlot}
        navDrawerTitle={navDrawerTitle ?? t("folders.panelTitle")}
        hasInspectorContext
        main={mainPanel}
        inspector={inspectorPanel}
      />
    ) : (
      <>
        {mainPanel}
        {inspectorPanel}
      </>
    );

  return (
    <>
      {body}

      {selectedDocument ? (
        <WorkspaceDocumentVersionHistoryDialog
          documentId={selectedDocument.id}
          documentName={selectedDocument.name}
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
          canRestore={Boolean(selectedDocument.canEditDocument)}
        />
      ) : null}

      {accessTarget ? (
        <WorkspaceAccessManagementDialog
          open
          onClose={() => setAccessTarget(null)}
          resourceType={accessTarget.resourceType}
          resourceId={accessTarget.resourceId}
          resourceName={accessTarget.resourceName}
        />
      ) : null}
    </>
  );
}

export function WorkspaceClientShell(props: WorkspaceClientShellProps) {
  const { folderId, folderName, canUpload, initialSelectedDocumentId } = props;
  const router = useRouter();

  function handleUploadComplete(documentId: string | null) {
    router.refresh();
    if (documentId) {
      const params = new URLSearchParams();
      params.set("folder", folderId);
      params.set("document", documentId);
      router.push(`/dashboard/workspace?${params.toString()}`, { scroll: false });
    }
  }

  return (
    <WorkspaceUploadProvider
      folderId={folderId}
      folderName={folderName}
      canUpload={Boolean(canUpload)}
      onUploadComplete={handleUploadComplete}
    >
      <WorkspaceClientShellInner {...props} />
    </WorkspaceUploadProvider>
  );
}

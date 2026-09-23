import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  resolveWorkspaceDocumentDirectLinkAccess,
  resolveWorkspaceDocumentVersionDirectLinkAccess,
} from "@/lib/workspace/document-link-access";
import { resolveWorkspaceActor } from "@/lib/workspace/access/actor-context";
import { buildWorkspaceReadWhere } from "@/lib/workspace/access/query-predicate";
import {
  canWorkspaceEdit,
  canWorkspaceManage,
} from "@/lib/workspace/access/workspace-authorization";
import { WorkspaceResourceType } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { DeleteFolderButton } from "@/app/(admin)/dashboard/workspace/DeleteFolderButton";
import { RestoreFolderButton } from "@/app/(admin)/dashboard/workspace/RestoreFolderButton";
import { WorkspaceClientShell } from "@/components/admin/workspace/WorkspaceClientShell";
import { WorkspaceFolderInspectorManagement } from "@/components/admin/workspace/WorkspaceFolderInspectorManagement";
import { WorkspaceLifecycleNavigation } from "@/components/admin/workspace/WorkspaceLifecycleNavigation";
import { WorkspaceQuickDiscoveryPanel } from "@/components/admin/workspace/WorkspaceQuickDiscoveryPanel";
import { WorkspaceDiscoveryTabs } from "@/components/admin/workspace/WorkspaceDiscoveryTabs";
import { WorkspaceHubClient } from "@/components/admin/workspace/WorkspaceHubClient";
import { WorkspaceCollaborationProvider } from "@/components/admin/workspace/WorkspaceCollaborationProvider";
import { WorkspaceFolderNavPanel } from "@/components/admin/workspace/WorkspaceFolderNavPanel";
import { WorkspaceActiveBrowseLayout } from "@/components/admin/workspace/WorkspaceActiveBrowseLayout";
import { WorkspaceNoFolderSelectedPanel } from "@/components/admin/workspace/WorkspaceNoFolderSelectedPanel";
import { WorkspaceEmptyInspectorPanel } from "@/components/admin/workspace/WorkspaceEmptyInspectorPanel";
import { WorkspaceLifecycleManagementPanel } from "@/components/admin/workspace/WorkspaceLifecycleManagementPanel";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getArchivedWorkspaceDocuments,
  getArchivedWorkspaceFolders,
  getTrashedWorkspaceDocuments,
  getTrashedWorkspaceFolders,
  getWorkspaceFolderById,
  getWorkspaceFolderByIdIncludingLifecycle,
  getWorkspaceFolderTree,
} from "@/lib/workspace/queries";
import { listWorkspaceDocuments } from "@/lib/workspace/document-service";
import { enrichWorkspaceDocumentListWithCurrentVersionScan } from "@/lib/workspace/enrich-workspace-document-list-scan";
import { TaskContextType } from "@prisma/client";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";
import { resolveDocumentWorkflowCapabilities } from "@/lib/workspace/document-inspector/load-workspace-document-inspector";
import WorkspaceDocumentInspectorServer from "@/components/admin/workspace/inspector/WorkspaceDocumentInspectorServer";
import { WorkspaceDocumentInspectorSkeleton } from "@/components/admin/workspace/inspector/WorkspaceDocumentInspectorView";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { buildWorkspaceBreadcrumbs } from "@/lib/workspace/breadcrumbs";
import {
  PageBreadcrumbs,
  PageHeader,
  PageShell,
} from "@/components/ui/page";

type WorkspacePageProps = {
  searchParams?: Promise<{
    folder?: string;
    document?: string;
    version?: string;
    view?: string;
    hub?: string;
  }>;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function WorkspacePage({
  searchParams,
}: WorkspacePageProps) {
  const t = await getTranslations("Workspace");

  const session = await requireAnyPermission([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const params = (await searchParams) ?? {};
  const folderParam = params.folder?.trim() || null;
  const documentParam = params.document?.trim() || null;
  const versionParam = params.version?.trim() || null;
  const hubParam = params.hub?.trim() || "browse";
  const hubView =
    hubParam === "favorites" || hubParam === "recent" ? hubParam : "browse";
  const rawLifecycleView = params.view?.trim() || "active";
  const lifecycleView =
    rawLifecycleView === "archived" || rawLifecycleView === "trash"
      ? rawLifecycleView
      : "active";
  const canManage = hasPermission(session, PERMISSIONS.WORKSPACE_MANAGE);
  const canDelete = hasPermission(session, PERMISSIONS.WORKSPACE_DELETE);

  const userId = session.user?.id;
  if (!userId) notFound();

  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    userId,
    tenantId,
  );
  const workspaceActor = await resolveWorkspaceActor({
    tenantId,
    userId,
    permissionKeys: [...platform, ...tenantPerms],
  });
  const readWhere = await buildWorkspaceReadWhere(workspaceActor);

  let selectedFolderId = folderParam;
  let initialSelectedDocumentId: string | null = null;
  let directLinkLifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED" | null = null;

  const documentAccessCtx = {
    tenantId,
    userId,
    permissionKeys: [...platform, ...tenantPerms],
  };

  if (documentParam) {
    const linkAccess = await resolveWorkspaceDocumentDirectLinkAccess(
      documentAccessCtx,
      documentParam,
    );
    if (!linkAccess.allowed) notFound();

    if (versionParam) {
      const versionAccess = await resolveWorkspaceDocumentVersionDirectLinkAccess(
        documentAccessCtx,
        documentParam,
        versionParam,
      );
      if (!versionAccess.allowed) notFound();
    }

    directLinkLifecycle = linkAccess.lifecycle;
    if (linkAccess.folderId) {
      selectedFolderId = linkAccess.folderId;
    }
    initialSelectedDocumentId = linkAccess.documentId;
  }

  const [folders, selectedFolder, archivedFolders, archivedDocuments, trashedFolders, trashedDocuments] =
    await Promise.all([
      getWorkspaceFolderTree(tenantId, readWhere.folderIds),
      selectedFolderId
        ? directLinkLifecycle && directLinkLifecycle !== "ACTIVE"
          ? getWorkspaceFolderByIdIncludingLifecycle(
              tenantId,
              selectedFolderId,
              readWhere.folderIds,
            )
          : getWorkspaceFolderById(tenantId, selectedFolderId, readWhere.folderIds)
        : Promise.resolve(null),
      getArchivedWorkspaceFolders(tenantId, readWhere.folderIds),
      getArchivedWorkspaceDocuments(tenantId, readWhere.documentIds),
      getTrashedWorkspaceFolders(tenantId, readWhere.folderIds),
      getTrashedWorkspaceDocuments(tenantId, readWhere.documentIds),
    ]);

  const documentsRaw = selectedFolder
    ? await listWorkspaceDocuments({
        tenantId,
        folderId: selectedFolder.id,
        authorizedDocumentIds: readWhere.documentIds,
      })
    : [];

  const documentsWithScan = await enrichWorkspaceDocumentListWithCurrentVersionScan(
    tenantId,
    documentsRaw,
  );

  const documents = documentsWithScan.map((doc) => ({
    ...doc,
    canManageAccess: canWorkspaceManage(workspaceActor, {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId: doc.id,
    }),
    canEditDocument: canWorkspaceEdit(workspaceActor, {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId: doc.id,
    }),
  }));

  const canUploadSelectedFolder =
    selectedFolder != null &&
    canWorkspaceEdit(workspaceActor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: selectedFolder.id,
    });

  const canManageFolderAccess =
    selectedFolder != null &&
    canWorkspaceManage(workspaceActor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: selectedFolder.id,
    });

  const folderPath = selectedFolder
    ? buildWorkspaceBreadcrumbs(folders, selectedFolder.id)
    : [];

  const tenantContext = await getActiveTenant();
  const workspaceLocale = tenantContext?.locale ?? "de-CH";
  const workspaceTimeZone = tenantContext?.timezone ?? "Europe/Zurich";

  const inspectorDocument =
    initialSelectedDocumentId != null
      ? documents.find((d) => d.id === initialSelectedDocumentId) ?? null
      : null;

  const documentWorkflowCapabilities = inspectorDocument
    ? await resolveDocumentWorkflowCapabilities(inspectorDocument.id)
    : { canCreateTask: false, canCreateRequirement: false };

  let documentTaskCreateDialogProps = null;
  if (inspectorDocument && documentWorkflowCapabilities.canCreateTask) {
    const taskCtx = await getTaskServiceContext();
    if (taskCtx) {
      const createView = await loadContextualTaskCreateView(
        taskCtx,
        TaskContextType.DOCUMENT,
        inspectorDocument.id,
        workspaceLocale,
        workspaceTimeZone,
      );
      if (createView?.canCreate) {
        documentTaskCreateDialogProps = {
          contextType: createView.contextType,
          contextId: createView.contextId,
          presentation: createView.presentation,
          orgUnitOptions: createView.orgUnitOptions,
          timeZone: createView.timeZone,
          tenantWideVisibility: createView.tenantWideVisibility,
        };
      }
    }
  }

  const documentInspectorSlot =
    inspectorDocument != null ? (
      <Suspense fallback={<WorkspaceDocumentInspectorSkeleton />}>
        <WorkspaceDocumentInspectorServer
          tenantId={tenantId}
          document={inspectorDocument}
          folderName={selectedFolder?.name ?? ""}
          locale={workspaceLocale}
          timeZone={workspaceTimeZone}
        />
      </Suspense>
    ) : null;

  return (
    <PageShell fullWidth>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: t("page.title") },
        ]}
      />

      <PageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.description")}
      />

      <WorkspaceCollaborationProvider>
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Suspense fallback={null}>
            <WorkspaceLifecycleNavigation currentView={lifecycleView} />
          </Suspense>
          <WorkspaceQuickDiscoveryPanel />
        </div>
        {lifecycleView === "active" ? (
          <Suspense fallback={null}>
            <WorkspaceDiscoveryTabs />
          </Suspense>
        ) : null}
      </div>

      {directLinkLifecycle && directLinkLifecycle !== "ACTIVE" ? (
        <p className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-2)]">
          Lebenszyklus: {directLinkLifecycle === "ARCHIVED" ? "Archiviert" : "Papierkorb"}
        </p>
      ) : null}

      {lifecycleView === "active" && hubView !== "browse" ? (
        <WorkspaceHubClient tab={hubView} />
      ) : null}

      {lifecycleView !== "active" ? (
        <WorkspaceLifecycleManagementPanel
          view={lifecycleView}
          canDelete={canDelete}
          folders={(lifecycleView === "archived" ? archivedFolders : trashedFolders).map(
            (f) => ({
              id: f.id,
              name: f.name,
              kind: "folder" as const,
              archivedAt: f.archivedAt,
              trashedAt:
                "trashedAt" in f && typeof f.trashedAt === "string"
                  ? f.trashedAt
                  : null,
            }),
          )}
          documents={(lifecycleView === "archived" ? archivedDocuments : trashedDocuments).map(
            (d) => ({
              id: d.id,
              name: d.name,
              kind: "document" as const,
            }),
          )}
        />
      ) : hubView === "browse" ? (
        selectedFolder ? (
          <WorkspaceClientShell
            resizableLayout
            navSlot={
              <WorkspaceFolderNavPanel
                folders={folders}
                selectedFolderId={selectedFolder.id}
                canManage={canManage}
              />
            }
            navDrawerTitle={t("folders.panelTitle")}
            documents={documents}
            initialSelectedDocumentId={initialSelectedDocumentId}
            folderId={selectedFolder.id}
            folderName={selectedFolder.name}
            folderDescription={selectedFolder.description}
            folderCreatedAt={selectedFolder.createdAt}
            folderUpdatedAt={selectedFolder.updatedAt}
            folderPath={folderPath}
            canManage={canManage}
            canUpload={canUploadSelectedFolder}
            canCreateFolder={canUploadSelectedFolder}
            canManageFolderAccess={canManageFolderAccess}
            canDelete={canDelete}
            lifecycleView={lifecycleView}
            folderTree={folders}
            documentInspectorSlot={documentInspectorSlot}
            documentWorkflowCapabilities={documentWorkflowCapabilities}
            documentTaskCreateDialogProps={documentTaskCreateDialogProps}
            folderManagementSlot={
              canManage ? (
                <WorkspaceFolderInspectorManagement
                  folderId={selectedFolder.id}
                  folderName={selectedFolder.name}
                  currentParentId={selectedFolder.parentId ?? null}
                  folders={folders}
                  canDelete={canDelete}
                />
              ) : undefined
            }
          />
        ) : (
          <WorkspaceActiveBrowseLayout
            nav={
              <WorkspaceFolderNavPanel
                folders={folders}
                selectedFolderId={null}
                canManage={canManage}
              />
            }
            navDrawerTitle={t("folders.panelTitle")}
            hasInspectorContext={false}
            main={
              <WorkspaceNoFolderSelectedPanel
                hasFolders={folders.length > 0}
                canManage={canManage}
              />
            }
            inspector={<WorkspaceEmptyInspectorPanel />}
          />
        )
      ) : null}
      </WorkspaceCollaborationProvider>

      {lifecycleView === "active" && archivedFolders.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {t("archivedFolders.sectionTitle")}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-2)]">
              {t("archivedFolders.sectionDescription")}
            </p>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {archivedFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {folder.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-2)]">
                    {t("archivedFolders.archivedAtLabel", {
                      date: formatDate(folder.archivedAt),
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <RestoreFolderButton
                    folderId={folder.id}
                    folderName={folder.name}
                  />
                  {canDelete ? (
                    <DeleteFolderButton
                      folderId={folder.id}
                      folderName={folder.name}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

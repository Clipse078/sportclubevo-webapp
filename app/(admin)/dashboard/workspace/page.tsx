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
import {
  FolderClosed,
  LockKeyhole,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CreateRootFolderDialog } from "@/components/admin/workspace/CreateRootFolderDialog";
import { DeleteFolderButton } from "@/app/(admin)/dashboard/workspace/DeleteFolderButton";
import { RestoreFolderButton } from "@/app/(admin)/dashboard/workspace/RestoreFolderButton";
import { WorkspaceClientShell } from "@/components/admin/workspace/WorkspaceClientShell";
import { WorkspaceFolderTreePanel } from "@/components/admin/workspace/WorkspaceFolderTreePanel";
import { WorkspaceFolderInspectorManagement } from "@/components/admin/workspace/WorkspaceFolderInspectorManagement";
import { WorkspaceLifecycleNavigation } from "@/components/admin/workspace/WorkspaceLifecycleNavigation";
import { WorkspaceQuickDiscoveryPanel } from "@/components/admin/workspace/WorkspaceQuickDiscoveryPanel";
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
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
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

  const documents = documentsRaw.map((doc) => ({
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

  const documentContextualTasksPanel =
    initialSelectedDocumentId != null ? (
      <ContextRelatedTasksPanel
        contextType="DOCUMENT"
        contextId={initialSelectedDocumentId}
        locale={workspaceLocale}
        timeZone={workspaceTimeZone}
      />
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

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <WorkspaceLifecycleNavigation currentView={lifecycleView} />
        </Suspense>
        <WorkspaceQuickDiscoveryPanel />
      </div>

      {directLinkLifecycle && directLinkLifecycle !== "ACTIVE" ? (
        <p className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-2)]">
          Lebenszyklus: {directLinkLifecycle === "ARCHIVED" ? "Archiviert" : "Papierkorb"}
        </p>
      ) : null}

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,300px)]">
        {/* ── Left: folder tree ─────────────────────────────────────── */}
        <aside className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="shrink-0 border-b border-[var(--border)] px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderClosed className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  {t("folders.panelTitle")}
                </h2>
              </div>

              {canManage ? (
                <CreateRootFolderDialog />
              ) : null}
            </div>
          </div>

          {folders.length > 0 ? (
              <WorkspaceFolderTreePanel
                folders={folders}
                selectedFolderId={selectedFolder?.id ?? null}
                canManage={canManage}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
                  <FolderClosed className="h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-[var(--text)]">
                    {t("folders.noFoldersTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-2)]">
                    {t("folders.noFoldersDescription")}
                  </p>
                </div>
              </div>
            )}
        </aside>

        {/* ── Centre + Right panels ─────────────────────────────────── */}
        {selectedFolder ? (
          <WorkspaceClientShell
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
            documentContextualTasksPanel={documentContextualTasksPanel}
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
          <>
            <section className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16">
              <div className="w-full max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
                  <LockKeyhole className="h-7 w-7 text-[var(--blue)]" aria-hidden="true" />
                </div>

                <h2 className="mt-5 text-xl font-semibold text-[var(--text)]">
                  {folders.length > 0
                    ? t("folders.selectFolder")
                    : t("folders.welcomeTitle")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">
                  {folders.length > 0
                    ? t("folders.selectFolderDescription")
                    : t("folders.welcomeDescription")}
                </p>

                {canManage && folders.length === 0 ? (
                  <div className="mt-6">
                    <CreateRootFolderDialog />
                  </div>
                ) : null}

                {!canManage && folders.length === 0 ? (
                  <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
                    {t("folders.noPermissionNote")}
                  </p>
                ) : null}
              </div>
            </section>

            <aside className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] px-5 py-3.5">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  {t("folderDetails.panelTitle")}
                </h2>
              </div>
              <div className="flex flex-1 items-center justify-center px-5 py-8">
                <p className="text-sm text-[var(--text-2)]">
                  {t("folderDetails.noItemSelected")}
                </p>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ── Archived folders ──────────────────────────────────────── */}
      {lifecycleView === "archived" && (archivedFolders.length > 0 || archivedDocuments.length > 0) ? (
        <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Archivierte Inhalte</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {archivedFolders.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
            {archivedDocuments.map((d) => (
              <li key={d.id}>
                <a href={`/dashboard/workspace?document=${d.id}`}>{d.name}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lifecycleView === "trash" && (trashedFolders.length > 0 || trashedDocuments.length > 0) ? (
        <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold">Papierkorb</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {trashedFolders.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
            {trashedDocuments.map((d) => (
              <li key={d.id}>
                <a href={`/dashboard/workspace?document=${d.id}`}>{d.name}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {archivedFolders.length > 0 ? (
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

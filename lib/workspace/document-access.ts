/**
 * AUFGABEN-06D — canonical Workspace document authorization & presentation seam.
 * Phase 10 ACL upgrades should be localized here.
 */

import { WorkspaceDocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "@/lib/tasks/types";

export type WorkspaceDocumentAccessContext = Pick<
  TaskServiceContext,
  "tenantId" | "userId" | "permissionKeys"
>;

export type WorkspaceDocumentPresentation =
  | {
      access: "readable";
      documentId: string;
      title: string;
      folderBreadcrumb: string | null;
      href: string;
    }
  | {
      access: "restricted";
      documentId: string;
    };

export type WorkspaceDocumentPickerOption = {
  id: string;
  title: string;
  folderBreadcrumb: string | null;
};

const DEFAULT_PICKER_LIMIT = 20;
export const MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT = 50;

type DocumentAccessRow = {
  id: string;
  tenantId: string;
  name: string;
  status: WorkspaceDocumentStatus;
  archivedAt: Date | null;
  folder: { name: string } | null;
};

function hasWorkspaceReadPermission(ctx: WorkspaceDocumentAccessContext): boolean {
  return (
    ctx.permissionKeys.includes(PERMISSIONS.WORKSPACE_VIEW) ||
    ctx.permissionKeys.includes(PERMISSIONS.WORKSPACE_MANAGE)
  );
}

function canReadDocumentRow(ctx: WorkspaceDocumentAccessContext, row: DocumentAccessRow): boolean {
  if (row.tenantId !== ctx.tenantId) return false;
  if (!hasWorkspaceReadPermission(ctx)) return false;
  return row.status === WorkspaceDocumentStatus.ACTIVE && row.archivedAt === null;
}

function workspaceDocumentHref(documentId: string): string {
  return `/dashboard/workspace?document=${encodeURIComponent(documentId)}`;
}

function folderBreadcrumbFromRow(row: DocumentAccessRow): string | null {
  return row.folder?.name?.trim() || null;
}

async function loadDocumentRowsByIds(
  tenantId: string,
  documentIds: readonly string[],
): Promise<Map<string, DocumentAccessRow>> {
  const unique = [...new Set(documentIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.workspaceDocument.findMany({
    where: { tenantId, id: { in: unique } },
    select: {
      id: true,
      tenantId: true,
      name: true,
      status: true,
      archivedAt: true,
      folder: { select: { name: true } },
    },
  });

  return new Map(rows.map((row) => [row.id, row]));
}

export async function filterReadableWorkspaceDocumentIds(
  ctx: WorkspaceDocumentAccessContext,
  documentIds: readonly string[],
): Promise<Set<string>> {
  const rows = await loadDocumentRowsByIds(ctx.tenantId, documentIds);
  const readable = new Set<string>();
  for (const id of documentIds) {
    const row = rows.get(id);
    if (row && canReadDocumentRow(ctx, row)) readable.add(id);
  }
  return readable;
}

export async function canReadWorkspaceDocument(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
): Promise<boolean> {
  const readable = await filterReadableWorkspaceDocumentIds(ctx, [documentId]);
  return readable.has(documentId);
}

function toPresentation(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
  row: DocumentAccessRow | undefined,
): WorkspaceDocumentPresentation {
  if (!row || !canReadDocumentRow(ctx, row)) {
    return { access: "restricted", documentId };
  }
  return {
    access: "readable",
    documentId,
    title: row.name,
    folderBreadcrumb: folderBreadcrumbFromRow(row),
    href: workspaceDocumentHref(documentId),
  };
}

export async function resolveWorkspaceDocumentPresentation(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
): Promise<WorkspaceDocumentPresentation> {
  const map = await resolveWorkspaceDocumentPresentations(ctx, [documentId]);
  return map.get(documentId) ?? { access: "restricted", documentId };
}

export async function resolveWorkspaceDocumentPresentations(
  ctx: WorkspaceDocumentAccessContext,
  documentIds: readonly string[],
): Promise<Map<string, WorkspaceDocumentPresentation>> {
  const rows = await loadDocumentRowsByIds(ctx.tenantId, documentIds);
  const result = new Map<string, WorkspaceDocumentPresentation>();
  for (const id of documentIds) {
    result.set(id, toPresentation(ctx, id, rows.get(id)));
  }
  return result;
}

export async function searchWorkspaceDocumentsForTaskLink(
  ctx: WorkspaceDocumentAccessContext,
  query: string,
  limit = DEFAULT_PICKER_LIMIT,
): Promise<WorkspaceDocumentPickerOption[]> {
  const take = Math.min(Math.max(limit, 1), MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT);
  const q = query.trim();

  const rows = await prisma.workspaceDocument.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: WorkspaceDocumentStatus.ACTIVE,
      archivedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      tenantId: true,
      name: true,
      status: true,
      archivedAt: true,
      folder: { select: { name: true } },
    },
  });

  const options: WorkspaceDocumentPickerOption[] = [];
  for (const row of rows) {
    if (!canReadDocumentRow(ctx, row)) continue;
    options.push({
      id: row.id,
      title: row.name,
      folderBreadcrumb: folderBreadcrumbFromRow(row),
    });
  }
  return options;
}

const LINKABLE_DOCUMENT_ERROR =
  "Das Dokument ist nicht verfügbar oder kann nicht verknüpft werden.";

export async function assertWorkspaceDocumentLinkable(
  ctx: WorkspaceDocumentAccessContext,
  documentId: string,
): Promise<void> {
  const row = await prisma.workspaceDocument.findFirst({
    where: { id: documentId, tenantId: ctx.tenantId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      status: true,
      archivedAt: true,
      folder: { select: { name: true } },
    },
  });

  if (!row || !canReadDocumentRow(ctx, row)) {
    throw new Error(LINKABLE_DOCUMENT_ERROR);
  }
}

export { LINKABLE_DOCUMENT_ERROR as WORKSPACE_DOCUMENT_LINKABLE_ERROR };

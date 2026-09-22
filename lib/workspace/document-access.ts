/**
 * AUFGABEN-06D / WORKSPACE-02 — canonical Workspace document authorization seam.
 */

import { WorkspaceDocumentStatus, WorkspaceResourceType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveWorkspaceActorFromSessionUser } from "@/lib/workspace/access/actor-context";
import { buildWorkspaceReadWhere } from "@/lib/workspace/access/query-predicate";
import {
  canWorkspaceView,
  hasWorkspaceTenantViewCapability,
} from "@/lib/workspace/access/workspace-authorization";
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

async function resolveActor(ctx: WorkspaceDocumentAccessContext) {
  return resolveWorkspaceActorFromSessionUser({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    permissionKeys: ctx.permissionKeys,
  });
}

async function canReadDocumentRow(
  ctx: WorkspaceDocumentAccessContext,
  row: DocumentAccessRow,
): Promise<boolean> {
  if (row.tenantId !== ctx.tenantId) return false;
  if (!hasWorkspaceTenantViewCapability(ctx.permissionKeys)) return false;
  if (row.status !== WorkspaceDocumentStatus.ACTIVE || row.archivedAt !== null) {
    return false;
  }

  const actor = await resolveActor(ctx);
  return canWorkspaceView(actor, {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: row.id,
  });
}

export async function filterReadableWorkspaceDocumentIds(
  ctx: WorkspaceDocumentAccessContext,
  documentIds: readonly string[],
): Promise<Set<string>> {
  const rows = await loadDocumentRowsByIds(ctx.tenantId, documentIds);
  const readable = new Set<string>();
  for (const id of documentIds) {
    const row = rows.get(id);
    if (row && (await canReadDocumentRow(ctx, row))) readable.add(id);
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
  readable: boolean,
): WorkspaceDocumentPresentation {
  if (!row || !readable) {
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
    const row = rows.get(id);
    const readable = row ? await canReadDocumentRow(ctx, row) : false;
    result.set(id, toPresentation(ctx, id, row, readable));
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

  const actor = await resolveActor(ctx);
  const readWhere = await buildWorkspaceReadWhere(actor);

  const rows = await prisma.workspaceDocument.findMany({
    where: {
      ...readWhere.documentWhere,
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
    if (!(await canReadDocumentRow(ctx, row))) continue;
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

  if (!row || !(await canReadDocumentRow(ctx, row))) {
    throw new Error(LINKABLE_DOCUMENT_ERROR);
  }
}

export { LINKABLE_DOCUMENT_ERROR as WORKSPACE_DOCUMENT_LINKABLE_ERROR };

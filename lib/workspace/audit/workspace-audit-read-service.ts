import type { Prisma } from "@prisma/client";

import type { AuditOutcome } from "@/lib/audit/audit-record";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  W07_REFERENCE_AUDIT_ACTIONS,
  WORKSPACE_GOVERNANCE_MODULE_KEY,
} from "@/lib/workspace/audit/workspace-audit-actions";
import {
  WORKSPACE_AUDIT_MAX_PAGE_SIZE,
  workspaceAuditActionLabel,
  type WorkspaceAuditEventDto,
  type WorkspaceAuditListDto,
} from "@/lib/workspace/audit/workspace-audit-dto";

export class WorkspaceAuditReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAuditReadError";
  }
}

export type WorkspaceAuditReadFilters = {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  outcome?: AuditOutcome;
  from?: Date;
  to?: Date;
};

function parseOutcome(metadata: unknown): AuditOutcome {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof (metadata as { outcome?: unknown }).outcome === "string"
  ) {
    const value = (metadata as { outcome: string }).outcome;
    if (value === "DENIED" || value === "FAILURE" || value === "SUCCESS") {
      return value;
    }
  }
  return "SUCCESS";
}

function metadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function resolveResourceLabel(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  permissionKeys: readonly string[];
}): Promise<string | null> {
  const { loadWorkspaceResourceGraph } = await import(
    "@/lib/workspace/access/resource-graph"
  );
  const { createWorkspaceActorContext } = await import(
    "@/lib/workspace/access/workspace-authorization"
  );
  const { canWorkspaceView } = await import(
    "@/lib/workspace/access/workspace-authorization"
  );
  const { WorkspaceResourceType } = await import("@prisma/client");

  if (!input.actorUserId) {
    return null;
  }

  const graph = await loadWorkspaceResourceGraph(input.tenantId);
  const actor = await createWorkspaceActorContext({
    tenantId: input.tenantId,
    userId: input.actorUserId,
    personId: null,
    permissionKeys: input.permissionKeys,
    graph,
  });

  if (input.entityType === "WorkspaceFolder") {
    if (!graph.folders.has(input.entityId)) return null;
    const canView = canWorkspaceView(actor, {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: input.entityId,
    });
    if (!canView) return null;
    const folder = await prisma.workspaceFolder.findFirst({
      where: { id: input.entityId, tenantId: input.tenantId },
      select: { name: true },
    });
    return folder?.name ?? null;
  }

  if (input.entityType === "WorkspaceDocument") {
    if (!graph.documents.has(input.entityId)) return null;
    const canView = canWorkspaceView(actor, {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId: input.entityId,
    });
    if (!canView) return null;
    const document = await prisma.workspaceDocument.findFirst({
      where: { id: input.entityId, tenantId: input.tenantId },
      select: { name: true },
    });
    return document?.name ?? null;
  }

  if (input.entityType === "WorkspaceDocumentVersion") {
    const versionRow = await prisma.workspaceDocumentVersion.findFirst({
      where: { id: input.entityId, tenantId: input.tenantId },
      select: { documentId: true },
    });
    if (!versionRow) return null;
    const canView = canWorkspaceView(actor, {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId: versionRow.documentId,
    });
    if (!canView) return null;
    const document = await prisma.workspaceDocument.findFirst({
      where: { id: versionRow.documentId, tenantId: input.tenantId },
      select: { name: true },
    });
    return document?.name ?? null;
  }

  return null;
}

export function hasWorkspaceAuditViewPermission(
  permissionKeys: readonly string[],
): boolean {
  return permissionKeys.includes(PERMISSIONS.WORKSPACE_AUDIT_VIEW);
}

export async function listWorkspaceGovernanceAuditEvents(input: {
  tenantId: string;
  permissionKeys: readonly string[];
  viewerUserId: string;
  cursor?: string | null;
  pageSize?: number;
  filters?: WorkspaceAuditReadFilters;
}): Promise<WorkspaceAuditListDto> {
  if (!hasWorkspaceAuditViewPermission(input.permissionKeys)) {
    throw new WorkspaceAuditReadError("workspace.audit.view required");
  }

  const pageSize = Math.min(
    Math.max(input.pageSize ?? 25, 1),
    WORKSPACE_AUDIT_MAX_PAGE_SIZE,
  );

  const moduleFilter: Prisma.AuditLogWhereInput = {
    OR: [
      { moduleKey: WORKSPACE_GOVERNANCE_MODULE_KEY },
      {
        moduleKey: { in: ["tasks", "requirements"] },
        action: { in: [...W07_REFERENCE_AUDIT_ACTIONS] },
      },
    ],
  };

  const where: Prisma.AuditLogWhereInput = {
    tenantId: input.tenantId,
    ...moduleFilter,
    ...(input.filters?.action ? { action: input.filters.action } : {}),
    ...(input.filters?.entityType ? { entityType: input.filters.entityType } : {}),
    ...(input.filters?.entityId ? { entityId: input.filters.entityId } : {}),
    ...(input.filters?.actorUserId ? { actorUserId: input.filters.actorUserId } : {}),
    ...(input.filters?.from || input.filters?.to
      ? {
          createdAt: {
            ...(input.filters.from ? { gte: input.filters.from } : {}),
            ...(input.filters.to ? { lte: input.filters.to } : {}),
          },
        }
      : {}),
    ...(input.cursor
      ? {
          id: { lt: input.cursor },
        }
      : {}),
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      workspaceDocumentVersionId: true,
      actorUserId: true,
      metadataJson: true,
      beforeJson: true,
      afterJson: true,
      createdAt: true,
      actorUser: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  const page = rows.slice(0, pageSize);
  const nextCursor = rows.length > pageSize ? page[page.length - 1]?.id ?? null : null;

  const items: WorkspaceAuditEventDto[] = [];

  for (const row of page) {
    const outcome = parseOutcome(row.metadataJson);
    if (input.filters?.outcome && input.filters.outcome !== outcome) {
      continue;
    }

    const documentId =
      metadataString(row.metadataJson, "documentId") ??
      metadataString(row.afterJson, "documentId") ??
      (row.entityType === "WorkspaceDocument" ? row.entityId : null);
    const folderId =
      metadataString(row.metadataJson, "folderId") ??
      metadataString(row.afterJson, "folderId") ??
      (row.entityType === "WorkspaceFolder" ? row.entityId : null);

    const resourceLabel = await resolveResourceLabel({
      tenantId: input.tenantId,
      entityType: row.entityType,
      entityId: row.entityId,
      actorUserId: input.viewerUserId,
      permissionKeys: input.permissionKeys,
    });

    items.push({
      id: row.id,
      action: row.action,
      actionLabel: workspaceAuditActionLabel(row.action),
      outcome,
      entityType: row.entityType,
      entityId: row.entityId,
      workspaceDocumentVersionId: row.workspaceDocumentVersionId,
      documentId,
      folderId,
      actorUserId: row.actorUserId,
      actorDisplayName: row.actorUser
        ? `${row.actorUser.firstName ?? ""} ${row.actorUser.lastName ?? ""}`.trim() ||
          row.actorUser.email
        : null,
      resourceLabel,
      createdAt: row.createdAt.toISOString(),
      reason: metadataString(row.metadataJson, "reason"),
    });
  }

  return { items, nextCursor, pageSize };
}

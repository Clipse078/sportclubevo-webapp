/**
 * WORKSPACE-08-07 — bounded database-side subtree planning (no unbounded memory).
 */

import { prisma } from "@/lib/db/prisma";
import {
  resolveWorkspaceAsyncSubtreeThreshold,
  type WorkspaceSubtreeNodeCount,
} from "@/lib/workspace/subtree/subtree-scale-config";

type SubtreeCountRow = {
  folder_count: number;
  document_count: number;
  folder_probe_hit: boolean;
  document_probe_hit: boolean;
};

/**
 * Counts subtree nodes using recursive CTE. When `probeLimit` is set, counting
 * stops after that many folders / documents (LIMIT probeLimit+1 semantics).
 */
export async function probeWorkspaceSubtreeNodeCount(input: {
  tenantId: string;
  rootFolderId: string;
  probeLimit?: number;
}): Promise<WorkspaceSubtreeNodeCount> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();
  const probeLimit =
    input.probeLimit ?? resolveWorkspaceAsyncSubtreeThreshold();

  const rows = await prisma.$queryRaw<SubtreeCountRow[]>`
    WITH RECURSIVE subtree AS (
      SELECT "id"
      FROM "WorkspaceFolder"
      WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
      UNION ALL
      SELECT f."id"
      FROM "WorkspaceFolder" f
      INNER JOIN subtree s ON f."parentId" = s."id"
      WHERE f."tenantId" = ${tenantId}
    ),
    folder_probe AS (
      SELECT "id" FROM subtree LIMIT ${probeLimit + 1}
    ),
    folder_count AS (
      SELECT COUNT(*)::int AS c FROM folder_probe
    ),
    doc_probe AS (
      SELECT d."id"
      FROM "WorkspaceDocument" d
      WHERE d."tenantId" = ${tenantId}
        AND d."folderId" IN (SELECT "id" FROM subtree)
      LIMIT ${probeLimit + 1}
    ),
    doc_count AS (
      SELECT COUNT(*)::int AS c FROM doc_probe
    )
    SELECT
      (SELECT c FROM folder_count) AS folder_count,
      (SELECT c FROM doc_count) AS document_count,
      (SELECT c FROM folder_count) > ${probeLimit} AS folder_probe_hit,
      (SELECT c FROM doc_count) > ${probeLimit} AS document_probe_hit
  `;

  const row = rows[0];
  const folderCount = row?.folder_count ?? 0;
  const documentCount = row?.document_count ?? 0;
  const probeLimitExceeded =
    Boolean(row?.folder_probe_hit) || Boolean(row?.document_probe_hit);

  return {
    folderCount,
    documentCount,
    totalNodes: folderCount + documentCount,
    probeLimitExceeded,
  };
}

export async function fetchWorkspaceSubtreeDocumentIdsBatch(input: {
  tenantId: string;
  rootFolderId: string;
  limit: number;
}): Promise<string[]> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();
  const limit = Math.max(1, input.limit);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE subtree AS (
      SELECT "id"
      FROM "WorkspaceFolder"
      WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
      UNION ALL
      SELECT f."id"
      FROM "WorkspaceFolder" f
      INNER JOIN subtree s ON f."parentId" = s."id"
      WHERE f."tenantId" = ${tenantId}
    )
    SELECT d."id"
    FROM "WorkspaceDocument" d
    WHERE d."tenantId" = ${tenantId}
      AND d."folderId" IN (SELECT "id" FROM subtree)
    ORDER BY d."id" ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => r.id);
}

export async function fetchWorkspaceSubtreeLeafFolderIdsBatch(input: {
  tenantId: string;
  rootFolderId: string;
  limit: number;
}): Promise<string[]> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();
  const limit = Math.max(1, input.limit);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE subtree AS (
      SELECT "id", "parentId", 0 AS depth
      FROM "WorkspaceFolder"
      WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
      UNION ALL
      SELECT f."id", f."parentId", s.depth + 1
      FROM "WorkspaceFolder" f
      INNER JOIN subtree s ON f."parentId" = s."id"
      WHERE f."tenantId" = ${tenantId}
    )
    SELECT s."id"
    FROM subtree s
    WHERE NOT EXISTS (
      SELECT 1 FROM "WorkspaceFolder" c
      WHERE c."tenantId" = ${tenantId}
        AND c."parentId" = s."id"
        AND c."id" IN (SELECT "id" FROM subtree)
    )
    AND NOT EXISTS (
      SELECT 1 FROM "WorkspaceDocument" d
      WHERE d."tenantId" = ${tenantId} AND d."folderId" = s."id"
    )
    ORDER BY s.depth DESC, s."id" ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => r.id);
}

export async function countWorkspaceSubtreeDocumentsRemaining(input: {
  tenantId: string;
  rootFolderId: string;
}): Promise<number> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();

  const rows = await prisma.$queryRaw<{ c: number }[]>`
    WITH RECURSIVE subtree AS (
      SELECT "id"
      FROM "WorkspaceFolder"
      WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
      UNION ALL
      SELECT f."id"
      FROM "WorkspaceFolder" f
      INNER JOIN subtree s ON f."parentId" = s."id"
      WHERE f."tenantId" = ${tenantId}
    )
    SELECT COUNT(*)::int AS c
    FROM "WorkspaceDocument" d
    WHERE d."tenantId" = ${tenantId}
      AND d."folderId" IN (SELECT "id" FROM subtree)
  `;

  return rows[0]?.c ?? 0;
}

export async function trashWorkspaceSubtreeBatch(input: {
  tenantId: string;
  rootFolderId: string;
  actorUserId: string;
  trashedAt: Date;
  folderBatchSize: number;
  documentBatchSize: number;
}): Promise<{ trashedFolders: number; trashedDocuments: number }> {
  const tenantId = input.tenantId.trim();
  const rootFolderId = input.rootFolderId.trim();

  return prisma.$transaction(async (tx) => {
    const folderRows = await tx.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT "id"
        FROM "WorkspaceFolder"
        WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
        UNION ALL
        SELECT f."id"
        FROM "WorkspaceFolder" f
        INNER JOIN subtree s ON f."parentId" = s."id"
        WHERE f."tenantId" = ${tenantId}
      )
      SELECT s."id"
      FROM subtree s
      INNER JOIN "WorkspaceFolder" wf ON wf."id" = s."id"
      WHERE wf."trashedAt" IS NULL
      LIMIT ${input.folderBatchSize}
    `;

    const folderIds = folderRows.map((r) => r.id);
    let trashedFolders = 0;
    if (folderIds.length > 0) {
      const updated = await tx.workspaceFolder.updateMany({
        where: { tenantId, id: { in: folderIds }, trashedAt: null },
        data: {
          trashedAt: input.trashedAt,
          updatedByUserId: input.actorUserId,
        },
      });
      trashedFolders = updated.count;
    }

    const docRows = await tx.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT "id"
        FROM "WorkspaceFolder"
        WHERE "tenantId" = ${tenantId} AND "id" = ${rootFolderId}
        UNION ALL
        SELECT f."id"
        FROM "WorkspaceFolder" f
        INNER JOIN subtree s ON f."parentId" = s."id"
        WHERE f."tenantId" = ${tenantId}
      )
      SELECT d."id"
      FROM "WorkspaceDocument" d
      WHERE d."tenantId" = ${tenantId}
        AND d."folderId" IN (SELECT "id" FROM subtree)
        AND d."status" <> 'TRASHED'::"WorkspaceDocumentStatus"
      LIMIT ${input.documentBatchSize}
    `;

    const docIds = docRows.map((r) => r.id);
    let trashedDocuments = 0;
    if (docIds.length > 0) {
      const updated = await tx.workspaceDocument.updateMany({
        where: { tenantId, id: { in: docIds } },
        data: {
          status: "TRASHED",
          trashedAt: input.trashedAt,
          updatedByUserId: input.actorUserId,
        },
      });
      trashedDocuments = updated.count;
    }

    return { trashedFolders, trashedDocuments };
  });
}

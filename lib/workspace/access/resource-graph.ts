/**
 * WORKSPACE-02 — tenant workspace ACL graph (folders, documents, grants).
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { ResourceAccessChain } from "@/lib/workspace/access/effective-access";
import type {
  WorkspaceAccessGrantSnapshot,
  WorkspaceResourceAccessNode,
} from "@/lib/workspace/access/types";

export type WorkspaceResourceGraph = {
  tenantId: string;
  folders: Map<
    string,
    {
      id: string;
      parentId: string | null;
      accessInheritanceMode: WorkspaceAccessInheritanceMode;
    }
  >;
  documents: Map<
    string,
    {
      id: string;
      folderId: string | null;
      accessInheritanceMode: WorkspaceAccessInheritanceMode;
    }
  >;
  folderGrants: Map<string, WorkspaceAccessGrantSnapshot[]>;
  documentGrants: Map<string, WorkspaceAccessGrantSnapshot[]>;
};

function mapGrantRow(
  row: {
    id: string;
    tenantId: string;
    resourceType: WorkspaceResourceType;
    folderId: string | null;
    documentId: string | null;
    subjectType: WorkspaceAccessGrantSnapshot["subjectType"];
    accessLevel: WorkspaceAccessGrantSnapshot["accessLevel"];
    personId: string | null;
    orgUnitId: string | null;
    teamId: string | null;
    roleFunctionKey: string | null;
    roleScopeOrgUnitId: string | null;
    roleScopeTeamId: string | null;
  },
): WorkspaceAccessGrantSnapshot {
  return {
    id: row.id,
    tenantId: row.tenantId,
    resourceType: row.resourceType,
    folderId: row.folderId,
    documentId: row.documentId,
    subjectType: row.subjectType,
    accessLevel: row.accessLevel,
    personId: row.personId,
    orgUnitId: row.orgUnitId,
    teamId: row.teamId,
    roleFunctionKey: row.roleFunctionKey,
    roleScopeOrgUnitId: row.roleScopeOrgUnitId,
    roleScopeTeamId: row.roleScopeTeamId,
  };
}

export async function loadWorkspaceResourceGraph(
  tenantId: string,
): Promise<WorkspaceResourceGraph> {
  const [folderRows, documentRows, grantRows] = await Promise.all([
    prisma.workspaceFolder.findMany({
      where: { tenantId, archivedAt: null },
      select: {
        id: true,
        parentId: true,
        accessInheritanceMode: true,
      },
    }),
    prisma.workspaceDocument.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        archivedAt: null,
      },
      select: {
        id: true,
        folderId: true,
        accessInheritanceMode: true,
      },
    }),
    prisma.workspaceAccessGrant.findMany({
      where: { tenantId },
    }),
  ]);

  const folders = new Map(
    folderRows.map((row) => [
      row.id,
      {
        id: row.id,
        parentId: row.parentId,
        accessInheritanceMode: row.accessInheritanceMode,
      },
    ]),
  );

  const documents = new Map(
    documentRows.map((row) => [
      row.id,
      {
        id: row.id,
        folderId: row.folderId,
        accessInheritanceMode: row.accessInheritanceMode,
      },
    ]),
  );

  const folderGrants = new Map<string, WorkspaceAccessGrantSnapshot[]>();
  const documentGrants = new Map<string, WorkspaceAccessGrantSnapshot[]>();

  for (const row of grantRows) {
    const grant = mapGrantRow(row);
    if (row.folderId) {
      const list = folderGrants.get(row.folderId) ?? [];
      list.push(grant);
      folderGrants.set(row.folderId, list);
    }
    if (row.documentId) {
      const list = documentGrants.get(row.documentId) ?? [];
      list.push(grant);
      documentGrants.set(row.documentId, list);
    }
  }

  return {
    tenantId,
    folders,
    documents,
    folderGrants,
    documentGrants,
  };
}

function folderNodeFromGraph(
  graph: WorkspaceResourceGraph,
  folderId: string,
): WorkspaceResourceAccessNode | null {
  const folder = graph.folders.get(folderId);
  if (!folder) {
    return null;
  }

  return {
    id: folder.id,
    tenantId: graph.tenantId,
    resourceType: WorkspaceResourceType.FOLDER,
    parentFolderId: folder.parentId,
    accessInheritanceMode: folder.accessInheritanceMode,
    grants: graph.folderGrants.get(folder.id) ?? [],
  };
}

function documentNodeFromGraph(
  graph: WorkspaceResourceGraph,
  documentId: string,
): WorkspaceResourceAccessNode | null {
  const document = graph.documents.get(documentId);
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    tenantId: graph.tenantId,
    resourceType: WorkspaceResourceType.DOCUMENT,
    parentFolderId: document.folderId,
    accessInheritanceMode: document.accessInheritanceMode,
    grants: graph.documentGrants.get(document.id) ?? [],
  };
}

const MAX_ANCESTRY_DEPTH = 256;

export function buildFolderAccessChain(
  graph: WorkspaceResourceGraph,
  folderId: string,
): ResourceAccessChain | null {
  const ancestors: WorkspaceResourceAccessNode[] = [];
  const visited = new Set<string>();

  let currentParentId = graph.folders.get(folderId)?.parentId ?? null;
  let depth = 0;

  while (currentParentId) {
    if (visited.has(currentParentId) || depth >= MAX_ANCESTRY_DEPTH) {
      return null;
    }
    visited.add(currentParentId);
    const node = folderNodeFromGraph(graph, currentParentId);
    if (!node) {
      return null;
    }
    ancestors.unshift(node);
    currentParentId = graph.folders.get(currentParentId)?.parentId ?? null;
    depth += 1;
  }

  const resource = folderNodeFromGraph(graph, folderId);
  if (!resource) {
    return null;
  }

  return { ancestors, resource };
}

export function buildDocumentAccessChain(
  graph: WorkspaceResourceGraph,
  documentId: string,
): ResourceAccessChain | null {
  const document = graph.documents.get(documentId);
  if (!document) {
    return null;
  }

  const ancestors: WorkspaceResourceAccessNode[] = [];

  if (document.folderId) {
    const folderChain = buildFolderAccessChain(graph, document.folderId);
    if (!folderChain) {
      return null;
    }
    ancestors.push(...folderChain.ancestors, folderChain.resource);
  }

  const resource = documentNodeFromGraph(graph, documentId);
  if (!resource) {
    return null;
  }

  return { ancestors, resource };
}

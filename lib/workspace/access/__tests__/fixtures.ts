import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";

import type { ResourceAccessChain } from "@/lib/workspace/access/effective-access";
import type {
  WorkspaceAccessGrantSnapshot,
  WorkspaceResourceAccessNode as Node,
} from "@/lib/workspace/access/types";

const TENANT = "tenant-1";

export function grant(partial: Partial<WorkspaceAccessGrantSnapshot> & {
  subjectType: WorkspaceAccessSubjectType;
  accessLevel: WorkspaceAccessGrantSnapshot["accessLevel"];
}): WorkspaceAccessGrantSnapshot {
  return {
    id: partial.id ?? `g-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: TENANT,
    resourceType: WorkspaceResourceType.FOLDER,
    folderId: "folder-x",
    documentId: null,
    personId: null,
    orgUnitId: null,
    teamId: null,
    roleFunctionKey: null,
    roleScopeOrgUnitId: null,
    roleScopeTeamId: null,
    ...partial,
  };
}

export function folderNode(input: {
  id: string;
  mode: WorkspaceAccessInheritanceMode;
  grants: WorkspaceAccessGrantSnapshot[];
  parentFolderId?: string | null;
}): Node {
  return {
    id: input.id,
    tenantId: TENANT,
    resourceType: WorkspaceResourceType.FOLDER,
    parentFolderId: input.parentFolderId ?? null,
    accessInheritanceMode: input.mode,
    grants: input.grants.map((g) => ({
      ...g,
      folderId: input.id,
      resourceType: WorkspaceResourceType.FOLDER,
    })),
  };
}

export function chain(
  nodes: Node[],
): ResourceAccessChain {
  const resource = nodes[nodes.length - 1]!;
  return {
    ancestors: nodes.slice(0, -1),
    resource,
  };
}

export function rootOrganisationView(id = "root"): Node {
  return folderNode({
    id,
    mode: WorkspaceAccessInheritanceMode.EXPLICIT,
    grants: [
      grant({
        id: `${id}-org`,
        subjectType: WorkspaceAccessSubjectType.ORGANISATION,
        accessLevel: "VIEW",
      }),
    ],
  });
}

export { TENANT };

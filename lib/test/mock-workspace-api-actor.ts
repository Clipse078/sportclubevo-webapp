import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";
import type { Session } from "next-auth";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceApiActorResult } from "@/lib/workspace/workspace-api-actor";

export function createOrganizationViewDocumentGraph(
  tenantId: string,
  documentIds: readonly string[],
): WorkspaceResourceGraph {
  const documents = new Map<
    string,
    {
      id: string;
      folderId: string | null;
      accessInheritanceMode: WorkspaceAccessInheritanceMode;
    }
  >();
  const documentGrants = new Map<
    string,
    {
      id: string;
      tenantId: string;
      resourceType: typeof WorkspaceResourceType.DOCUMENT;
      folderId: null;
      documentId: string;
      subjectType: typeof WorkspaceAccessSubjectType.ORGANISATION;
      accessLevel: "VIEW";
      personId: null;
      orgUnitId: null;
      teamId: null;
      roleFunctionKey: null;
      roleScopeOrgUnitId: null;
      roleScopeTeamId: null;
    }[]
  >();

  for (const documentId of documentIds) {
    documents.set(documentId, {
      id: documentId,
      folderId: null,
      accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
    });
    documentGrants.set(documentId, [
      {
        id: `grant-${documentId}`,
        tenantId,
        resourceType: WorkspaceResourceType.DOCUMENT,
        folderId: null,
        documentId,
        subjectType: WorkspaceAccessSubjectType.ORGANISATION,
        accessLevel: "VIEW",
        personId: null,
        orgUnitId: null,
        teamId: null,
        roleFunctionKey: null,
        roleScopeOrgUnitId: null,
        roleScopeTeamId: null,
      },
    ]);
  }

  return {
    tenantId,
    folders: new Map(),
    documents,
    folderGrants: new Map(),
    documentGrants,
  };
}

export function createMockWorkspaceActorContext(input: {
  tenantId: string;
  userId: string;
  personId?: string | null;
  permissionKeys?: readonly string[];
  graph?: WorkspaceResourceGraph;
  viewableDocumentIds?: readonly string[];
}): WorkspaceActorContext {
  const graph =
    input.graph ??
    createOrganizationViewDocumentGraph(
      input.tenantId,
      input.viewableDocumentIds ?? [],
    );

  return {
    identity: {
      tenantId: input.tenantId,
      userId: input.userId,
      personId: input.personId ?? null,
    },
    membership: {
      tenantId: input.tenantId,
      personId: input.personId ?? null,
      orgUnitIds: new Set<string>(),
      teamIds: new Set<string>(),
      roleAssignments: [],
    },
    permissionKeys: input.permissionKeys ?? [PERMISSIONS.WORKSPACE_VIEW],
    graph,
    isCanonicalTenantClubAdmin: false,
  };
}

export function createMockWorkspaceApiActorSuccess(input: {
  tenantId: string;
  userId: string;
  personId?: string | null;
  permissionKeys?: readonly string[];
  viewableDocumentIds?: readonly string[];
}): Extract<WorkspaceApiActorResult, { ok: true }> {
  return {
    ok: true,
    session: {
      user: {
        id: input.userId,
        activeTenantId: input.tenantId,
      },
    } as Session,
    tenantId: input.tenantId,
    actorUserId: input.userId,
    actor: createMockWorkspaceActorContext(input),
  };
}

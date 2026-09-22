/**
 * WORKSPACE-02 — persist WORKSPACE-01 default policies on resource creation.
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceResourceType,
} from "@prisma/client";

import {
  buildDefaultChildResourcePolicy,
  buildDefaultRootResourcePolicy,
} from "@/lib/workspace/access/effective-access";
import type { WorkspaceAccessGrantSnapshot } from "@/lib/workspace/access/types";

type WorkspaceAccessGrantCreateFields = {
  tenantId: string;
  resourceType: WorkspaceResourceType;
  subjectType: WorkspaceAccessGrantSnapshot["subjectType"];
  accessLevel: WorkspaceAccessGrantSnapshot["accessLevel"];
  personId: string | null;
  orgUnitId: string | null;
  teamId: string | null;
  roleFunctionKey: string | null;
  roleScopeOrgUnitId: string | null;
  roleScopeTeamId: string | null;
};

function mapGrantFields(
  grant: Omit<
    WorkspaceAccessGrantSnapshot,
    "id" | "createdAt" | "updatedAt" | "folderId" | "documentId"
  >,
): WorkspaceAccessGrantCreateFields {
  return {
    tenantId: grant.tenantId,
    resourceType: grant.resourceType,
    subjectType: grant.subjectType,
    accessLevel: grant.accessLevel,
    personId: grant.personId ?? null,
    orgUnitId: grant.orgUnitId ?? null,
    teamId: grant.teamId ?? null,
    roleFunctionKey: grant.roleFunctionKey ?? null,
    roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
    roleScopeTeamId: grant.roleScopeTeamId ?? null,
  };
}

export function rootFolderPolicyCreateInput(input: {
  tenantId: string;
  folderId: string;
  creatorPersonId?: string | null;
}): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  accessGrants: { create: WorkspaceAccessGrantCreateFields[] };
} {
  const policy = buildDefaultRootResourcePolicy({
    tenantId: input.tenantId,
    resourceType: WorkspaceResourceType.FOLDER,
    resourceId: input.folderId,
    creatorPersonId: input.creatorPersonId,
  });

  return {
    accessInheritanceMode: policy.accessInheritanceMode,
    accessGrants: {
      create: policy.grants.map((grant) => mapGrantFields(grant)),
    },
  };
}

export function rootDocumentPolicyCreateInput(input: {
  tenantId: string;
  documentId: string;
  creatorPersonId?: string | null;
}): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  accessGrants: { create: WorkspaceAccessGrantCreateFields[] };
} {
  const policy = buildDefaultRootResourcePolicy({
    tenantId: input.tenantId,
    resourceType: WorkspaceResourceType.DOCUMENT,
    resourceId: input.documentId,
    creatorPersonId: input.creatorPersonId,
  });

  return {
    accessInheritanceMode: policy.accessInheritanceMode,
    accessGrants: {
      create: policy.grants.map((grant) => mapGrantFields(grant)),
    },
  };
}

export function nestedResourceInheritPolicy(): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
} {
  return buildDefaultChildResourcePolicy();
}

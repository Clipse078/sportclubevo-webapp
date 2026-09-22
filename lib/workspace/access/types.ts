/**
 * WORKSPACE-01 — pure domain types for Workspace resource ACL (no WORKSPACE-02 query enforcement).
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
  type WorkspaceAccessLevel,
} from "@prisma/client";

import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";

export type WorkspaceResourceRef =
  | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
  | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };

export type WorkspaceGrantFields = {
  subjectType: WorkspaceAccessSubjectType;
  accessLevel: WorkspaceAccessLevel;
  personId?: string | null;
  orgUnitId?: string | null;
  teamId?: string | null;
  roleFunctionKey?: string | null;
  roleScopeOrgUnitId?: string | null;
  roleScopeTeamId?: string | null;
};

export type WorkspaceAccessGrantSnapshot = WorkspaceGrantFields & {
  id: string;
  tenantId: string;
  resourceType: WorkspaceResourceType;
  folderId?: string | null;
  documentId?: string | null;
};

export type WorkspaceResourceAccessNode = {
  id: string;
  tenantId: string;
  resourceType: WorkspaceResourceType;
  parentFolderId: string | null;
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  grants: readonly WorkspaceAccessGrantSnapshot[];
};

export type AudienceRef =
  | { kind: "ORGANISATION" }
  | { kind: "ORG_UNIT"; orgUnitId: string }
  | { kind: "TEAM"; teamId: string }
  | {
      kind: "ROLE";
      functionKey: string;
      roleScopeOrgUnitId?: string | null;
      roleScopeTeamId?: string | null;
    }
  | { kind: "PERSON"; personId: string };

export type AccessPathSegment = {
  audience: AudienceRef;
  level: CanonicalResourceLevel;
  source: "explicit_grant" | "inherited";
  resourceId: string;
  resourceType: WorkspaceResourceType;
};

export type EffectiveAccessPath = {
  /** All audience predicates that must hold (AND), including ancestors. */
  requiredAudiences: AudienceRef[];
  effectiveLevel: CanonicalResourceLevel;
  segments: AccessPathSegment[];
};

export type ActorWorkspaceIdentity = {
  tenantId: string;
  userId: string;
  /** Same-tenant Person.id when User is linked; null when no Person row. */
  personId: string | null;
};

export type TenantEntityRef = {
  tenantId: string;
};

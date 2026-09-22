/**
 * WORKSPACE-03 — typed access-management view models (not raw Prisma ACL rows).
 */

import type { WorkspaceAccessInheritanceMode, WorkspaceResourceType } from "@prisma/client";

import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";

export type WorkspaceAccessPolicyModeDto = WorkspaceAccessInheritanceMode;

export type WorkspaceAccessAudienceKindDto =
  | "ORGANISATION"
  | "ORG_UNIT"
  | "TEAM"
  | "ROLE"
  | "PERSON";

export type WorkspaceAccessGrantMutationFieldsDto = {
  subjectType: WorkspaceAccessAudienceKindDto;
  accessLevel: CanonicalResourceLevel;
  personId?: string | null;
  orgUnitId?: string | null;
  teamId?: string | null;
  roleFunctionKey?: string | null;
  roleScopeOrgUnitId?: string | null;
  roleScopeTeamId?: string | null;
};

export type WorkspaceAccessGrantRuleDto = {
  id: string;
  audienceKind: WorkspaceAccessAudienceKindDto;
  audienceLabel: string;
  accessLevel: CanonicalResourceLevel;
  accessLevelLabel: string;
  accessLevelDescription: string;
  /** Canonical mutation payload for policy PUT (direct rules only). */
  mutationFields: WorkspaceAccessGrantMutationFieldsDto;
  /** Stable key for matching effective-access rows to configured grants. */
  audienceKey: string;
};

export type WorkspaceEffectiveAccessEntryDto = {
  audienceKind: WorkspaceAccessAudienceKindDto;
  audienceLabel: string;
  audienceKey: string;
  effectiveLevel: CanonicalResourceLevel;
  effectiveLevelLabel: string;
  sourceLabel: string;
  cappedByAncestor: boolean;
  ancestorCapLabel: string | null;
};

export type WorkspaceInheritedAccessEntryDto = {
  audienceKind: WorkspaceAccessAudienceKindDto;
  audienceLabel: string;
  level: CanonicalResourceLevel;
  levelLabel: string;
  inheritedFromResourceId: string;
  inheritedFromResourceName: string;
  inheritedFromResourceType: WorkspaceResourceType;
};

export type WorkspaceAccessManagementResourceDto = {
  id: string;
  resourceType: WorkspaceResourceType;
  name: string;
  parentId: string | null;
  parentName: string | null;
};

export type WorkspaceAccessManagementViewModel = {
  resource: WorkspaceAccessManagementResourceDto;
  policyMode: WorkspaceAccessPolicyModeDto;
  policyModeLabel: string;
  canManage: true;
  explicitGrants: WorkspaceAccessGrantRuleDto[];
  effectiveAccess: WorkspaceEffectiveAccessEntryDto[];
  inheritedAccess: WorkspaceInheritedAccessEntryDto[];
  inheritDescription: string;
  /** Safe initial grants when switching from INHERIT → EXPLICIT (no broadening). */
  restrictionSeedGrants: WorkspaceAccessGrantMutationFieldsDto[];
};

export type WorkspaceAccessSummaryEntryDto = {
  audienceLabel: string;
  levelLabel: string;
};

export type WorkspaceAccessSummaryViewModel = {
  resourceId: string;
  resourceType: WorkspaceResourceType;
  entries: WorkspaceAccessSummaryEntryDto[];
  moreCount: number;
};

export type WorkspaceAccessPolicyMutationInput = {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  grants: {
    subjectType: WorkspaceAccessGrantRuleDto["audienceKind"];
    accessLevel: CanonicalResourceLevel;
    personId?: string | null;
    orgUnitId?: string | null;
    teamId?: string | null;
    roleFunctionKey?: string | null;
    roleScopeOrgUnitId?: string | null;
    roleScopeTeamId?: string | null;
  }[];
};

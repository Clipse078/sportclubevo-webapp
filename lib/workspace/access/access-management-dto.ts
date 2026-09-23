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
  configuredLevel: CanonicalResourceLevel | null;
  configuredLevelLabel: string | null;
  sourceLabel: string;
  whyLabel: string;
  cappedByAncestor: boolean;
  ancestorCapLabel: string | null;
  /** Number of canonical resolver paths contributing to this audience row (>1 = multiple paths). */
  pathCount: number;
  isInherited: boolean;
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

export type WorkspaceActorAuthoritySummaryDto = {
  effectiveLevel: CanonicalResourceLevel;
  effectiveLevelLabel: string;
  sourceKind: "CLUB_ADMIN" | "ACL";
  sourceLabel: string;
  /** ACL-derived level for the actor when Club Admin override applies (configured vs authority). */
  configuredActorLevel: CanonicalResourceLevel | null;
  configuredActorLevelLabel: string | null;
};

export type WorkspaceAccessSummaryViewModel = {
  resourceId: string;
  resourceType: WorkspaceResourceType;
  policyMode: WorkspaceAccessPolicyModeDto;
  policyModeHeadline: string;
  inheritanceDescription: string;
  parentName: string | null;
  actorAuthority: WorkspaceActorAuthoritySummaryDto | null;
  effectiveAccess: WorkspaceEffectiveAccessEntryDto[];
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

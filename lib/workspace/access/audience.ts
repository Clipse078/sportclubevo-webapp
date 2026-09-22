/**
 * WORKSPACE-01 — audience references and subset / intersection helpers.
 */

import { WorkspaceAccessSubjectType } from "@prisma/client";

import type { WorkspaceGrantFields } from "@/lib/workspace/access/types";
import type { AudienceRef } from "@/lib/workspace/access/types";

export type { AudienceRef };

export function audienceRefFromGrant(grant: WorkspaceGrantFields): AudienceRef {
  switch (grant.subjectType) {
    case WorkspaceAccessSubjectType.ORGANISATION:
      return { kind: "ORGANISATION" };
    case WorkspaceAccessSubjectType.ORG_UNIT:
      return { kind: "ORG_UNIT", orgUnitId: grant.orgUnitId!.trim() };
    case WorkspaceAccessSubjectType.TEAM:
      return { kind: "TEAM", teamId: grant.teamId!.trim() };
    case WorkspaceAccessSubjectType.ROLE:
      return {
        kind: "ROLE",
        functionKey: grant.roleFunctionKey!.trim(),
        roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
        roleScopeTeamId: grant.roleScopeTeamId ?? null,
      };
    case WorkspaceAccessSubjectType.PERSON:
      return { kind: "PERSON", personId: grant.personId!.trim() };
    default:
      throw new Error(`Cannot map subject type to audience: ${grant.subjectType as string}`);
  }
}

export function audienceKey(audience: AudienceRef): string {
  switch (audience.kind) {
    case "ORGANISATION":
      return "ORGANISATION";
    case "ORG_UNIT":
      return `ORG_UNIT:${audience.orgUnitId}`;
    case "TEAM":
      return `TEAM:${audience.teamId}`;
    case "ROLE":
      return `ROLE:${audience.functionKey}:${audience.roleScopeOrgUnitId ?? ""}:${audience.roleScopeTeamId ?? ""}`;
    case "PERSON":
      return `PERSON:${audience.personId}`;
    default:
      return "UNKNOWN";
  }
}

/** True when `child` cannot widen beyond `parent` (structural, pre-membership). */
export function isAudienceStructurallyWithinParent(
  parent: AudienceRef,
  child: AudienceRef,
): boolean {
  if (child.kind === "ORGANISATION") {
    return parent.kind === "ORGANISATION";
  }

  if (parent.kind === "ORGANISATION") {
    return true;
  }

  if (parent.kind === "ORG_UNIT") {
    if (child.kind === "ORG_UNIT") {
      return child.orgUnitId === parent.orgUnitId;
    }
    if (child.kind === "ROLE" && child.roleScopeOrgUnitId) {
      return child.roleScopeOrgUnitId === parent.orgUnitId;
    }
    if (child.kind === "PERSON") {
      return true;
    }
    if (child.kind === "TEAM") {
      return true;
    }
    return false;
  }

  if (parent.kind === "TEAM") {
    if (child.kind === "TEAM") {
      return child.teamId === parent.teamId;
    }
    if (child.kind === "ROLE" && child.roleScopeTeamId) {
      return child.roleScopeTeamId === parent.teamId;
    }
    if (child.kind === "PERSON") {
      return true;
    }
    return false;
  }

  if (parent.kind === "ROLE") {
    if (child.kind === "ROLE") {
      if (child.functionKey !== parent.functionKey) return false;
      if (
        parent.roleScopeOrgUnitId &&
        child.roleScopeOrgUnitId &&
        child.roleScopeOrgUnitId !== parent.roleScopeOrgUnitId
      ) {
        return false;
      }
      if (
        parent.roleScopeTeamId &&
        child.roleScopeTeamId &&
        child.roleScopeTeamId !== parent.roleScopeTeamId
      ) {
        return false;
      }
      return true;
    }
    if (child.kind === "PERSON") {
      return true;
    }
    return false;
  }

  if (parent.kind === "PERSON") {
    return child.kind === "PERSON" && child.personId === parent.personId;
  }

  return false;
}

export function mergeRequiredAudiences(
  ancestorAudiences: readonly AudienceRef[],
  grantAudience: AudienceRef,
): AudienceRef[] {
  const required = [...ancestorAudiences];
  if (grantAudience.kind !== "ORGANISATION") {
    required.push(grantAudience);
  }
  return required;
}

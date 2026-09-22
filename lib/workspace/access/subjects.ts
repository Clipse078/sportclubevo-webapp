/**
 * WORKSPACE-01 — audience / subject shape validation (fail closed).
 */

import { WorkspaceAccessSubjectType } from "@prisma/client";

import type { WorkspaceGrantFields } from "@/lib/workspace/access/types";
import { audienceRefFromGrant, type AudienceRef } from "@/lib/workspace/access/audience";

export class WorkspaceAccessSubjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessSubjectValidationError";
  }
}

const LEGACY_SUBJECT_TYPES = new Set<WorkspaceAccessSubjectType>([
  WorkspaceAccessSubjectType.USER,
  WorkspaceAccessSubjectType.TARGET_GROUP,
]);

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function assertEmpty(
  grant: WorkspaceGrantFields,
  fields: (keyof WorkspaceGrantFields)[],
  subjectLabel: string,
): void {
  for (const field of fields) {
    const value = grant[field];
    if (value != null && value !== "") {
      throw new WorkspaceAccessSubjectValidationError(
        `${subjectLabel} grant must not set ${String(field)}.`,
      );
    }
  }
}

export function validateGrantSubjectShape(grant: WorkspaceGrantFields): AudienceRef {
  if (LEGACY_SUBJECT_TYPES.has(grant.subjectType)) {
    throw new WorkspaceAccessSubjectValidationError(
      `Legacy subject type ${grant.subjectType} is not supported for WORKSPACE-01 grants.`,
    );
  }

  switch (grant.subjectType) {
    case WorkspaceAccessSubjectType.ORGANISATION:
      assertEmpty(grant, [
        "personId",
        "orgUnitId",
        "teamId",
        "roleFunctionKey",
        "roleScopeOrgUnitId",
        "roleScopeTeamId",
      ], "ORGANISATION");
      break;
    case WorkspaceAccessSubjectType.PERSON:
      if (!hasText(grant.personId)) {
        throw new WorkspaceAccessSubjectValidationError(
          "PERSON grant requires personId.",
        );
      }
      assertEmpty(grant, [
        "orgUnitId",
        "teamId",
        "roleFunctionKey",
        "roleScopeOrgUnitId",
        "roleScopeTeamId",
      ], "PERSON");
      break;
    case WorkspaceAccessSubjectType.ORG_UNIT:
      if (!hasText(grant.orgUnitId)) {
        throw new WorkspaceAccessSubjectValidationError(
          "ORG_UNIT grant requires orgUnitId.",
        );
      }
      assertEmpty(grant, [
        "personId",
        "teamId",
        "roleFunctionKey",
        "roleScopeOrgUnitId",
        "roleScopeTeamId",
      ], "ORG_UNIT");
      break;
    case WorkspaceAccessSubjectType.TEAM:
      if (!hasText(grant.teamId)) {
        throw new WorkspaceAccessSubjectValidationError(
          "TEAM grant requires teamId.",
        );
      }
      assertEmpty(grant, [
        "personId",
        "orgUnitId",
        "roleFunctionKey",
        "roleScopeOrgUnitId",
        "roleScopeTeamId",
      ], "TEAM");
      break;
    case WorkspaceAccessSubjectType.ROLE:
      if (!hasText(grant.roleFunctionKey)) {
        throw new WorkspaceAccessSubjectValidationError(
          "ROLE grant requires roleFunctionKey.",
        );
      }
      assertEmpty(grant, ["personId", "orgUnitId", "teamId"], "ROLE");
      break;
    default:
      throw new WorkspaceAccessSubjectValidationError(
        `Unsupported subject type: ${grant.subjectType as string}`,
      );
  }

  return audienceRefFromGrant(grant);
}

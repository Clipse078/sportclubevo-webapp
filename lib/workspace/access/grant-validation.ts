/**
 * WORKSPACE-01 — grant mutation validation (resource XOR, tenant, role function keys).
 */

import { WorkspaceResourceType } from "@prisma/client";

import { isPersonFunctionKey } from "@/lib/people/functions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  validateGrantSubjectShape,
  WorkspaceAccessSubjectValidationError,
} from "@/lib/workspace/access/subjects";
import type {
  TenantEntityRef,
  WorkspaceAccessGrantSnapshot,
  WorkspaceGrantFields,
  WorkspaceResourceRef,
} from "@/lib/workspace/access/types";

export class WorkspaceAccessGrantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessGrantValidationError";
  }
}

export type GrantValidationContext = {
  tenantId: string;
  resource: WorkspaceResourceRef;
  resourceTenantId: string;
  parentFolderTenantId?: string | null;
  personTenantId?: string | null;
  orgUnitTenantId?: string | null;
  teamTenantId?: string | null;
  roleScopeOrgUnitTenantId?: string | null;
  roleScopeTeamTenantId?: string | null;
  teamBelongsToOrgUnit?: boolean | null;
};

const TECHNICAL_PERMISSION_KEYS = new Set<string>([
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.WORKSPACE_MANAGE,
  PERMISSIONS.WORKSPACE_DELETE,
  "workspace.upload",
  "workspace.edit",
]);

export function validateResourceTargetShape(input: {
  folderId?: string | null;
  documentId?: string | null;
}): WorkspaceResourceRef {
  const hasFolder = Boolean(input.folderId?.trim());
  const hasDocument = Boolean(input.documentId?.trim());

  if (hasFolder && hasDocument) {
    throw new WorkspaceAccessGrantValidationError(
      "Grant must target exactly one resource: folder or document, not both.",
    );
  }
  if (!hasFolder && !hasDocument) {
    throw new WorkspaceAccessGrantValidationError(
      "Grant must target a folder or document.",
    );
  }

  if (hasFolder) {
    return {
      resourceType: WorkspaceResourceType.FOLDER,
      folderId: input.folderId!.trim(),
    };
  }
  return {
    resourceType: WorkspaceResourceType.DOCUMENT,
    documentId: input.documentId!.trim(),
  };
}

export function validateRoleFunctionKey(functionKey: string): void {
  const trimmed = functionKey.trim();
  if (!trimmed) {
    throw new WorkspaceAccessGrantValidationError(
      "ROLE grant requires a non-empty roleFunctionKey.",
    );
  }
  if (TECHNICAL_PERMISSION_KEYS.has(trimmed)) {
    throw new WorkspaceAccessGrantValidationError(
      "Technical RBAC permission keys cannot be used as organisational ROLE grants.",
    );
  }
  if (!isPersonFunctionKey(trimmed)) {
    throw new WorkspaceAccessGrantValidationError(
      `Unknown organisational functionKey: ${trimmed}`,
    );
  }
}

export function validateGrantTenantAlignment(ctx: GrantValidationContext): void {
  if (ctx.resourceTenantId !== ctx.tenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Resource tenant does not match grant tenant.",
    );
  }

  if (ctx.parentFolderTenantId != null && ctx.parentFolderTenantId !== ctx.tenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Parent folder tenant mismatch.",
    );
  }

  if (ctx.personTenantId != null && ctx.personTenantId !== ctx.tenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Person belongs to a different tenant.",
    );
  }

  if (ctx.orgUnitTenantId != null && ctx.orgUnitTenantId !== ctx.tenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Org unit belongs to a different tenant.",
    );
  }

  if (ctx.teamTenantId != null && ctx.teamTenantId !== ctx.tenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Team belongs to a different tenant.",
    );
  }

  if (
    ctx.roleScopeOrgUnitTenantId != null &&
    ctx.roleScopeOrgUnitTenantId !== ctx.tenantId
  ) {
    throw new WorkspaceAccessGrantValidationError(
      "Role scope org unit belongs to a different tenant.",
    );
  }

  if (
    ctx.roleScopeTeamTenantId != null &&
    ctx.roleScopeTeamTenantId !== ctx.tenantId
  ) {
    throw new WorkspaceAccessGrantValidationError(
      "Role scope team belongs to a different tenant.",
    );
  }

  if (ctx.teamBelongsToOrgUnit === false) {
    throw new WorkspaceAccessGrantValidationError(
      "Role scope team is not coherent with scoped org unit.",
    );
  }
}

export function validateWorkspaceAccessGrantMutation(
  ctx: GrantValidationContext,
  grant: WorkspaceGrantFields,
): void {
  validateResourceTargetShape({
    folderId:
      ctx.resource.resourceType === WorkspaceResourceType.FOLDER
        ? ctx.resource.folderId
        : null,
    documentId:
      ctx.resource.resourceType === WorkspaceResourceType.DOCUMENT
        ? ctx.resource.documentId
        : null,
  });

  validateGrantTenantAlignment(ctx);

  const audience = validateGrantSubjectShape(grant);

  if (audience.kind === "ROLE") {
    validateRoleFunctionKey(audience.functionKey);
  }

  void audience;
}

export function grantEquivalenceKey(grant: WorkspaceGrantFields): string {
  return [
    grant.subjectType,
    grant.accessLevel,
    grant.personId ?? "",
    grant.orgUnitId ?? "",
    grant.teamId ?? "",
    grant.roleFunctionKey ?? "",
    grant.roleScopeOrgUnitId ?? "",
    grant.roleScopeTeamId ?? "",
  ].join("|");
}

export function findDuplicateGrant(
  existing: readonly WorkspaceAccessGrantSnapshot[],
  candidate: WorkspaceGrantFields,
): WorkspaceAccessGrantSnapshot | undefined {
  const key = grantEquivalenceKey(candidate);
  return existing.find((g) => grantEquivalenceKey(g) === key);
}

export function assertNoDuplicateGrant(
  existing: readonly WorkspaceAccessGrantSnapshot[],
  candidate: WorkspaceGrantFields,
): void {
  const dup = findDuplicateGrant(existing, candidate);
  if (dup) {
    throw new WorkspaceAccessGrantValidationError(
      `Duplicate equivalent grant already exists (${dup.id}).`,
    );
  }
}

export function assertResourceTenant(
  resource: TenantEntityRef,
  expectedTenantId: string,
): void {
  if (resource.tenantId !== expectedTenantId) {
    throw new WorkspaceAccessGrantValidationError(
      "Resource belongs to a foreign tenant.",
    );
  }
}

export {
  WorkspaceAccessSubjectValidationError,
};

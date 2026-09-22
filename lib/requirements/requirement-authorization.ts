/**
 * AUFGABEN-06G1 — canonical Requirement authorization (separate from tasks.*).
 */

import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { RequirementServiceContext } from "./types";

const TASK_READ_PERMISSIONS = [
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.TASKS_VIEW_ALL,
  PERMISSIONS.TASKS_MANAGE,
] as const;

export type RequirementAuthorizationRecord = {
  tenantId: string;
  createdByUserId: string | null;
};

export type RequirementRecipientAuthorizationRecord = {
  tenantId: string;
  requirementId: string;
  subjectPersonId: string;
  removedAt: Date | null;
};

function hasPermission(ctx: RequirementServiceContext, permission: string): boolean {
  return ctx.permissionKeys.includes(permission);
}

export function hasRequirementPermission(ctx: RequirementServiceContext, permission: string): boolean {
  return hasPermission(ctx, permission);
}

/** Task permissions must never imply Requirement management or aggregate access. */
export function taskPermissionsGrantRequirementManagement(ctx: RequirementServiceContext): boolean {
  return TASK_READ_PERMISSIONS.some((p) => hasPermission(ctx, p));
}

export function canCreateRequirement(ctx: RequirementServiceContext): boolean {
  return (
    hasPermission(ctx, PERMISSIONS.REQUIREMENTS_CREATE) ||
    hasPermission(ctx, PERMISSIONS.REQUIREMENTS_MANAGE)
  );
}

export function canManageRequirement(
  ctx: RequirementServiceContext,
  _record?: RequirementAuthorizationRecord,
): boolean {
  void _record;
  return hasPermission(ctx, PERMISSIONS.REQUIREMENTS_MANAGE);
}

export function canReadRequirement(
  ctx: RequirementServiceContext,
  record: RequirementAuthorizationRecord,
): boolean {
  if (record.tenantId !== ctx.tenantId) return false;
  return (
    hasPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW) ||
    hasPermission(ctx, PERMISSIONS.REQUIREMENTS_MANAGE) ||
    hasPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE)
  );
}

export function canReadRequirementAggregate(
  ctx: RequirementServiceContext,
  record: RequirementAuthorizationRecord,
): boolean {
  if (record.tenantId !== ctx.tenantId) return false;
  return hasPermission(ctx, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE);
}

export function canListRequirementRecipients(
  ctx: RequirementServiceContext,
  record: RequirementAuthorizationRecord,
): boolean {
  return canManageRequirement(ctx, record);
}

export function canReadOwnRequirementRecipient(
  ctx: RequirementServiceContext,
  recipient: RequirementRecipientAuthorizationRecord,
  authorizedSubjectPersonIds: readonly string[],
): boolean {
  if (recipient.tenantId !== ctx.tenantId) return false;
  if (recipient.removedAt) return false;
  return authorizedSubjectPersonIds.includes(recipient.subjectPersonId);
}

export function canRespondToRequirementRecipient(
  ctx: RequirementServiceContext,
  recipient: RequirementRecipientAuthorizationRecord,
  authorizedSubjectPersonIds: readonly string[],
): boolean {
  return canReadOwnRequirementRecipient(ctx, recipient, authorizedSubjectPersonIds);
}

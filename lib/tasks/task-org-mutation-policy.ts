/**
 * AUFGABEN-05-ORG-03 — server-side Task org/visibility mutation policy.
 *
 * Evaluates destination visibility + orgUnitId. Never trusts client input.
 */

import { TaskVisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "./errors";
import { assertTaskOrgUnitBelongsToTenant } from "./task-org-ownership";
import type { TaskServiceContext } from "./types";
import {
  canManageTask,
  EMPTY_TASK_AUTH_SCOPE,
  hasTaskPermission,
  type TaskAuthorizationRecord,
} from "./visibility";

export type TaskOrgVisibilityState = {
  visibilityScope: TaskVisibilityScope;
  orgUnitId: string | null;
};

const VALID_VISIBILITY_SCOPES = new Set<string>(Object.values(TaskVisibilityScope));

export function parseTaskVisibilityScope(raw: unknown): TaskVisibilityScope | null {
  if (typeof raw !== "string" || !VALID_VISIBILITY_SCOPES.has(raw)) {
    return null;
  }
  return raw as TaskVisibilityScope;
}

function resolveAuth(ctx: TaskServiceContext) {
  return ctx.auth ?? EMPTY_TASK_AUTH_SCOPE;
}

/** Tenant-wide task management (club-visible escalation, any active org ownership). */
export function hasTenantWideTaskManage(ctx: TaskServiceContext): boolean {
  return hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
}

export function canAssignTaskOrgUnit(
  ctx: TaskServiceContext,
  orgUnitId: string,
): boolean {
  if (!orgUnitId.trim()) return false;
  if (hasTenantWideTaskManage(ctx)) return true;
  return resolveAuth(ctx).permissionManageOrgUnitIds.includes(orgUnitId);
}

export function canSetTaskVisibilityScope(
  ctx: TaskServiceContext,
  state: TaskOrgVisibilityState,
  mode: "create" | "edit",
): boolean {
  switch (state.visibilityScope) {
    case TaskVisibilityScope.CLUB:
      return mode === "create"
        ? hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE)
        : hasTenantWideTaskManage(ctx);
    case TaskVisibilityScope.ORG_UNIT:
      if (!state.orgUnitId?.trim()) return false;
      return canAssignTaskOrgUnit(ctx, state.orgUnitId);
    case TaskVisibilityScope.ASSIGNEES_ONLY:
      return hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
    default:
      return false;
  }
}

export function canMutateTaskOrgVisibility(
  ctx: TaskServiceContext,
  existing: TaskAuthorizationRecord,
  destination: TaskOrgVisibilityState,
  mode: "create" | "edit",
): boolean {
  if (!canSetTaskVisibilityScope(ctx, destination, mode)) {
    return false;
  }
  if (mode === "create") {
    return hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  }

  if (hasTenantWideTaskManage(ctx)) {
    return true;
  }

  if (canManageTask(ctx, existing)) {
    return true;
  }

  const isCreator = existing.createdByUserId === ctx.userId;
  const hasCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  if (isCreator && hasCreate) {
    return true;
  }

  return false;
}

export async function assertEligibleTaskOrgUnitForNewOwnership(
  tenantId: string,
  orgUnitId: string,
): Promise<void> {
  await assertTaskOrgUnitBelongsToTenant(tenantId, orgUnitId);
  const unit = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, tenantId },
    select: { status: true },
  });
  if (!unit || unit.status === "ARCHIVED") {
    throw new TaskValidationError("Organisationseinheit ist nicht verfügbar.");
  }
}

export function normalizeTaskOrgVisibilityState(
  visibilityScope?: TaskVisibilityScope,
  orgUnitId?: string | null,
): TaskOrgVisibilityState {
  return {
    visibilityScope: visibilityScope ?? TaskVisibilityScope.CLUB,
    orgUnitId: orgUnitId ?? null,
  };
}

export async function validateTaskOrgVisibilityMutation(
  ctx: TaskServiceContext,
  destination: TaskOrgVisibilityState,
  options: {
    mode: "create" | "edit";
    existing?: TaskAuthorizationRecord;
  },
): Promise<TaskOrgVisibilityState> {
  if (!VALID_VISIBILITY_SCOPES.has(destination.visibilityScope)) {
    throw new TaskValidationError("Ungültige Sichtbarkeit.");
  }

  if (
    destination.visibilityScope === TaskVisibilityScope.ORG_UNIT &&
    !destination.orgUnitId?.trim()
  ) {
    throw new TaskValidationError(
      "Für Sichtbarkeit «Organisationseinheit» ist eine Organisationseinheit erforderlich.",
    );
  }

  const orgUnitId = destination.orgUnitId?.trim() || null;
  if (orgUnitId) {
    await assertEligibleTaskOrgUnitForNewOwnership(ctx.tenantId, orgUnitId);
  }

  const normalized: TaskOrgVisibilityState = {
    visibilityScope: destination.visibilityScope,
    orgUnitId,
  };

  if (options.mode === "create") {
    if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE)) {
      throw new TaskForbiddenError();
    }
    if (!canSetTaskVisibilityScope(ctx, normalized, "create")) {
      throw new TaskForbiddenError();
    }
    return normalized;
  }

  if (!options.existing) {
    throw new TaskForbiddenError();
  }

  if (!canMutateTaskOrgVisibility(ctx, options.existing, normalized, "edit")) {
    throw new TaskForbiddenError();
  }

  return normalized;
}

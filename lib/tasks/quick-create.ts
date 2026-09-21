/**
 * AUFGABEN-06P — personal quick-create capability boundaries.
 *
 * Self-assigned quick tasks: tasks.view only (narrow service path in createQuickTask).
 * Assigning other users: canonical tasks.create + tasks.assign (or manage).
 */

import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "./types";
import { hasTaskPermission } from "./visibility";
import { TaskForbiddenError, TaskValidationError } from "./errors";

export type QuickCreateCapabilities = {
  /** May open quick create and assign only to self (tasks.view). */
  canCreateSelf: boolean;
  /** May assign other eligible tenant members (tasks.create + assign/manage). */
  canAssignOthers: boolean;
};

export function resolveQuickCreateCapabilities(
  ctx: TaskServiceContext,
): QuickCreateCapabilities {
  const canCreateSelf = hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
  const canAssignOthers =
    canAssign && hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);

  return { canCreateSelf, canAssignOthers };
}

export function assertQuickCreateAssigneeAuthorization(
  ctx: TaskServiceContext,
  assigneeUserIds: readonly string[],
): void {
  const unique = [...new Set(assigneeUserIds)];
  if (unique.length === 0) {
    throw new TaskForbiddenError("Missing assignee");
  }

  const selfOnly = unique.length === 1 && unique[0] === ctx.userId;
  if (selfOnly) {
    if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
      throw new TaskForbiddenError("Missing tasks.view");
    }
    return;
  }

  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE)) {
    throw new TaskForbiddenError("Missing tasks.create");
  }
  if (
    !hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) &&
    !hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  ) {
    throw new TaskForbiddenError("Missing tasks.assign");
  }
}

export function normalizeQuickCreateAssigneeIds(
  ctx: TaskServiceContext,
  rawIds: string[],
  canAssignOthers: boolean,
  defaultToSelfWhenEmpty = false,
): string[] {
  const unique = [...new Set(rawIds.filter(Boolean))];
  if (unique.length === 0) {
    if (defaultToSelfWhenEmpty) {
      return [ctx.userId];
    }
    throw new TaskValidationError("Missing assignee");
  }

  if (!canAssignOthers) {
    if (unique.length !== 1 || unique[0] !== ctx.userId) {
      throw new TaskForbiddenError("Cannot assign other users");
    }
  }

  return unique;
}

/** Parse assigneeUserIds from Quick Create FormData (fail-closed on corrupt explicit input). */
export function parseQuickCreateAssigneeField(
  formData: FormData,
): { ok: true; ids: string[]; defaultToSelfWhenEmpty: boolean } | { ok: false } {
  const hasField = formData.has("assigneeUserIds");
  if (!hasField) {
    return { ok: true, ids: [], defaultToSelfWhenEmpty: true };
  }

  const raw = formData.get("assigneeUserIds");
  if (typeof raw !== "string") {
    return { ok: false };
  }
  if (raw.trim() === "") {
    return { ok: false };
  }

  const tokens = raw.split(",").map((s) => s.trim());
  const ids = tokens.filter(Boolean);
  if (ids.length === 0) {
    return { ok: false };
  }

  return { ok: true, ids, defaultToSelfWhenEmpty: false };
}

const QUICK_CREATE_FORBIDDEN_FORM_KEYS = [
  "tenantId",
  "createdByUserId",
  "creatorId",
  "createdBy",
  "userId",
  "orgUnitId",
  "visibilityScope",
  "status",
  "contextType",
  "contextId",
] as const;

export function findForbiddenQuickCreateFormFields(formData: FormData): string | null {
  for (const key of QUICK_CREATE_FORBIDDEN_FORM_KEYS) {
    if (formData.has(key)) return key;
  }
  return null;
}

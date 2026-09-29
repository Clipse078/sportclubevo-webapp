import type { PermissionOverrideEffect, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import {
  overrideRowsFromRecord,
  type PermissionOverrideRow,
} from "@/lib/permissions/apply-permission-overrides";
import { assertTenantDelegationAllowed } from "@/lib/roles/delegation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

export type PermissionOverrideInput = {
  permissionKey: string;
  effect: PermissionOverrideEffect;
};

export class UserPermissionOverrideError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserPermissionOverrideError";
  }
}

async function assertActorCanManageAccess(
  db: PrismaClient,
  tenantId: string,
  actorUserId: string,
): Promise<void> {
  const resolver = createEffectivePermissionResolver(db);
  const allowed = await resolver.hasAnyPermission({
    userId: actorUserId,
    tenantId,
    permissions: [PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
  });
  if (!allowed) {
    throw new UserPermissionOverrideError("Keine Berechtigung für Zugriffsverwaltung.");
  }
}

async function validateOverrideTargets(
  db: PrismaClient,
  tenantId: string,
  actorUserId: string,
  overrides: readonly PermissionOverrideInput[],
): Promise<Map<string, string>> {
  const deduped = new Map<string, PermissionOverrideEffect>();
  for (const row of overrides) {
    deduped.set(row.permissionKey, row.effect);
  }

  const keys = Array.from(deduped.keys());
  if (keys.length === 0) return new Map();

  const permissions = await db.permission.findMany({
    where: {
      key: { in: keys },
      scope: "TENANT",
      grantableByAdmin: true,
    },
    select: { id: true, key: true },
  });

  if (permissions.length !== keys.length) {
    throw new UserPermissionOverrideError("Ungültige oder nicht zuweisbare Berechtigung.");
  }

  const allowKeys = keys.filter((key) => deduped.get(key) === "ALLOW");
  if (allowKeys.length > 0) {
    await assertTenantDelegationAllowed({
      tenantId,
      actorUserId,
      permissionKeys: allowKeys,
    });
  }

  return new Map(permissions.map((p) => [p.key, p.id]));
}

export async function listUserPermissionOverrides(
  tenantId: string,
  userId: string,
): Promise<PermissionOverrideRow[]> {
  const rows = await prisma.userPermissionOverride.findMany({
    where: { tenantId, userId },
    select: {
      effect: true,
      permission: { select: { key: true } },
    },
  });
  return rows.map((row) => ({
    permissionKey: row.permission.key,
    effect: row.effect,
  }));
}

export async function syncUserPermissionOverrides(input: {
  tenantId: string;
  userId: string;
  actorUserId: string;
  overrides: readonly PermissionOverrideInput[];
  db?: PrismaClient;
}): Promise<void> {
  const db = input.db ?? prisma;
  const { tenantId, userId, actorUserId, overrides } = input;

  await assertActorCanManageAccess(db, tenantId, actorUserId);

  const membership = await db.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new UserPermissionOverrideError("Benutzer gehört nicht zu diesem Verein.");
  }

  const keyToId = await validateOverrideTargets(db, tenantId, actorUserId, overrides);

  await db.$transaction(async (tx) => {
    await tx.userPermissionOverride.deleteMany({ where: { tenantId, userId } });

    if (overrides.length === 0) return;

    for (const row of overrides) {
      const permissionId = keyToId.get(row.permissionKey);
      if (!permissionId) continue;
      await tx.userPermissionOverride.create({
        data: {
          tenantId,
          userId,
          permissionId,
          effect: row.effect,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      });
    }
  });

  await logAction({
    tenantId,
    actorUserId,
    moduleKey: "users",
    entityType: "UserPermissionOverride",
    entityId: userId,
    action: "PERMISSION_OVERRIDES_SYNC",
    metadataJson: {
      targetUserId: userId,
      overrideCount: overrides.length,
    },
  });
}

export async function resetUserPermissionOverrides(input: {
  tenantId: string;
  userId: string;
  actorUserId: string;
}): Promise<void> {
  await syncUserPermissionOverrides({ ...input, overrides: [] });
}

export function permissionOverrideInputsFromRecord(
  record: Readonly<Record<string, PermissionOverrideEffect>>,
): PermissionOverrideInput[] {
  return overrideRowsFromRecord(record).map((row) => ({
    permissionKey: row.permissionKey,
    effect: row.effect,
  }));
}

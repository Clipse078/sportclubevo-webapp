/**
 * FCA STAGE — PR #1025 Dokumentation UAT pilot roles + additive UserRole assignments.
 *
 *   npx tsx scripts/sync-fca-dokumentation-uat-pilot-roles.ts
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *   SCE_OPERATION_AUTHORIZATION=sync-fca-dokumentation-uat-pilot-roles:stage \
 *   APPLY_FCA_DOKUMENTATION_UAT_PILOT_ROLE_SYNC=true \
 *   npx tsx scripts/sync-fca-dokumentation-uat-pilot-roles.ts
 *
 * Revoke assignments only (preserve roles + Vorstandsmitglied / Club Admin):
 *   APPLY_FCA_DOKUMENTATION_UAT_PILOT_REVOKE=true (same STAGE guard + authorisation)
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  FCA_DOKUMENTATION_UAT_PILOT_ROLES,
  PILOT_TENANT_KEY,
  TENANT_DOCUMENTATION_UAT_PERMISSION_KEYS,
  type FcaDokumentationUatPilotRoleDefinition,
} from "@/lib/roles/fca-dokumentation-uat-pilot-role-definitions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

const STAGE_FINGERPRINT = "acd3b37682911890";
const APPLY = process.env.APPLY_FCA_DOKUMENTATION_UAT_PILOT_ROLE_SYNC === "true";
const REVOKE = process.env.APPLY_FCA_DOKUMENTATION_UAT_PILOT_REVOKE === "true";
const DRY_RUN = !APPLY && !REVOKE;

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[sync-fca-dokumentation-uat-pilot-roles] DATABASE_URL is required.");
  process.exit(1);
}

if (APPLY && REVOKE) {
  console.error("Refusing: APPLY_FCA_DOKUMENTATION_UAT_PILOT_ROLE_SYNC and _REVOKE are mutually exclusive.");
  process.exit(1);
}

if (!DRY_RUN) {
  const identity = resolveRuntimeIdentity(process.env);
  if (identity.dataEnvironment !== "STAGE") {
    throw new Error(
      `[sync-fca-dokumentation-uat-pilot-roles] SCE_DATA_ENVIRONMENT must be STAGE (got ${identity.dataEnvironment}).`,
    );
  }
  if (identity.databaseFingerprint !== STAGE_FINGERPRINT) {
    throw new Error(
      `[sync-fca-dokumentation-uat-pilot-roles] database fingerprint mismatch: expected ${STAGE_FINGERPRINT}, got ${identity.databaseFingerprint ?? "null"}.`,
    );
  }
  assertOperationalMutationAllowed({
    operationId: "sync-fca-dokumentation-uat-pilot-roles",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DOC_KEYS = new Set<string>(TENANT_DOCUMENTATION_UAT_PERMISSION_KEYS);

type DocEffective = {
  view: boolean;
  edit: boolean;
  publish: boolean;
  manage: boolean;
};

function docEffectiveFromTenantKeys(keys: readonly string[]): DocEffective {
  const set = new Set(keys);
  return {
    view: set.has(PERMISSIONS.TENANT_DOCUMENTATION_VIEW),
    edit: set.has(PERMISSIONS.TENANT_DOCUMENTATION_EDIT),
    publish: set.has(PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH),
    manage: set.has(PERMISSIONS.TENANT_DOCUMENTATION_MANAGE),
  };
}

function expectedDocEffective(
  def: FcaDokumentationUatPilotRoleDefinition,
): DocEffective {
  return docEffectiveFromTenantKeys(def.permissionKeys);
}

function assertNoUnexpectedDocAccess(
  email: string,
  current: DocEffective,
  expectedAfterNewRole: DocEffective,
): string | null {
  if (current.manage) {
    return `${email}: already has tenant_documentation.manage (forbidden for UAT)`;
  }
  if (
    expectedAfterNewRole.edit &&
    !expectedAfterNewRole.publish &&
    current.publish
  ) {
    return `${email}: already has tenant_documentation.publish (editor UAT must not publish)`;
  }
  if (
    expectedAfterNewRole.view &&
    !expectedAfterNewRole.edit &&
    (current.edit || current.publish)
  ) {
    return `${email}: already has edit/publish (reader UAT must be view-only)`;
  }
  return null;
}

async function loadUser(email: string, tenantId: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!user) return { error: "user_not_found" as const };
  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, userId: user.id, isActive: true },
    select: { id: true },
  });
  if (!membership) return { error: "inactive_membership" as const };
  return { user, membership };
}

async function auditDocPermissions(userId: string, tenantId: string) {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  return {
    keys: tenant.filter((k) => k.startsWith("tenant_documentation.")),
    effective: docEffectiveFromTenantKeys(tenant),
  };
}

async function ensureRolePermissions(
  tenantId: string,
  def: FcaDokumentationUatPilotRoleDefinition,
  apply: boolean,
): Promise<{ roleId: string; created: boolean; repaired: boolean }> {
  let role = await prisma.role.findFirst({
    where: { tenantId, key: def.roleKey, isArchived: false },
    select: {
      id: true,
      key: true,
      name: true,
      scope: true,
      rolePermissions: { select: { permission: { select: { key: true } } } },
    },
  });

  const targetSet = new Set(def.permissionKeys);
  let created = false;
  let repaired = false;

  if (role) {
    const currentKeys = role.rolePermissions.map((rp) => rp.permission.key);
    const docOnRole = currentKeys.filter((k) => DOC_KEYS.has(k));
    const unexpectedDoc = docOnRole.filter(
      (k) => !targetSet.has(k as (typeof def.permissionKeys)[number]),
    );
    const missingDoc = def.permissionKeys.filter((k) => !currentKeys.includes(k));
  const nonDocExtras = currentKeys.filter((k) => !DOC_KEYS.has(k));

    if (unexpectedDoc.length > 0) {
      throw new Error(
        `Role ${def.roleKey} has unexpected tenant_documentation keys: ${unexpectedDoc.join(", ")} — manual review required.`,
      );
    }
    if (nonDocExtras.length > 0) {
      throw new Error(
        `Role ${def.roleKey} is not documentation-only (has ${nonDocExtras.join(", ")}) — manual review required.`,
      );
    }
    if (missingDoc.length > 0 && DRY_RUN) {
      console.log(`Would add permissions to ${def.roleKey}: ${missingDoc.join(", ")}`);
    }
    if (apply && missingDoc.length > 0) {
      for (const permissionKey of missingDoc) {
        const permission = await prisma.permission.findUnique({
          where: { key: permissionKey },
          select: { id: true },
        });
        if (!permission) throw new Error(`Catalog missing ${permissionKey}`);
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permission.id },
          },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
      repaired = true;
    }
    if (role.scope !== "TENANT" && apply) {
      await prisma.role.update({
        where: { id: role.id },
        data: { scope: "TENANT", tenantId },
      });
      repaired = true;
    }
    return { roleId: role.id, created, repaired };
  }

  if (DRY_RUN) {
    console.log(
      `Would create role ${def.roleKey} with permissions: ${def.permissionKeys.join(", ")}`,
    );
    return { roleId: "(dry-run)", created: true, repaired: false };
  }

  if (!apply) throw new Error("apply=false in ensureRolePermissions");

  const createdRole = await prisma.role.create({
    data: {
      tenantId,
      scope: "TENANT",
      key: def.roleKey,
      name: def.name,
      description: def.description,
    },
    select: { id: true, key: true, name: true, scope: true },
  });
  created = true;

  for (const permissionKey of def.permissionKeys) {
    const permission = await prisma.permission.findUnique({
      where: { key: permissionKey },
      select: { id: true },
    });
    if (!permission) throw new Error(`Catalog missing ${permissionKey}`);
    await prisma.rolePermission.create({
      data: { roleId: createdRole.id, permissionId: permission.id },
    });
  }

  return { roleId: createdRole.id, created, repaired: false };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { key: PILOT_TENANT_KEY },
    select: { id: true, key: true, name: true },
  });
  if (!tenant) {
    console.error("Tenant fc-allschwil not found.");
    process.exit(1);
  }

  const mode = REVOKE ? "REVOKE" : DRY_RUN ? "DRY_RUN" : "APPLY";
  console.log(`Mode: ${mode}`);
  console.log(`Tenant: ${tenant.key} (${tenant.id})`);

  const preflight: object[] = [];

  for (const def of FCA_DOKUMENTATION_UAT_PILOT_ROLES) {
    for (const email of def.assigneeEmails) {
      const loaded = await loadUser(email, tenant.id);
      if ("error" in loaded) {
        throw new Error(`${email}: ${loaded.error}`);
      }
      const audit = await auditDocPermissions(loaded.user.id, tenant.id);
      const expected = expectedDocEffective(def);
      const conflict = assertNoUnexpectedDocAccess(email, audit.effective, expected);
      if (conflict) throw new Error(conflict);

      const existingAssignments = await prisma.userRole.findMany({
        where: {
          userId: loaded.user.id,
          tenantId: tenant.id,
          role: { key: def.roleKey },
        },
        select: { id: true, role: { select: { key: true, name: true } } },
      });

      preflight.push({
        email,
        uatRole: def.roleKey,
        membership: "active",
        docPermissionsBefore: audit,
        expectedFromUatRole: expected,
        alreadyAssignedUatRole: existingAssignments.length > 0,
      });
    }
  }

  console.log(JSON.stringify({ preflight }, null, 2));

  if (REVOKE) {
    if (DRY_RUN) {
      console.log("\nDRY RUN — revoke with APPLY_FCA_DOKUMENTATION_UAT_PILOT_REVOKE=true\n");
      return;
    }
    let removed = 0;
    for (const def of FCA_DOKUMENTATION_UAT_PILOT_ROLES) {
      const role = await prisma.role.findFirst({
        where: { tenantId: tenant.id, key: def.roleKey },
        select: { id: true },
      });
      if (!role) continue;
      for (const email of def.assigneeEmails) {
        const loaded = await loadUser(email, tenant.id);
        if ("error" in loaded) continue;
        const deleted = await prisma.userRole.deleteMany({
          where: { userId: loaded.user.id, roleId: role.id, tenantId: tenant.id },
        });
        removed += deleted.count;
      }
    }
    console.log(JSON.stringify({ revokedUserRoleRows: removed }, null, 2));
    return;
  }

  const planned: Array<{
    kind: "role_create" | "role_permission" | "user_role_assign";
    detail: string;
  }> = [];

  for (const def of FCA_DOKUMENTATION_UAT_PILOT_ROLES) {
    const outcome = await ensureRolePermissions(tenant.id, def, APPLY);
    if (outcome.created) planned.push({ kind: "role_create", detail: def.roleKey });
    if (outcome.repaired) planned.push({ kind: "role_permission", detail: def.roleKey });

    if (DRY_RUN) continue;

    for (const email of def.assigneeEmails) {
      const loaded = await loadUser(email, tenant.id);
      if ("error" in loaded) throw new Error(`${email}: ${loaded.error}`);

      const existing = await prisma.userRole.findFirst({
        where: {
          userId: loaded.user.id,
          roleId: outcome.roleId,
          tenantId: tenant.id,
        },
      });
      if (!existing) {
        await prisma.userRole.create({
          data: {
            userId: loaded.user.id,
            roleId: outcome.roleId,
            tenantId: tenant.id,
          },
        });
        planned.push({
          kind: "user_role_assign",
          detail: `${email} → ${def.roleKey}`,
        });
      }
    }
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN — apply with APPLY_FCA_DOKUMENTATION_UAT_PILOT_ROLE_SYNC=true\n");
    return;
  }

  const postVerify: object[] = [];
  for (const def of FCA_DOKUMENTATION_UAT_PILOT_ROLES) {
    for (const email of def.assigneeEmails) {
      const loaded = await loadUser(email, tenant.id);
      if ("error" in loaded) continue;
      const audit = await auditDocPermissions(loaded.user.id, tenant.id);
      postVerify.push({
        email,
        uatRole: def.roleKey,
        tenantDocumentation: audit.effective,
      });
    }
  }

  console.log(JSON.stringify({ applied: planned, postVerify }, null, 2));
}

main()
  .catch((err) => {
    console.error("[sync-fca-dokumentation-uat-pilot-roles] FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
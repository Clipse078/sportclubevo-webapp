/**
 * DATA-HYGIENE-02 — Controlled FCA identity and role consolidation (STAGE).
 *
 * Scope (authorized):
 *   - Retire duplicate User m.s.duijster@gmail.com (no hard delete)
 *   - Consolidate duplicate Club Admin roles via RPERM-05-C1 merge
 *   - Preserve it@fcallschwil.ch, admin@fcallschwil.ch, registrations, history
 *
 * Modes:
 *   --preflight     Read-only identity + count checks
 *   --export        Write recovery JSON under --export-dir (default .tmp/data-hygiene-02-export)
 *   --dry-run       Plan + assert row counts; zero writes
 *   --execute       Transactional mutations; requires --confirm DATA-HYGIENE-02-FCA
 *
 * Remote execution requires:
 *   APP_ENV=stage
 *   SCE_OPERATION_AUTHORIZATION=data-hygiene-02-fca-identity-role-consolidation:stage
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";
import { getTenantClubAdminRoleKey } from "@/lib/roles/tenant-role-keys";
import {
  createPrismaClient,
  inspect,
  buildPlan,
  runConsolidation,
} from "./rperm-05c1-consolidate-club-admin-roles";

export const TENANT_KEY = "fc-allschwil";
export const TENANT_ID = "cmomwboak0000tsf3zzivrs46";
export const EXPECTED_FINGERPRINT = "acd3b37682911890";

export const CANONICAL_CLUB_ADMIN_EMAIL = "it@fcallschwil.ch";
export const LEGACY_ADMIN_EMAIL = "admin@fcallschwil.ch";
export const DUPLICATE_USER_EMAIL = "m.s.duijster@gmail.com";

/** Allowlisted User ids (verified DATA-HYGIENE-01) */
export const CANONICAL_USER_ID = "cmsfzrets001bzsf3m46svf5q";
export const DUPLICATE_USER_ID = "cmtmwtia3000204lbo4xhobp3";
export const LEGACY_ADMIN_USER_ID = "cmq82whpt0000vajsqaaqo4ns";

export const DUPLICATE_USER_ROLE_ID = "cmtmwtjg3000504lbdxyk4a3a";
export const CANONICAL_CLUB_ADMIN_ROLE_ID = "cmsoc0us400005sjsco8c7sfc";
export const LEGACY_CLUB_ADMIN_ROLE_ID = "cmt1pxy8a0001hnjs0k3ouesk";

export const EXECUTE_CONFIRMATION = "DATA-HYGIENE-02-FCA";
export const OPERATION_ID = "data-hygiene-02-fca-identity-role-consolidation";

const INSPECTED_SHA = "4a0f17046596bb34756117f84ace29fdd09d78cc";

type CliOptions = {
  preflight: boolean;
  export: boolean;
  dryRun: boolean;
  execute: boolean;
  confirm: string | undefined;
  exportDir: string;
};

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const has = (flag: string) => args.includes(flag);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  return {
    preflight: has("--preflight"),
    export: has("--export"),
    dryRun: has("--dry-run"),
    execute: has("--execute"),
    confirm: get("--confirm"),
    exportDir: get("--export-dir") ?? path.join(process.cwd(), ".tmp/data-hygiene-02-export"),
  };
}

async function assertPreflight(prisma: PrismaClient): Promise<void> {
  const identity = resolveRuntimeIdentity(process.env);
  if (identity.databaseFingerprint !== EXPECTED_FINGERPRINT) {
    throw new Error(
      `Database fingerprint mismatch: got ${identity.databaseFingerprint}, expected ${EXPECTED_FINGERPRINT}`,
    );
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant || tenant.key !== TENANT_KEY) {
    throw new Error(`Tenant mismatch for id ${TENANT_ID}`);
  }

  const canonicalUser = await prisma.user.findUnique({
    where: { id: CANONICAL_USER_ID },
    select: {
      email: true,
      isActive: true,
      person: { select: { id: true, tenantId: true } },
    },
  });
  if (
    canonicalUser?.email !== CANONICAL_CLUB_ADMIN_EMAIL ||
    !canonicalUser.person ||
    canonicalUser.person.tenantId !== TENANT_ID
  ) {
    throw new Error("Canonical Michael user/person link preflight failed");
  }

  const duplicate = await prisma.user.findUnique({
    where: { id: DUPLICATE_USER_ID },
    select: { email: true, isActive: true },
  });
  if (duplicate?.email !== DUPLICATE_USER_EMAIL) {
    throw new Error("Duplicate user email/id binding preflight failed");
  }
}

async function loadExportBundle(prisma: PrismaClient) {
  const duplicateUser = await prisma.user.findUnique({
    where: { id: DUPLICATE_USER_ID },
    include: {
      tenantMemberships: { where: { tenantId: TENANT_ID } },
      userRoles: { where: { tenantId: TENANT_ID } },
      person: true,
    },
  });
  const legacyRole = await prisma.role.findUnique({
    where: { id: LEGACY_CLUB_ADMIN_ROLE_ID },
    include: {
      rolePermissions: { include: { permission: { select: { id: true, key: true } } } },
      userRoles: true,
    },
  });
  const canonicalRole = await prisma.role.findUnique({
    where: { id: CANONICAL_CLUB_ADMIN_ROLE_ID },
    include: {
      rolePermissions: { include: { permission: { select: { id: true, key: true } } } },
      userRoles: true,
    },
  });
  const legacyAdminRoles = await prisma.userRole.findMany({
    where: { userId: LEGACY_ADMIN_USER_ID, tenantId: TENANT_ID },
  });

  return {
    meta: {
      package: "DATA-HYGIENE-02",
      exportedAt: new Date().toISOString(),
      inspectedSha: INSPECTED_SHA,
      tenantId: TENANT_ID,
      tenantKey: TENANT_KEY,
      databaseFingerprint: EXPECTED_FINGERPRINT,
    },
    duplicateUser,
    legacyClubAdminRole: legacyRole,
    canonicalClubAdminRole: canonicalRole,
    legacyAdminUserRolesOnTenant: legacyAdminRoles,
  };
}

function writeExport(exportDir: string, bundle: unknown): string {
  fs.mkdirSync(exportDir, { recursive: true, mode: 0o700 });
  const file = path.join(exportDir, `data-hygiene-02-pre-mutation-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2), { mode: 0o600 });
  return file;
}

export type DuplicateRetirementPlan = {
  removeUserRoleIds: string[];
  setUserInactive: boolean;
  expectedUserRoleDeletes: number;
  expectedUserUpdates: number;
};

export function buildDuplicateRetirementPlan(
  duplicateUserRoleIds: string[],
  duplicateUserIsActive: boolean,
): DuplicateRetirementPlan {
  return {
    removeUserRoleIds: duplicateUserRoleIds,
    setUserInactive: duplicateUserIsActive,
    expectedUserRoleDeletes: duplicateUserRoleIds.length,
    expectedUserUpdates: duplicateUserIsActive ? 1 : 0,
  };
}

async function retireDuplicateIdentity(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<{ plan: DuplicateRetirementPlan; applied: boolean }> {
  const duplicate = await prisma.user.findUnique({
    where: { id: DUPLICATE_USER_ID },
    include: { userRoles: { where: { tenantId: TENANT_ID } } },
  });
  if (!duplicate) throw new Error("Duplicate user missing");

  const roleIds = duplicate.userRoles.map((ur) => ur.id);
  if (roleIds.length !== 1 || roleIds[0] !== DUPLICATE_USER_ROLE_ID) {
    throw new Error(
      `Unexpected duplicate UserRole set: ${roleIds.join(", ")} (expected only ${DUPLICATE_USER_ROLE_ID})`,
    );
  }

  const plan = buildDuplicateRetirementPlan(roleIds, duplicate.isActive);

  if (dryRun) {
    return { plan, applied: false };
  }

  await prisma.$transaction(async (tx) => {
    const del = await tx.userRole.deleteMany({
      where: { id: { in: plan.removeUserRoleIds }, userId: DUPLICATE_USER_ID, tenantId: TENANT_ID },
    });
    if (del.count !== plan.expectedUserRoleDeletes) {
      throw new Error(`UserRole delete count ${del.count} !== ${plan.expectedUserRoleDeletes}`);
    }

    if (plan.setUserInactive) {
      const crossTenantActive = await tx.tenantMembership.count({
        where: { userId: DUPLICATE_USER_ID, tenantId: { not: TENANT_ID }, isActive: true },
      });
      const crossTenantRoles = await tx.userRole.count({
        where: { userId: DUPLICATE_USER_ID, tenantId: { not: TENANT_ID } },
      });
      if (crossTenantActive > 0 || crossTenantRoles > 0) {
        throw new Error("Refusing global user deactivation — cross-tenant access detected");
      }

      const updated = await tx.user.updateMany({
        where: { id: DUPLICATE_USER_ID, isActive: true },
        data: { isActive: false },
      });
      if (updated.count !== plan.expectedUserUpdates) {
        throw new Error(`User isActive update count ${updated.count} !== ${plan.expectedUserUpdates}`);
      }
    }

    const remainingRoles = await tx.userRole.count({
      where: { userId: DUPLICATE_USER_ID, tenantId: TENANT_ID },
    });
    if (remainingRoles !== 0) {
      throw new Error(`Duplicate user still has ${remainingRoles} tenant UserRole row(s)`);
    }
  });

  return { plan, applied: true };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  if (!opts.preflight && !opts.export && !opts.dryRun && !opts.execute) {
    console.error("Specify --preflight, --export, --dry-run, or --execute");
    process.exit(1);
  }

  if (opts.execute && opts.confirm !== EXECUTE_CONFIRMATION) {
    console.error(`--execute requires --confirm ${EXECUTE_CONFIRMATION}`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  if (opts.execute) {
    assertOperationalMutationAllowed({
      operationId: OPERATION_ID,
      databaseUrl: connectionString,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    });
  }

  const { prisma, pool } = createPrismaClient(connectionString);

  try {
    await assertPreflight(prisma);

    if (opts.preflight) {
      const regs = await prisma.registration.count({ where: { tenantId: TENANT_ID } });
      const eventsFca = await prisma.event.count({ where: { tenantId: TENANT_ID } });
      const eventsAll = await prisma.event.count();
      console.log(
        JSON.stringify(
          {
            inspectedSha: INSPECTED_SHA,
            fingerprint: EXPECTED_FINGERPRINT,
            tenant: { id: TENANT_ID, key: TENANT_KEY },
            registrations: regs,
            eventsFcaTenantId: eventsFca,
            eventsGlobal: eventsAll,
            eventsNullTenantId: eventsAll - eventsFca,
          },
          null,
          2,
        ),
      );
    }

    const bundle = await loadExportBundle(prisma);

    if (opts.export) {
      const file = writeExport(opts.exportDir, bundle);
      console.log(`Export written: ${file}`);
    }

    const roleInspection = await inspect(prisma, { tenantKey: TENANT_KEY });
    const rolePlan = buildPlan(roleInspection);

    const retirementDry = await retireDuplicateIdentity(prisma, true);

    console.log("\n── DUPLICATE RETIREMENT PLAN ──");
    console.log(JSON.stringify(retirementDry.plan, null, 2));

    console.log("\n── CLUB ADMIN CONSOLIDATION PLAN ──");
    console.log(
      JSON.stringify(
        {
          legacyRoleKeys: rolePlan.legacyRoleKeys,
          userIdsToMove: rolePlan.userIdsToMove,
          permissionKeysToMerge: rolePlan.permissionKeysToMerge,
          conflicts: rolePlan.conflicts,
          noOpReason: rolePlan.noOpReason,
        },
        null,
        2,
      ),
    );

    if (opts.dryRun) {
      if (rolePlan.userIdsToMove.includes(DUPLICATE_USER_ID)) {
        console.log(
          "\n[dry-run] Note: consolidation currently lists duplicate user for move; execute retires duplicate first.",
        );
      }
      console.log("\n[dry-run] No mutations performed.");
      return;
    }

    if (opts.execute) {
      if (rolePlan.userIdsToMove.includes(DUPLICATE_USER_ID)) {
        console.log("[execute] Retiring duplicate before role consolidation …");
      }
      const exportFile = writeExport(opts.exportDir, bundle);
      console.log(`Pre-mutation export: ${exportFile}`);

      const retirement = await retireDuplicateIdentity(prisma, false);
      console.log(`Duplicate retirement applied: ${retirement.applied}`);

      const postRetireInspection = await inspect(prisma, { tenantKey: TENANT_KEY });
      const postPlan = buildPlan(postRetireInspection);
      if (postPlan.userIdsToMove.includes(DUPLICATE_USER_ID)) {
        throw new Error("Post-retirement consolidation still targets duplicate user — aborting");
      }

      const consolidation = await runConsolidation(prisma, {
        tenantKey: TENANT_KEY,
        dryRun: false,
      });
      console.log("\n── CONSOLIDATION RESULT ──");
      console.log(JSON.stringify(consolidation, null, 2));
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  main().catch((err) => {
    console.error("[data-hygiene-02]", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

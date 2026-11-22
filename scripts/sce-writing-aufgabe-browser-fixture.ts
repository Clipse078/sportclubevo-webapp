/**
 * Disposable Postgres fixture for Aufgabe description browser regression.
 * Prints JSON: { tenantId, email, password }
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PermissionModule } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";

const RUN = `sw-aufg-${Date.now()}`;
const TENANT_ID = `tenant-${RUN}`;
const EMAIL = `sw-aufgabe-${RUN}@fixture.local`;
const PASSWORD = process.env.SCE_WRITING_BROWSER_PASSWORD?.trim() || "SceWritingAufgabeE2eFixture";

async function ensurePermissions() {
  for (const key of [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]) {
    await prisma.permission.upsert({
      where: { key },
      create: {
        key,
        name: key,
        module: PermissionModule.TASKS,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: {},
    });
  }
}

async function main() {
  assertSafeTestDatabase();
  await ensurePermissions();

  await prisma.tenant.create({
    data: { id: TENANT_ID, key: `key-${RUN}`, name: "Writing Engine Aufgabe E2E" },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      firstName: "Writing",
      lastName: "Tester",
      passwordHash,
      isActive: true,
    },
  });

  await prisma.tenantMembership.create({
    data: { tenantId: TENANT_ID, userId: user.id, isActive: true },
  });

  const role = await prisma.role.create({
    data: {
      tenantId: TENANT_ID,
      scope: "TENANT",
      key: `role_${RUN}`,
      name: "Aufgabe browser",
    },
  });

  for (const key of [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_MANAGE]) {
    const perm = await prisma.permission.findUnique({ where: { key } });
    if (!perm) throw new Error(`missing ${key}`);
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
  }

  await prisma.userRole.create({
    data: { tenantId: TENANT_ID, userId: user.id, roleId: role.id },
  });

  console.log(
    JSON.stringify({
      tenantId: TENANT_ID,
      email: EMAIL,
      password: PASSWORD,
    }),
  );
}

main().catch((err) => {
  console.error("[sce-writing-aufgabe-browser-fixture] FAILED", err);
  process.exit(1);
});
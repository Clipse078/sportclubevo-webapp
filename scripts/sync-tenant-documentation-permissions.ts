/**
 * Idempotent Tenant Documentation permission sync.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PermissionModule, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";

const DRY_RUN = process.env.APPLY_PERMISSION_SYNC !== "true";

const TENANT_DOC_PERMISSIONS = [
  {
    key: "tenant_documentation.view",
    name: "Dokumentation anzeigen",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: "tenant_documentation.edit",
    name: "Dokumentation bearbeiten",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: "tenant_documentation.publish",
    name: "Dokumentation veröffentlichen",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
  {
    key: "tenant_documentation.manage",
    name: "Dokumentation verwalten",
    module: PermissionModule.TENANT_DOCUMENTATION,
  },
] as const;

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

if (!DRY_RUN) {
  assertOperationalMutationAllowed({
    operationId: "sync-tenant-documentation-permissions",
    databaseUrl: connectionString,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const def of TENANT_DOC_PERMISSIONS) {
    if (DRY_RUN) {
      console.log(`[dry-run] ensure permission ${def.key}`);
      continue;
    }
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        module: def.module,
        scope: "TENANT",
        grantableByAdmin: true,
      },
      update: {
        name: def.name,
        module: def.module,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
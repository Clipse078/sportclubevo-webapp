/**
 * Disposable migration verify for SCE tenant-wide public references (Aufgabe first).
 *
 *   APPLY_DATABASE_MIGRATIONS=false npm run sce-tenant-task-references:disposable-migration-verify
 */

import { PrismaClient } from "@prisma/client";
import { SCE_TENANT_PUBLIC_REFERENCES_MIGRATION } from "@/lib/tenant-public-reference/sce-tenant-public-reference-migration-handoff";

const prisma = new PrismaClient();

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ reg: string | null }>>(
    `SELECT to_regclass('public."${name}"')::text AS reg`,
  );
  return Boolean(rows[0]?.reg);
}

async function main() {
  const migrationApplied = await prisma.$queryRaw<
    Array<{ migration_name: string }>
  >`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${SCE_TENANT_PUBLIC_REFERENCES_MIGRATION}`;

  if (migrationApplied.length === 0) {
    console.error(
      `[sce-tenant-public-ref] migration ${SCE_TENANT_PUBLIC_REFERENCES_MIGRATION} not applied on disposable DB`,
    );
    process.exit(1);
  }

  const checks = {
    tenantShortCodeColumn: await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Tenant' AND column_name = 'publicReferenceShortCode'
      ) AS exists`,
    ),
    tenantPublicNumberColumn: await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Task' AND column_name = 'tenantPublicNumber'
      ) AS exists`,
    ),
    sceTenantPublicNumberSequence: await tableExists("SceTenantPublicNumberSequence"),
    sceTenantPublicNumberLedger: await tableExists("SceTenantPublicNumberLedger"),
  };

  if (
    !checks.tenantShortCodeColumn[0]?.exists ||
    !checks.tenantPublicNumberColumn[0]?.exists ||
    !checks.sceTenantPublicNumberSequence ||
    !checks.sceTenantPublicNumberLedger
  ) {
    console.error("[sce-tenant-public-ref] schema verification failed", checks);
    process.exit(1);
  }

  console.log("sce-tenant-public-references: disposable migration verify OK");
}

main()
  .catch((error) => {
    console.error("[sce-tenant-task-references-disposable-migration-verify] FAILED:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
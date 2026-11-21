/**
 * Disposable migration verify — Tenant Documentation foundation.
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$queryRaw`SELECT 1 FROM "TenantDocumentationSpace" LIMIT 0`;
  await prisma.$queryRaw`SELECT 1 FROM "TenantDocumentationPage" LIMIT 0`;
  await prisma.$queryRaw`SELECT 1 FROM "TenantDocumentationPageDraft" LIMIT 0`;
  await prisma.$queryRaw`SELECT 1 FROM "TenantDocumentationPageVersion" LIMIT 0`;
  await prisma.$queryRaw`SELECT 1 FROM "TenantDocumentationCollaborationPresence" LIMIT 0`;
  console.log("sce-tenant-documentation: disposable migration verify OK");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
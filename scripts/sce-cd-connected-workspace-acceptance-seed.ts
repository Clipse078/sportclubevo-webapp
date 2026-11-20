/**
 * PR #1017 — idempotent Vereinsentwicklung PO fixtures on isolated Acceptance only.
 *
 * Prerequisites: canonical bootstrap + migrate deploy (includes 20261120120000_sce_cd_connected_workspace).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  assertConnectedWorkspaceAcceptanceSeedEnvironment,
  seedConnectedWorkspacePoUatFixtures,
} from "@/lib/acceptance/sce-cd-connected-workspace-po-uat-seed";

async function main(): Promise<void> {
  assertConnectedWorkspaceAcceptanceSeedEnvironment(process.env);
  const databaseUrl = process.env.DATABASE_URL!.trim();
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const report = await seedConnectedWorkspacePoUatFixtures(prisma);
    console.log(JSON.stringify({ status: "seeded", fixture: report }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "[sce-cd-connected-workspace-acceptance-seed] FAILED:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
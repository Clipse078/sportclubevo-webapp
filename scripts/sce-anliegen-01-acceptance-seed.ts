/**
 * SCE-ANLIEGEN-01 — idempotent Meldungen PO fixtures on isolated Acceptance only.
 *
 * Prerequisites: canonical bootstrap + APPLY permission sync on the same database.
 * Never run against STAGE, Preview, or localhost targets.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { ACCEPTANCE_DATABASE_NAME } from "@/lib/acceptance/bootstrap";
import {
  assertSceAnliegenAcceptanceSeedEnvironment,
  readSceAnliegenAcceptancePasswords,
  seedSceAnliegenAcceptanceFixtures,
} from "@/lib/acceptance/sce-anliegen-01-seed";

async function main(): Promise<void> {
  const { databaseUrl } = assertSceAnliegenAcceptanceSeedEnvironment(process.env);
  const passwords = readSceAnliegenAcceptancePasswords(process.env);
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ database_name: string }>>(
      "SELECT current_database() AS database_name",
    );
    if (rows[0]?.database_name !== ACCEPTANCE_DATABASE_NAME) {
      throw new Error("Connected database is not sce_acceptance.");
    }

    await seedSceAnliegenAcceptanceFixtures(prisma, passwords);
    console.log("[sce-anliegen-01-acceptance-seed] Synthetic Meldungen fixtures ready.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "[sce-anliegen-01-acceptance-seed] FAILED:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
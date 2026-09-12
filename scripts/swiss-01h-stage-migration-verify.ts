/**
 * SWISS-01H — verify STAGE migration for camt.054 idempotency + 01H1 history tables.
 *
 *   APP_ENV=stage npx tsx scripts/swiss-01h-stage-migration-verify.ts
 */

import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { getRuntimeEnvironment } from "@/lib/env";

const MIGRATION_01H = "20260912210000_sce_billing_swiss_01h_camt054_reconciliation";
const MIGRATION_01H1 = "20260912220000_sce_billing_swiss_01h1_reconciliation_history";

async function main(): Promise<void> {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_ENV: process.env.APP_ENV ?? "local",
  });

  if (!runtime.isStage) {
    console.log(
      JSON.stringify({
        stage: false,
        message: "APP_ENV is not stage — reporting local verification only.",
      }),
    );
  }

  const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_01H} OR migration_name = ${MIGRATION_01H1}
  `;

  const applied = new Set(migrations.map((m) => m.migration_name));

  let bankTransactionIdConstraint: string | null = null;
  try {
    const indexes = await prisma.$queryRaw<
      Array<{ indexname: string; indexdef: string }>
    >`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'InvoicePayment'
        AND indexname = 'InvoicePayment_bankTransactionId_key'
    `;
    bankTransactionIdConstraint = indexes[0]?.indexdef ?? null;
  } catch {
    bankTransactionIdConstraint = null;
  }

  console.log(
    JSON.stringify(
      {
        migrations: {
          swiss01h: applied.has(MIGRATION_01H) ? "APPLIED" : "MISSING",
          swiss01h1: applied.has(MIGRATION_01H1) ? "APPLIED" : "MISSING",
        },
        invoicePaymentBankTransactionIdUnique: bankTransactionIdConstraint
          ? "PRESENT"
          : "MISSING",
        bankTransactionIdConstraintDef: bankTransactionIdConstraint,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));

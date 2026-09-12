/**
 * SWISS-01H — STAGE camt.054 reconciliation CLI (dry-run or execute).
 *
 *   APP_ENV=stage SCE_OPERATION_AUTHORIZATION=swiss-01h-camt054:stage \
 *     npx tsx scripts/swiss-01h-stage-camt054-reconcile.ts \
 *     --legal-entity-key <key> --xml-file path/to.camt054.xml --dry-run
 *
 *   ... --execute --confirm SCE-SWISS-01H-CAMT054
 */

import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";
import { reconcileCamt054Statement } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-service";
import { assertOperationalMutationAllowed } from "@/lib/server/operational-database-guard";
import { getRuntimeEnvironment } from "@/lib/env";

const OPERATION_ID = "swiss-01h-camt054";
const CONFIRM_TOKEN = "SCE-SWISS-01H-CAMT054";
const ACTOR_EMAIL = "hello@tulip-digital.ch";

function parseArgs(argv: string[]): {
  legalEntityKey: string;
  xmlFile: string;
  dryRun: boolean;
  execute: boolean;
  confirm: string | null;
} {
  let legalEntityKey = "";
  let xmlFile = "";
  let dryRun = false;
  let execute = false;
  let confirm: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--legal-entity-key") {
      legalEntityKey = argv[++i] ?? "";
    } else if (arg === "--xml-file") {
      xmlFile = argv[++i] ?? "";
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--execute") {
      execute = true;
    } else if (arg === "--confirm") {
      confirm = argv[++i] ?? null;
    }
  }

  return { legalEntityKey, xmlFile, dryRun, execute, confirm };
}

function assertStageTarget(): void {
  const runtime = getRuntimeEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_ENV: process.env.APP_ENV ?? "local",
  });
  if (!runtime.isStage) {
    throw new Error(`STAGE verification failed: APP_ENV must be "stage".`);
  }
  assertOperationalMutationAllowed({
    operationId: OPERATION_ID,
    databaseUrl: process.env.DATABASE_URL,
    explicitIntent: true,
    allowedRemoteEnvironments: ["stage"],
  });
}

async function resolveActorUserId(): Promise<string> {
  const { prisma } = await import("@/lib/db/prisma");
  const user = await prisma.user.findFirst({
    where: { email: ACTOR_EMAIL },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`Actor user ${ACTOR_EMAIL} not found on STAGE.`);
  }
  return user.id;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.legalEntityKey || !args.xmlFile) {
    throw new Error("--legal-entity-key and --xml-file are required.");
  }
  if (args.dryRun === args.execute) {
    throw new Error("Specify exactly one of --dry-run or --execute.");
  }
  if (args.execute && args.confirm !== CONFIRM_TOKEN) {
    throw new Error(`Execute requires --confirm ${CONFIRM_TOKEN}`);
  }

  if (args.execute) {
    assertStageTarget();
  }

  const xml = readFileSync(path.resolve(args.xmlFile), "utf8");
  const actorUserId = await resolveActorUserId();
  const report = await reconcileCamt054Statement({
    legalEntityKey: args.legalEntityKey,
    xml,
    dryRun: args.dryRun,
    actorUserId,
  });

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

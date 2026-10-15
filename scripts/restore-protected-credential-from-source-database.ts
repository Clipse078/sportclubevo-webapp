/**
 * Operator-only: copy passwordHash (+ passwordChangedAt) for a protected
 * persistent account from a known-good SOURCE database (e.g. Neon PITR branch
 * captured before an accidental overwrite) into the TARGET database (STAGE).
 *
 * NEVER prints passwords, password hashes, or connection strings.
 *
 * Required:
 *   SOURCE_DATABASE_URL — read-only source (PITR branch before regression)
 *   DATABASE_URL        — target STAGE database (same email row)
 *   TARGET_EMAIL        — defaults to it@fcallschwil.ch
 *   RESTORE_PROTECTED_CREDENTIAL_CONFIRM=RESTORE_FROM_SOURCE_DATABASE
 *   SCE_OPERATION_AUTHORIZATION=restore-protected-credential:stage
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  getDatabaseFingerprintFromUrl,
  resolveDeploymentIdentity,
} from "@/lib/server/deployment-identity";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const CONFIRM = "RESTORE_FROM_SOURCE_DATABASE";
const OPERATION = "restore-protected-credential:stage";

async function main(): Promise<void> {
  const targetUrl = process.env.DATABASE_URL?.trim();
  const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();
  const email = (process.env.TARGET_EMAIL ?? "it@fcallschwil.ch").trim().toLowerCase();
  const confirmed = process.env.RESTORE_PROTECTED_CREDENTIAL_CONFIRM === CONFIRM;
  const authorized = process.env.SCE_OPERATION_AUTHORIZATION === OPERATION;

  if (!targetUrl || !sourceUrl || !confirmed || !authorized) {
    throw new Error(
      "Missing required authorization or DATABASE_URL/SOURCE_DATABASE_URL. No changes were made.",
    );
  }

  const targetIdentity = resolveDeploymentIdentity({
    ...process.env,
    DATABASE_URL: targetUrl,
  });
  const targetFp = getDatabaseFingerprintFromUrl(targetUrl);
  if (targetFp?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      "TARGET DATABASE_URL fingerprint is not the canonical STAGE database. Refused.",
    );
  }

  const sourcePool = new Pool({ connectionString: sourceUrl });
  const targetPool = new Pool({ connectionString: targetUrl });
  const sourcePrisma = new PrismaClient({ adapter: new PrismaPg(sourcePool) });
  const targetPrisma = new PrismaClient({ adapter: new PrismaPg(targetPool) });

  try {
    const sourceUser = await sourcePrisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, passwordChangedAt: true, isActive: true },
    });
    const targetUser = await targetPrisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, passwordChangedAt: true, isActive: true },
    });

    if (!sourceUser?.passwordHash || !targetUser) {
      throw new Error("Source or target user missing — no changes were made.");
    }

    if (sourceUser.passwordHash === targetUser.passwordHash) {
      console.log(
        JSON.stringify({
          status: "NOOP",
          email,
          targetFingerprint: targetFp,
          targetDatabaseHost: targetIdentity.databaseHost,
          message: "Target hash already matches source; nothing to restore.",
        }),
      );
      return;
    }

    await targetPrisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash: sourceUser.passwordHash,
        passwordChangedAt: sourceUser.passwordChangedAt,
      },
    });

    console.log(
      JSON.stringify({
        status: "RESTORED",
        email,
        targetFingerprint: targetFp,
        targetDatabaseHost: targetIdentity.databaseHost,
        passwordChangedAtRestored: Boolean(sourceUser.passwordChangedAt),
      }),
    );
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch((error) => {
  console.error(
    "[restore-protected-credential] Refused:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exit(1);
});

/**
 * Operator-only: restore the PO-supplied EXISTING password for a protected
 * persistent account on canonical STAGE.
 *
 * NEVER prints passwords, password hashes, or connection strings.
 *
 * Required:
 *   DATABASE_URL — canonical STAGE target (fingerprint verified)
 *   TARGET_EMAIL — defaults to it@fcallschwil.ch
 *   EMERGENCY_RESTORE_CONFIRM=RESTORE_PO_SUPPLIED_EXISTING_PASSWORD
 *   SCE_OPERATION_AUTHORIZATION=emergency-restore-po-supplied-credential:stage
 *   EMERGENCY_RESTORE_OPERATOR_ID=<ticketed operator identity>
 *
 * Password input (one of):
 *   EMERGENCY_RESTORE_PASSWORD_FILE — path to a file containing the password
 *   EMERGENCY_RESTORE_PASSWORD — runtime-only env (never commit)
 *   Hidden prompt on /dev/tty when attached to an interactive terminal
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { authorizeCredentialsUser } from "@/lib/auth/credentials-authorize";
import { applyAuthorizedCredentialUpdate } from "@/lib/auth/authorized-credential-update";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { readOperatorPasswordFromRuntime } from "@/lib/auth/read-operator-secret";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  getDatabaseFingerprintFromUrl,
  resolveDeploymentIdentity,
} from "@/lib/server/deployment-identity";

const CONFIRM = "RESTORE_PO_SUPPLIED_EXISTING_PASSWORD";
const OPERATION = "emergency-restore-po-supplied-credential:stage";
const DEFAULT_EMAIL = "it@fcallschwil.ch";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const email = (process.env.TARGET_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const confirmed = process.env.EMERGENCY_RESTORE_CONFIRM === CONFIRM;
  const authorized = process.env.SCE_OPERATION_AUTHORIZATION === OPERATION;
  const operatorId = process.env.EMERGENCY_RESTORE_OPERATOR_ID?.trim() ?? "";

  if (!databaseUrl || !confirmed || !authorized || !/^[a-zA-Z0-9@._:-]{3,160}$/.test(operatorId)) {
    throw new Error(
      "Missing required authorization, DATABASE_URL, or operator id. No changes were made.",
    );
  }

  const fingerprint = getDatabaseFingerprintFromUrl(databaseUrl);
  if (fingerprint?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      "DATABASE_URL fingerprint is not the canonical STAGE database. Refused.",
    );
  }

  const identity = resolveDeploymentIdentity(process.env);
  const users = await prisma.user.findMany({
    where: { email },
    select: {
      id: true,
      email: true,
      isActive: true,
      passwordHash: true,
      passwordChangedAt: true,
      updatedAt: true,
    },
  });

  if (users.length !== 1) {
    throw new Error(
      `Expected exactly one user for ${email}; found ${users.length}. No changes were made.`,
    );
  }

  const user = users[0];
  if (!user.isActive) {
    throw new Error("Target account is not active. No changes were made.");
  }

  const beforePasswordChangedAt = user.passwordChangedAt?.toISOString() ?? null;
  const operatorPassword = await readOperatorPasswordFromRuntime();

  const passwordHash = await hashPassword(operatorPassword);
  const changedAt = await prisma.$transaction(async (tx) =>
    applyAuthorizedCredentialUpdate(tx, {
      userId: user.id,
      email: user.email,
      passwordHash,
      intent: "EMERGENCY_RECOVERY",
      operatorId,
      auditAction: "EMERGENCY_PO_SUPPLIED_CREDENTIAL_RESTORE",
    }),
  );

  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, passwordChangedAt: true },
  });

  if (!stored?.passwordHash) {
    throw new Error("Credential write failed — hash missing after update.");
  }

  const passwordVerification = await verifyPassword(
    operatorPassword,
    stored.passwordHash,
  );

  const authorizeResult = await authorizeCredentialsUser(prisma, {
    email,
    password: operatorPassword,
  });

  console.log(
    JSON.stringify(
      {
        status: passwordVerification && authorizeResult.ok ? "RESTORED" : "FAILED",
        email,
        targetFingerprint: fingerprint,
        targetDatabaseHost: identity.databaseHost,
        userId: user.id,
        passwordVerification: passwordVerification ? "PASS" : "FAIL",
        credentialAuthorize: authorizeResult.ok ? "PASS" : "FAIL",
        ...(authorizeResult.ok
          ? {}
          : { authorizeFailureCategory: authorizeResult.category }),
        passwordChangedAtBefore: beforePasswordChangedAt,
        passwordChangedAtAfter: stored.passwordChangedAt?.toISOString() ?? null,
        passwordChangedAtUpdated: Boolean(
          stored.passwordChangedAt &&
            stored.passwordChangedAt.getTime() === changedAt.getTime(),
        ),
      },
      null,
      2,
    ),
  );

  if (!passwordVerification || !authorizeResult.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "[emergency-restore-po-supplied-credential] Refused:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exit(1);
}).finally(() => prisma.$disconnect());

/**
 * Read-only credential contract verification for STAGE (no writes).
 * Password via EMERGENCY_RESTORE_PASSWORD_FILE or EMERGENCY_RESTORE_PASSWORD only.
 */
import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { authorizeCredentialsUser } from "@/lib/auth/credentials-authorize";
import { verifyPassword } from "@/lib/auth/password";
import { readOperatorPasswordFromRuntime } from "@/lib/auth/read-operator-secret";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getDatabaseFingerprintFromUrl } from "@/lib/server/deployment-identity";

const DEFAULT_EMAIL = "it@fcallschwil.ch";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const email = (process.env.TARGET_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const fingerprint = getDatabaseFingerprintFromUrl(databaseUrl);
  if (fingerprint?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error("Refused: not canonical STAGE database fingerprint.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, passwordHash: true },
  });

  const userLookup = Boolean(user);
  const accountActive = user?.isActive ?? false;
  let passwordVerification: "PASS" | "FAIL" | "SKIP" = "SKIP";
  let credentialAuthorize: "PASS" | "FAIL" | "SKIP" = "SKIP";

  try {
    const password = await readOperatorPasswordFromRuntime();
    if (user?.passwordHash) {
      passwordVerification = (await verifyPassword(password, user.passwordHash))
        ? "PASS"
        : "FAIL";
    }
    const auth = await authorizeCredentialsUser(prisma, { email, password });
    credentialAuthorize = auth.ok ? "PASS" : "FAIL";
  } catch {
    passwordVerification = "SKIP";
    credentialAuthorize = "SKIP";
  }

  console.log(
    JSON.stringify(
      {
        USER_LOOKUP: userLookup ? "PASS" : "FAIL",
        PASSWORD_VERIFICATION: passwordVerification,
        ACCOUNT_ACTIVE: accountActive ? "PASS" : "FAIL",
        TENANT_RESOLUTION:
          credentialAuthorize === "PASS" ? "PASS" : credentialAuthorize === "FAIL" ? "FAIL" : "SKIP",
        CREDENTIAL_AUTHORIZE: credentialAuthorize,
      },
      null,
      2,
    ),
  );
}

main().finally(() => prisma.$disconnect());

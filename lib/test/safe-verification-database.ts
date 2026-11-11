/**
 * SCE-DS2-07G — fail-closed guard for isolated verification database mutations.
 *
 * Uses DATABASE_URL_VERIFICATION (never operational STAGE / shared Neon runtime).
 */

import {
  SCE_DS2_07G_VERIFICATION_CONFIRMATION,
  SCE_DS2_07G_VERIFICATION_DATABASE_NAME,
  SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION,
} from "@/lib/design-system/sce-ds2-07g-verification-fixture-constants";
import {
  UnsafeTestDatabaseError,
  assertSafeTestDatabase,
  maskDatabaseUrl,
  parseDatabaseTarget,
} from "@/lib/test/safe-test-database";

export class UnsafeVerificationDatabaseError extends UnsafeTestDatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeVerificationDatabaseError";
  }
}

export function getVerificationDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL_VERIFICATION?.trim();
  return url || null;
}

/**
 * Validates DATABASE_URL_VERIFICATION for local disposable verification Postgres.
 * Also accepts TEST_DATABASE_URL when its database name matches the verification catalog.
 */
export function assertSafeVerificationDatabase(url?: string): string {
  const explicitVerification = url?.trim() || getVerificationDatabaseUrl();
  if (explicitVerification) {
    const safe = assertSafeTestDatabase(explicitVerification);
    const target = parseDatabaseTarget(safe);
    if (target.database !== SCE_DS2_07G_VERIFICATION_DATABASE_NAME) {
      throw new UnsafeVerificationDatabaseError(
        `Refusing verification DB mutation: database name must be ${SCE_DS2_07G_VERIFICATION_DATABASE_NAME}. Target: ${maskDatabaseUrl(safe)}`,
      );
    }
    return safe;
  }

  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  if (testUrl) {
    const safe = assertSafeTestDatabase(testUrl);
    const target = parseDatabaseTarget(safe);
    if (target.database === SCE_DS2_07G_VERIFICATION_DATABASE_NAME) {
      return safe;
    }
  }

  throw new UnsafeVerificationDatabaseError(
    "Refusing verification DB mutation: DATABASE_URL_VERIFICATION must point at a local disposable sce_ds2_07g_verification database.",
  );
}

export function assertVerificationMutationAuthorized(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.SCE_DS2_07G_VERIFICATION_CONFIRM !== SCE_DS2_07G_VERIFICATION_CONFIRMATION) {
    throw new UnsafeVerificationDatabaseError(
      "Refusing verification mutation: SCE_DS2_07G_VERIFICATION_CONFIRM mismatch.",
    );
  }
  if (
    env.SCE_OPERATION_AUTHORIZATION?.trim() !== SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION
  ) {
    throw new UnsafeVerificationDatabaseError(
      "Refusing verification mutation: SCE_OPERATION_AUTHORIZATION mismatch.",
    );
  }
}

export function fingerprintVerificationDatabase(url: string): string {
  const target = parseDatabaseTarget(url);
  return `${target.hostname}/${target.database}`;
}

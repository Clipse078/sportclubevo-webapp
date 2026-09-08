/**
 * Protected persistent authentication boundary.
 *
 * Automated operational paths (seed, bootstrap, migration helpers) must
 * not silently overwrite the passwordHash of a protected persistent account.
 *
 * This guard provides a reusable check that every automated path can call
 * before performing a credential mutation.
 *
 * Protected identities are loaded from the PROTECTED_AUTH_IDENTITIES env var
 * (comma-separated email list) at runtime, with a hard-coded fallback for the
 * known persistent platform account.  The design is generic — not FCA-only.
 *
 * Explicit interactive credential-change/recovery flows are outside the
 * automated boundary. They must authenticate/authorize the actor and write an
 * audit record atomically; this helper deliberately has no environment-variable
 * bypass that an automated deployment could accidentally inherit.
 */

/** The canonical protected persistent platform account. */
const PLATFORM_PROTECTED_IDENTITY = "it@fcallschwil.ch";

/**
 * Returns the full set of email addresses that are protected from automated
 * credential mutation.
 *
 * The set is composed of:
 *   1. The hard-coded platform account (always protected).
 *   2. Any additional identities in PROTECTED_AUTH_IDENTITIES (comma-separated).
 */
export function getProtectedAuthIdentities(
  processEnv: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  const extras = (processEnv.PROTECTED_AUTH_IDENTITIES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set([PLATFORM_PROTECTED_IDENTITY.toLowerCase(), ...extras]);
}

export type ProtectedAuthGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string; email: string };

/**
 * Evaluates whether an automated path is permitted to set or overwrite the
 * passwordHash for the given email address.
 *
 * @param email - The account email to check (case-insensitive).
 * @param options.isCreate - true only after proving that no User row exists.
 */
export function evaluateProtectedAuthGuard(
  email: string,
  options: {
    isCreate: boolean;
  },
  processEnv: NodeJS.ProcessEnv = process.env,
): ProtectedAuthGuardResult {
  const normalizedEmail = email.trim().toLowerCase();
  const protectedIdentities = getProtectedAuthIdentities(processEnv);

  if (!protectedIdentities.has(normalizedEmail)) {
    return { allowed: true };
  }

  // A password hash is required for a genuine initial account creation.
  if (options.isCreate) {
    return { allowed: true };
  }

  // UPDATE path for a protected identity is always blocked in automated contexts.
  return {
    allowed: false,
    email: normalizedEmail,
    reason:
      `Automated passwordHash update for protected identity "${normalizedEmail}" is blocked. ` +
      `Protected accounts cannot have their credentials silently overwritten by a ` +
      `deployment, seed, bootstrap, test, or environment setup path. ` +
      `Use an authenticated, authorized, audited credential-change/recovery path.`,
  };
}

/**
 * Throws if an automated path attempts to silently overwrite the passwordHash
 * for a protected persistent account.
 */
export function assertProtectedAuthAllowed(
  email: string,
  options: {
    isCreate: boolean;
  },
  processEnv: NodeJS.ProcessEnv = process.env,
): void {
  const result = evaluateProtectedAuthGuard(email, options, processEnv);
  if (!result.allowed) {
    throw new Error(
      `[protected-auth-guard] BLOCKED: ${result.reason}`,
    );
  }
}

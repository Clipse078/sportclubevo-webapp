/**
 * Protected persistent authentication boundary.
 *
 * Automated operational paths (seed, bootstrap, migration helpers) must
 * not silently overwrite the passwordHash of a protected persistent account.
 *
 * This guard provides a reusable, environment-aware check that any automated
 * path can call before performing a credential mutation.
 *
 * Protected identities are loaded from the PROTECTED_AUTH_IDENTITIES env var
 * (comma-separated email list) at runtime, with a hard-coded fallback for the
 * known persistent platform account.  The design is generic — not FCA-only.
 *
 * Explicit interactive password-management flows (admin UI password reset,
 * break-glass scripts with explicit ALLOW_PASSWORD_CHANGE=true) are NOT
 * restricted by this guard and must remain functional.
 */

import { getRuntimeEnvironment } from "@/lib/env";

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
 * @param options.isCreate - true if this is an INSERT (new row), false if UPDATE.
 * @param options.explicitOverride - explicit operator opt-in (e.g. ALLOW_PASSWORD_CHANGE=true).
 */
export function evaluateProtectedAuthGuard(
  email: string,
  options: {
    isCreate: boolean;
    explicitOverride?: boolean;
  },
  processEnv: NodeJS.ProcessEnv = process.env,
): ProtectedAuthGuardResult {
  const normalizedEmail = email.trim().toLowerCase();
  const protectedIdentities = getProtectedAuthIdentities(processEnv);

  if (!protectedIdentities.has(normalizedEmail)) {
    return { allowed: true };
  }

  // Always allow an explicit operator override
  if (options.explicitOverride === true) {
    return { allowed: true };
  }

  // Allow the initial CREATE path only in non-persistent environments.
  // A fresh row for a protected identity can only be created locally or in
  // test/acceptance where the schema is disposable.
  if (options.isCreate) {
    const runtime = getRuntimeEnvironment({
      ...processEnv,
      NODE_ENV: processEnv.NODE_ENV ?? "development",
    });

    if (runtime.isLocal || runtime.isTest || runtime.isAcceptance) {
      return { allowed: true };
    }

    return {
      allowed: false,
      email: normalizedEmail,
      reason:
        `Automated create of protected identity "${normalizedEmail}" is not permitted in ` +
        `${runtime.appEnv.toUpperCase()} environment. ` +
        `Use an explicit ALLOW_PASSWORD_CHANGE=true override for intentional provisioning.`,
    };
  }

  // UPDATE path for a protected identity is always blocked in automated contexts.
  return {
    allowed: false,
    email: normalizedEmail,
    reason:
      `Automated passwordHash update for protected identity "${normalizedEmail}" is blocked. ` +
      `Protected accounts cannot have their credentials silently overwritten by a ` +
      `deployment, seed, or bootstrap script. ` +
      `Use an explicit ALLOW_PASSWORD_CHANGE=true override for intentional rotation.`,
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
    explicitOverride?: boolean;
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

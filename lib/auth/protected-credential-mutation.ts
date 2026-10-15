/**
 * Central guard for programmatic User.passwordHash mutations.
 *
 * Intentional interactive flows (self-service change-password, token-based
 * reset, invitation activation) call assertProtectedCredentialMutationAllowed
 * with context "interactive" and skip the automated block.
 */

import {
  assertProtectedAuthAllowed,
  evaluateProtectedAuthGuard,
} from "@/lib/server/protected-auth-guard";

export type CredentialMutationContext = "automated" | "interactive";

export function assertProtectedCredentialMutationAllowed(
  email: string,
  options: {
    isCreate: boolean;
    context: CredentialMutationContext;
  },
  processEnv: NodeJS.ProcessEnv = process.env,
): void {
  if (options.context === "interactive") {
    return;
  }
  assertProtectedAuthAllowed(email, { isCreate: options.isCreate }, processEnv);
}

export function isProtectedCredentialUpdateBlocked(
  email: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): boolean {
  return !evaluateProtectedAuthGuard(email, { isCreate: false }, processEnv).allowed;
}

/**
 * Explicit intent for any server-side mutation of an existing user's password
 * credential. Generic user create/update/upsert flows must not supply passwordHash.
 */

export type PasswordMutationIntent =
  | "USER_CHANGE"
  | "ADMIN_RESET"
  | "EMERGENCY_RECOVERY";

export const AUTHORIZED_PASSWORD_MUTATION_INTENTS: readonly PasswordMutationIntent[] =
  ["USER_CHANGE", "ADMIN_RESET", "EMERGENCY_RECOVERY"];

export function isAuthorizedPasswordMutationIntent(
  value: string,
): value is PasswordMutationIntent {
  return (AUTHORIZED_PASSWORD_MUTATION_INTENTS as readonly string[]).includes(
    value,
  );
}

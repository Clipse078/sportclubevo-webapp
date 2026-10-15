/**
 * Canonical boundary for intentional User password credential writes.
 * Automated seed/bootstrap/upsert paths must not call this module.
 */

import type { Prisma } from "@prisma/client";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import {
  type PasswordMutationIntent,
  isAuthorizedPasswordMutationIntent,
} from "@/lib/auth/password-mutation-intent";
import { assertProtectedCredentialMutationAllowed } from "@/lib/auth/protected-credential-mutation";

export type AuthorizedCredentialUpdateInput = {
  userId: string;
  email: string;
  passwordHash: string;
  intent: PasswordMutationIntent;
  actorUserId?: string | null;
  operatorId?: string;
  auditAction?: string;
};

export function assertAuthorizedCredentialUpdateInput(
  input: AuthorizedCredentialUpdateInput,
): void {
  if (!isAuthorizedPasswordMutationIntent(input.intent)) {
    throw new Error(
      "[authorized-credential-update] Refused: missing or invalid password mutation intent.",
    );
  }

  if (input.intent === "EMERGENCY_RECOVERY") {
    return;
  }

  assertProtectedCredentialMutationAllowed(input.email, {
    isCreate: false,
    context: input.intent === "USER_CHANGE" ? "interactive" : "automated",
    intent: input.intent,
  });
}

export async function applyAuthorizedCredentialUpdate(
  tx: Prisma.TransactionClient,
  input: AuthorizedCredentialUpdateInput,
): Promise<Date> {
  assertAuthorizedCredentialUpdateInput(input);

  const changedAt = new Date();
  await tx.user.update({
    where: { id: input.userId },
    data: {
      passwordHash: input.passwordHash,
      passwordChangedAt: changedAt,
    },
  });

  const action =
    input.auditAction ??
    (input.intent === "EMERGENCY_RECOVERY"
      ? "EMERGENCY_CREDENTIAL_RESTORE"
      : input.intent === "ADMIN_RESET"
        ? "ADMIN_PASSWORD_RESET"
        : "account.password_changed");

  await writeAuditRecord(tx, {
    tenantId: null,
    actorUserId: input.actorUserId ?? null,
    moduleKey: input.intent === "EMERGENCY_RECOVERY" ? "security" : "account",
    entityType: "User",
    entityId: input.userId,
    action,
    metadataJson: {
      intent: input.intent,
      ...(input.operatorId ? { operatorId: input.operatorId } : {}),
      sessionsRevokedAt: changedAt.toISOString(),
    },
  });

  return changedAt;
}

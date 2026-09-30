import type { Prisma, PrismaClient } from "@prisma/client";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { prisma } from "@/lib/db/prisma";

type ActivationClient = Pick<PrismaClient, "tenantMembership">;

/**
 * Activate exactly the TenantMembership for `userId` in `tenantId`.
 * Idempotent when membership is already active.
 */
export async function activateInvitationMembershipWithClient(
  client: ActivationClient,
  userId: string,
  tenantId: string,
): Promise<{ activated: boolean }> {
  const activated = await client.tenantMembership.updateMany({
    where: { userId, tenantId, isActive: false },
    data: { isActive: true },
  });
  return { activated: activated.count > 0 };
}

export async function activateInvitationMembershipInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  tenantId: string,
): Promise<void> {
  const { activated } = await activateInvitationMembershipWithClient(tx, userId, tenantId);
  if (activated) {
    await writeAuditRecord(tx, {
      tenantId,
      actorUserId: userId,
      moduleKey: "users",
      entityType: "TenantMembership",
      entityId: `${tenantId}:${userId}`,
      action: "MEMBERSHIP_ACTIVATED_BY_INVITATION",
      metadataJson: { targetUserId: userId },
    });
  }
}

/** Post-commit audit for callers outside an existing transaction. */
export async function activateInvitationMembership(
  userId: string,
  tenantId: string,
): Promise<void> {
  const { activated } = await activateInvitationMembershipWithClient(prisma, userId, tenantId);
  if (activated) {
    await writeAuditRecord(prisma, {
      tenantId,
      actorUserId: userId,
      moduleKey: "users",
      entityType: "TenantMembership",
      entityId: `${tenantId}:${userId}`,
      action: "MEMBERSHIP_ACTIVATED_BY_INVITATION",
      metadataJson: { targetUserId: userId },
    });
  }
}

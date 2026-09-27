import type { PushDeviceRegistration } from "@prisma/client";
import { PushDeviceRegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type PushDeliveryTarget = {
  registration: Pick<
    PushDeviceRegistration,
    "id" | "userId" | "platform" | "provider" | "subscriptionJson" | "status"
  >;
};

export async function isUserEligibleForTenantPush(
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { isActive: true },
  });
  if (membership?.isActive) return true;

  const person = await prisma.person.findFirst({
    where: { tenantId, userId, isActive: true },
    select: { id: true },
  });
  return Boolean(person);
}

export async function resolveActivePushTargetsForUser(
  userId: string,
): Promise<PushDeliveryTarget[]> {
  const registrations = await prisma.pushDeviceRegistration.findMany({
    where: {
      userId,
      status: PushDeviceRegistrationStatus.ACTIVE,
    },
    select: {
      id: true,
      userId: true,
      platform: true,
      provider: true,
      subscriptionJson: true,
      status: true,
    },
  });
  return registrations.map((registration) => ({ registration }));
}

export async function resolvePushTargetsForTenantRecipient(input: {
  tenantId: string;
  recipientUserId: string;
}): Promise<PushDeliveryTarget[]> {
  const eligible = await isUserEligibleForTenantPush(input.tenantId, input.recipientUserId);
  if (!eligible) return [];
  return resolveActivePushTargetsForUser(input.recipientUserId);
}

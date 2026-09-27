import type { PushDevicePlatform, PushDeviceRegistrationStatus } from "@prisma/client";
import { PushDeviceRegistrationStatus as RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditRecord } from "@/lib/audit/audit-record";
import { PUSH_PROVIDER_WEB_PUSH } from "@/lib/push/constants";

export type PushDeviceRegistrationDto = {
  id: string;
  platform: PushDevicePlatform;
  provider: string;
  status: PushDeviceRegistrationStatus;
  installationId: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterPushDeviceInput = {
  userId: string;
  installationId: string;
  platform: PushDevicePlatform;
  subscriptionJson: string;
};

function toDto(row: {
  id: string;
  platform: PushDevicePlatform;
  provider: string;
  status: PushDeviceRegistrationStatus;
  installationId: string;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PushDeviceRegistrationDto {
  return {
    id: row.id,
    platform: row.platform,
    provider: row.provider,
    status: row.status,
    installationId: row.installationId,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPushDevicesForUser(userId: string): Promise<PushDeviceRegistrationDto[]> {
  const rows = await prisma.pushDeviceRegistration.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      platform: true,
      provider: true,
      status: true,
      installationId: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map(toDto);
}

export async function registerPushDevice(
  input: RegisterPushDeviceInput,
  audit?: { tenantId: string | null; actorUserId: string },
): Promise<PushDeviceRegistrationDto> {
  const installationId = input.installationId.trim();
  if (!installationId) {
    throw new Error("INSTALLATION_ID_REQUIRED");
  }
  const subscriptionJson = input.subscriptionJson.trim();
  if (!subscriptionJson) {
    throw new Error("SUBSCRIPTION_REQUIRED");
  }

  const now = new Date();

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.pushDeviceRegistration.findUnique({
      where: {
        userId_installationId: {
          userId: input.userId,
          installationId,
        },
      },
    });

    const saved = existing
      ? await tx.pushDeviceRegistration.update({
          where: { id: existing.id },
          data: {
            subscriptionJson,
            platform: input.platform,
            provider: PUSH_PROVIDER_WEB_PUSH,
            status: RegistrationStatus.ACTIVE,
            lastSeenAt: now,
          },
        })
      : await tx.pushDeviceRegistration.create({
          data: {
            userId: input.userId,
            installationId,
            platform: input.platform,
            provider: PUSH_PROVIDER_WEB_PUSH,
            subscriptionJson,
            status: RegistrationStatus.ACTIVE,
            lastSeenAt: now,
          },
        });

    if (audit && !existing) {
      await writeAuditRecord(tx, {
        tenantId: audit.tenantId,
        actorUserId: audit.actorUserId,
        moduleKey: "communication.push",
        entityType: "PushDeviceRegistration",
        entityId: saved.id,
        action: "DEVICE_REGISTERED",
        metadataJson: {
          platform: saved.platform,
          installationId: saved.installationId,
        },
      });
    }

    return saved;
  });

  return toDto(row);
}

export async function revokePushDevice(input: {
  userId: string;
  registrationId: string;
  audit?: { tenantId: string | null; actorUserId: string };
}): Promise<boolean> {
  const row = await prisma.pushDeviceRegistration.findFirst({
    where: { id: input.registrationId, userId: input.userId },
  });
  if (!row) return false;
  if (row.status === RegistrationStatus.REVOKED) return true;

  await prisma.$transaction(async (tx) => {
    await tx.pushDeviceRegistration.update({
      where: { id: row.id },
      data: { status: RegistrationStatus.REVOKED },
    });
    if (input.audit) {
      await writeAuditRecord(tx, {
        tenantId: input.audit.tenantId,
        actorUserId: input.audit.actorUserId,
        moduleKey: "communication.push",
        entityType: "PushDeviceRegistration",
        entityId: row.id,
        action: "DEVICE_REVOKED",
        metadataJson: {
          platform: row.platform,
          installationId: row.installationId,
        },
      });
    }
  });

  return true;
}

export async function revokeAllPushDevicesForUser(userId: string): Promise<number> {
  const result = await prisma.pushDeviceRegistration.updateMany({
    where: { userId, status: RegistrationStatus.ACTIVE },
    data: { status: RegistrationStatus.REVOKED },
  });
  return result.count;
}

export async function markPushDeviceInvalid(registrationId: string): Promise<void> {
  await prisma.pushDeviceRegistration.updateMany({
    where: { id: registrationId, status: RegistrationStatus.ACTIVE },
    data: { status: RegistrationStatus.INVALID },
  });
}

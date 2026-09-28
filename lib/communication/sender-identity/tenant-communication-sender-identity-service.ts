import { Prisma, TenantCommunicationSenderIdentityStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { assertTenantId } from "@/lib/communication/errors";
import {
  getSenderDomainAuthorization,
  type SenderDomainAuthorization,
} from "@/lib/email/mailer";
import {
  formatEmailSender,
  validateTenantEmailSenderInput,
  EmailSenderSettingsError,
  MAX_EMAIL_SENDER_ADDRESS_LENGTH,
  MAX_EMAIL_SENDER_DISPLAY_NAME_LENGTH,
} from "@/lib/communication/email-sender-service";

export type SenderIdentityProviderStatus = SenderDomainAuthorization | "NOT_CONFIGURED";

export type TenantCommunicationSenderIdentityDto = {
  id: string;
  tenantId: string;
  displayName: string;
  emailAddress: string;
  status: TenantCommunicationSenderIdentityStatus;
  isDefault: boolean;
  scopeKind: string;
  providerStatus: SenderIdentityProviderStatus;
  createdAt: string;
  updatedAt: string;
};

export class TenantCommunicationSenderIdentityError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "TENANT_NOT_FOUND"
      | "CONFLICT"
      | "LAST_DEFAULT"
      | "IN_USE",
    message: string,
    readonly field?: "displayName" | "emailAddress" | "isDefault",
  ) {
    super(message);
    this.name = "TenantCommunicationSenderIdentityError";
  }
}

async function syncLegacyTenantSenderFields(tenantId: string): Promise<void> {
  const defaultSender = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: {
      tenantId,
      status: TenantCommunicationSenderIdentityStatus.ACTIVE,
      isDefault: true,
    },
    select: { displayName: true, emailAddress: true },
  });

  await prisma.tenant.updateMany({
    where: { id: tenantId },
    data: defaultSender
      ? {
          emailSenderDisplayName: defaultSender.displayName,
          emailSenderAddress: defaultSender.emailAddress,
        }
      : {
          emailSenderDisplayName: null,
          emailSenderAddress: null,
        },
  });
}

async function providerStatusForAddress(
  emailAddress: string,
): Promise<SenderIdentityProviderStatus> {
  return getSenderDomainAuthorization(emailAddress);
}

function toDto(
  row: {
    id: string;
    tenantId: string;
    displayName: string;
    emailAddress: string;
    status: TenantCommunicationSenderIdentityStatus;
    isDefault: boolean;
    scopeKind: string;
    createdAt: Date;
    updatedAt: Date;
  },
  providerStatus: SenderIdentityProviderStatus,
): TenantCommunicationSenderIdentityDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    displayName: row.displayName,
    emailAddress: row.emailAddress,
    status: row.status,
    isDefault: row.isDefault,
    scopeKind: row.scopeKind,
    providerStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTenantCommunicationSenderIdentities(
  inputTenantId: string,
): Promise<TenantCommunicationSenderIdentityDto[]> {
  const tenantId = assertTenantId(inputTenantId);
  const rows = await prisma.tenantCommunicationSenderIdentity.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: "desc" }, { status: "asc" }, { displayName: "asc" }],
  });

  return Promise.all(
    rows.map(async (row) =>
      toDto(
        row,
        row.status === TenantCommunicationSenderIdentityStatus.ACTIVE
          ? await providerStatusForAddress(row.emailAddress)
          : "NOT_CONFIGURED",
      ),
    ),
  );
}

export async function getTenantCommunicationSenderIdentity(input: {
  tenantId: string;
  senderIdentityId: string;
}): Promise<TenantCommunicationSenderIdentityDto | null> {
  const tenantId = assertTenantId(input.tenantId);
  const row = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: { id: input.senderIdentityId.trim(), tenantId },
  });
  if (!row) return null;
  const providerStatus =
    row.status === TenantCommunicationSenderIdentityStatus.ACTIVE
      ? await providerStatusForAddress(row.emailAddress)
      : "NOT_CONFIGURED";
  return toDto(row, providerStatus);
}

export async function createTenantCommunicationSenderIdentity(input: {
  tenantId: string;
  actorUserId: string;
  displayName: unknown;
  emailAddress: unknown;
  setAsDefault?: boolean;
}): Promise<TenantCommunicationSenderIdentityDto> {
  const tenantId = assertTenantId(input.tenantId);
  const values = validateTenantEmailSenderInput(input);

  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) {
    throw new TenantCommunicationSenderIdentityError("TENANT_NOT_FOUND", "Mandant nicht gefunden.");
  }

  const existingCount = await prisma.tenantCommunicationSenderIdentity.count({
    where: { tenantId, status: TenantCommunicationSenderIdentityStatus.ACTIVE },
  });
  const makeDefault = input.setAsDefault === true || existingCount === 0;

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.tenantCommunicationSenderIdentity.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.tenantCommunicationSenderIdentity.create({
        data: {
          tenantId,
          displayName: values.displayName,
          emailAddress: values.emailAddress,
          status: TenantCommunicationSenderIdentityStatus.ACTIVE,
          isDefault: makeDefault,
          scopeKind: "TENANT_WIDE",
        },
      });
    });

    await syncLegacyTenantSenderFields(tenantId);

    await logAction({
      tenantId,
      actorUserId: input.actorUserId || null,
      moduleKey: "communications",
      entityType: "TenantCommunicationSenderIdentity",
      entityId: created.id,
      action: "CREATE",
      metadataJson: { isDefault: makeDefault },
    });

    const providerStatus = await providerStatusForAddress(created.emailAddress);
    return toDto(created, providerStatus);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TenantCommunicationSenderIdentityError(
        "CONFLICT",
        "Diese Absender-E-Mail ist bereits konfiguriert.",
        "emailAddress",
      );
    }
    throw error;
  }
}

export async function updateTenantCommunicationSenderIdentity(input: {
  tenantId: string;
  senderIdentityId: string;
  actorUserId: string;
  displayName?: unknown;
  emailAddress?: unknown;
}): Promise<TenantCommunicationSenderIdentityDto> {
  const tenantId = assertTenantId(input.tenantId);
  const senderIdentityId = input.senderIdentityId.trim();

  const existing = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: { id: senderIdentityId, tenantId },
  });
  if (!existing) {
    throw new TenantCommunicationSenderIdentityError("NOT_FOUND", "Absender nicht gefunden.");
  }
  if (existing.status === TenantCommunicationSenderIdentityStatus.ARCHIVED) {
    throw new TenantCommunicationSenderIdentityError(
      "INVALID_INPUT",
      "Archivierte Absender können nicht bearbeitet werden.",
    );
  }

  const displayName =
    input.displayName !== undefined
      ? validateTenantEmailSenderInput({
          displayName: input.displayName,
          emailAddress: input.emailAddress ?? existing.emailAddress,
        }).displayName
      : existing.displayName;
  const emailAddress =
    input.emailAddress !== undefined
      ? validateTenantEmailSenderInput({
          displayName: input.displayName ?? existing.displayName,
          emailAddress: input.emailAddress,
        }).emailAddress
      : existing.emailAddress;

  try {
    const updated = await prisma.tenantCommunicationSenderIdentity.update({
      where: { id: senderIdentityId },
      data: { displayName, emailAddress },
    });

    if (updated.isDefault) {
      await syncLegacyTenantSenderFields(tenantId);
    }

    await logAction({
      tenantId,
      actorUserId: input.actorUserId || null,
      moduleKey: "communications",
      entityType: "TenantCommunicationSenderIdentity",
      entityId: updated.id,
      action: "UPDATE",
      metadataJson: {
        changedFields: [
          ...(input.displayName !== undefined ? ["displayName"] : []),
          ...(input.emailAddress !== undefined ? ["emailAddress"] : []),
        ],
      },
    });

    const providerStatus = await providerStatusForAddress(updated.emailAddress);
    return toDto(updated, providerStatus);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TenantCommunicationSenderIdentityError(
        "CONFLICT",
        "Diese Absender-E-Mail ist bereits konfiguriert.",
        "emailAddress",
      );
    }
    throw error;
  }
}

export async function setDefaultTenantCommunicationSenderIdentity(input: {
  tenantId: string;
  senderIdentityId: string;
  actorUserId: string;
}): Promise<TenantCommunicationSenderIdentityDto> {
  const tenantId = assertTenantId(input.tenantId);
  const senderIdentityId = input.senderIdentityId.trim();

  const row = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: { id: senderIdentityId, tenantId },
  });
  if (!row) {
    throw new TenantCommunicationSenderIdentityError("NOT_FOUND", "Absender nicht gefunden.");
  }
  if (row.status !== TenantCommunicationSenderIdentityStatus.ACTIVE) {
    throw new TenantCommunicationSenderIdentityError(
      "INVALID_INPUT",
      "Nur aktive Absender können Standard werden.",
      "isDefault",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.tenantCommunicationSenderIdentity.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
    return tx.tenantCommunicationSenderIdentity.update({
      where: { id: senderIdentityId },
      data: { isDefault: true },
    });
  });

  await syncLegacyTenantSenderFields(tenantId);

  await logAction({
    tenantId,
    actorUserId: input.actorUserId || null,
    moduleKey: "communications",
    entityType: "TenantCommunicationSenderIdentity",
    entityId: updated.id,
    action: "UPDATE",
    metadataJson: { setDefault: true },
  });

  const providerStatus = await providerStatusForAddress(updated.emailAddress);
  return toDto(updated, providerStatus);
}

export async function archiveTenantCommunicationSenderIdentity(input: {
  tenantId: string;
  senderIdentityId: string;
  actorUserId: string;
  replacementDefaultSenderIdentityId?: string | null;
}): Promise<TenantCommunicationSenderIdentityDto> {
  const tenantId = assertTenantId(input.tenantId);
  const senderIdentityId = input.senderIdentityId.trim();

  const row = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: { id: senderIdentityId, tenantId },
  });
  if (!row) {
    throw new TenantCommunicationSenderIdentityError("NOT_FOUND", "Absender nicht gefunden.");
  }
  if (row.status === TenantCommunicationSenderIdentityStatus.ARCHIVED) {
    const providerStatus = "NOT_CONFIGURED";
    return toDto(row, providerStatus);
  }

  const activeCount = await prisma.tenantCommunicationSenderIdentity.count({
    where: { tenantId, status: TenantCommunicationSenderIdentityStatus.ACTIVE },
  });
  if (activeCount <= 1 && row.isDefault) {
    throw new TenantCommunicationSenderIdentityError(
      "LAST_DEFAULT",
      "Der letzte aktive Absender kann nicht deaktiviert werden.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (row.isDefault) {
      const replacementId = input.replacementDefaultSenderIdentityId?.trim();
      let replacement = replacementId
        ? await tx.tenantCommunicationSenderIdentity.findFirst({
            where: {
              id: replacementId,
              tenantId,
              status: TenantCommunicationSenderIdentityStatus.ACTIVE,
            },
          })
        : null;

      if (!replacement) {
        replacement = await tx.tenantCommunicationSenderIdentity.findFirst({
          where: {
            tenantId,
            status: TenantCommunicationSenderIdentityStatus.ACTIVE,
            id: { not: senderIdentityId },
          },
          orderBy: { createdAt: "asc" },
        });
      }

      await tx.tenantCommunicationSenderIdentity.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });

      if (replacement) {
        await tx.tenantCommunicationSenderIdentity.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }

    return tx.tenantCommunicationSenderIdentity.update({
      where: { id: senderIdentityId },
      data: {
        status: TenantCommunicationSenderIdentityStatus.ARCHIVED,
        isDefault: false,
      },
    });
  });

  await syncLegacyTenantSenderFields(tenantId);

  await logAction({
    tenantId,
    actorUserId: input.actorUserId || null,
    moduleKey: "communications",
    entityType: "TenantCommunicationSenderIdentity",
    entityId: updated.id,
    action: "ARCHIVE",
  });

  return toDto(updated, "NOT_CONFIGURED");
}

export function isSenderIdentityUsable(input: {
  status: TenantCommunicationSenderIdentityStatus;
  providerStatus: SenderIdentityProviderStatus;
}): boolean {
  return (
    input.status === TenantCommunicationSenderIdentityStatus.ACTIVE &&
    input.providerStatus === "VERIFIED"
  );
}

export async function loadActiveSenderIdentityById(input: {
  tenantId: string;
  senderIdentityId: string;
}): Promise<{
  id: string;
  displayName: string;
  emailAddress: string;
  status: TenantCommunicationSenderIdentityStatus;
  providerStatus: SenderIdentityProviderStatus;
} | null> {
  const row = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: {
      id: input.senderIdentityId.trim(),
      tenantId: assertTenantId(input.tenantId),
    },
  });
  if (!row) return null;
  const providerStatus =
    row.status === TenantCommunicationSenderIdentityStatus.ACTIVE
      ? await providerStatusForAddress(row.emailAddress)
      : "NOT_CONFIGURED";
  return {
    id: row.id,
    displayName: row.displayName,
    emailAddress: row.emailAddress,
    status: row.status,
    providerStatus,
  };
}

export async function loadTenantDefaultSenderIdentity(tenantId: string): Promise<{
  id: string;
  displayName: string;
  emailAddress: string;
  status: TenantCommunicationSenderIdentityStatus;
  providerStatus: SenderIdentityProviderStatus;
} | null> {
  const row = await prisma.tenantCommunicationSenderIdentity.findFirst({
    where: {
      tenantId: assertTenantId(tenantId),
      status: TenantCommunicationSenderIdentityStatus.ACTIVE,
      isDefault: true,
    },
  });
  if (!row) {
    const fallback = await prisma.tenantCommunicationSenderIdentity.findFirst({
      where: {
        tenantId: assertTenantId(tenantId),
        status: TenantCommunicationSenderIdentityStatus.ACTIVE,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!fallback) return null;
    const providerStatus = await providerStatusForAddress(fallback.emailAddress);
    return {
      id: fallback.id,
      displayName: fallback.displayName,
      emailAddress: fallback.emailAddress,
      status: fallback.status,
      providerStatus,
    };
  }
  const providerStatus = await providerStatusForAddress(row.emailAddress);
  return {
    id: row.id,
    displayName: row.displayName,
    emailAddress: row.emailAddress,
    status: row.status,
    providerStatus,
  };
}

export { formatEmailSender, MAX_EMAIL_SENDER_ADDRESS_LENGTH, MAX_EMAIL_SENDER_DISPLAY_NAME_LENGTH };
export { EmailSenderSettingsError };

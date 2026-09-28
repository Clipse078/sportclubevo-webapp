import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import {
  getSenderDomainAuthorization,
  type SenderDomainAuthorization,
} from "@/lib/email/mailer";
import { assertTenantId } from "@/lib/communication/errors";
import {
  createTenantCommunicationSenderIdentity,
  loadTenantDefaultSenderIdentity,
  setDefaultTenantCommunicationSenderIdentity,
  updateTenantCommunicationSenderIdentity,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { resolveEffectiveEmailSender } from "@/lib/communication/sender-identity/sender-identity-resolution-service";

export const MAX_EMAIL_SENDER_DISPLAY_NAME_LENGTH = 120;
export const MAX_EMAIL_SENDER_ADDRESS_LENGTH = 320;

const unsafeHeaderCharacter = /[\p{Cc}\p{Cf}<>"\\]/u;
const senderEmailSchema = z.string().email();

export type EmailSenderProviderStatus =
  | SenderDomainAuthorization
  | "NOT_CONFIGURED";

export type TenantEmailSenderSettings = {
  displayName: string | null;
  emailAddress: string | null;
  providerStatus: EmailSenderProviderStatus;
  activeSource: "TENANT" | "PLATFORM";
  activeFrom: string;
  platformFallbackActive: boolean;
  defaultSenderIdentityId: string | null;
};

export type ResolvedTenantEmailSender = {
  displayName: string;
  emailAddress: string;
  formattedFrom: string;
  source: "TENANT" | "PLATFORM";
  providerStatus: EmailSenderProviderStatus;
  senderIdentityId: string | null;
};

export class EmailSenderSettingsError extends Error {
  constructor(
    readonly code: "INVALID_INPUT" | "TENANT_NOT_FOUND",
    message: string,
    readonly field?: "displayName" | "emailAddress",
  ) {
    super(message);
    this.name = "EmailSenderSettingsError";
  }
}

function parseFormattedFrom(from: string): { displayName: string; emailAddress: string } {
  const match = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    return {
      displayName: match[1]?.trim() || match[2]!.trim(),
      emailAddress: match[2]!.trim().toLowerCase(),
    };
  }
  return { displayName: from, emailAddress: from.toLowerCase() };
}

export function validateTenantEmailSenderInput(input: {
  displayName: unknown;
  emailAddress: unknown;
}): { displayName: string; emailAddress: string } {
  if (typeof input.displayName !== "string") {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Absendername ist erforderlich.",
      "displayName",
    );
  }

  if (unsafeHeaderCharacter.test(input.displayName)) {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Absendername enthält unzulässige Zeichen.",
      "displayName",
    );
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Absendername ist erforderlich.",
      "displayName",
    );
  }
  if (displayName.length > MAX_EMAIL_SENDER_DISPLAY_NAME_LENGTH) {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      `Absendername darf höchstens ${MAX_EMAIL_SENDER_DISPLAY_NAME_LENGTH} Zeichen enthalten.`,
      "displayName",
    );
  }
  if (typeof input.emailAddress !== "string") {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Absender-E-Mail ist erforderlich.",
      "emailAddress",
    );
  }

  if (unsafeHeaderCharacter.test(input.emailAddress)) {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Bitte geben Sie eine gültige Absender-E-Mail ein.",
      "emailAddress",
    );
  }

  const emailAddress = input.emailAddress.trim().toLowerCase();
  if (
    !emailAddress ||
    emailAddress.length > MAX_EMAIL_SENDER_ADDRESS_LENGTH ||
    !senderEmailSchema.safeParse(emailAddress).success
  ) {
    throw new EmailSenderSettingsError(
      "INVALID_INPUT",
      "Bitte geben Sie eine gültige Absender-E-Mail ein.",
      "emailAddress",
    );
  }

  return { displayName, emailAddress };
}

export function formatEmailSender(displayName: string, emailAddress: string): string {
  return `${displayName} <${emailAddress}>`;
}

export async function getTenantEmailSenderSettings(
  inputTenantId: string,
): Promise<TenantEmailSenderSettings> {
  const tenantId = assertTenantId(inputTenantId);
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      emailSenderDisplayName: true,
      emailSenderAddress: true,
    },
  });
  if (!tenant) {
    throw new EmailSenderSettingsError("TENANT_NOT_FOUND", "Mandant nicht gefunden.");
  }

  const defaultIdentity = await loadTenantDefaultSenderIdentity(tenantId);
  const displayName =
    defaultIdentity?.displayName ?? tenant.emailSenderDisplayName?.trim() ?? null;
  const emailAddress =
    defaultIdentity?.emailAddress ?? tenant.emailSenderAddress?.trim().toLowerCase() ?? null;

  const providerStatus: EmailSenderProviderStatus = defaultIdentity
    ? defaultIdentity.providerStatus
    : displayName && emailAddress
      ? await getSenderDomainAuthorization(emailAddress)
      : "NOT_CONFIGURED";

  const effective = await resolveEffectiveEmailSender({ tenantId });
  const tenantUsable = effective.source === "TENANT";

  return {
    displayName,
    emailAddress,
    providerStatus,
    activeSource: effective.source,
    activeFrom: effective.formattedFrom,
    platformFallbackActive: !tenantUsable,
    defaultSenderIdentityId: defaultIdentity?.id ?? null,
  };
}

export async function resolveTenantEmailSender(
  tenantId: string,
  explicitSenderIdentityId?: string | null,
): Promise<ResolvedTenantEmailSender> {
  const effective = await resolveEffectiveEmailSender({
    tenantId,
    explicitSenderIdentityId,
  });
  const active = parseFormattedFrom(effective.formattedFrom);
  return {
    ...active,
    formattedFrom: effective.formattedFrom,
    source: effective.source,
    providerStatus: effective.providerStatus,
    senderIdentityId: effective.identityId,
  };
}

export async function updateTenantEmailSenderSettings(input: {
  tenantId: string;
  actorUserId: string;
  displayName: unknown;
  emailAddress: unknown;
}): Promise<TenantEmailSenderSettings> {
  const tenantId = assertTenantId(input.tenantId);
  const actorUserId = input.actorUserId.trim();
  const values = validateTenantEmailSenderInput(input);

  const existing = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!existing) {
    throw new EmailSenderSettingsError("TENANT_NOT_FOUND", "Mandant nicht gefunden.");
  }

  const defaultIdentity = await loadTenantDefaultSenderIdentity(tenantId);
  if (defaultIdentity) {
    await updateTenantCommunicationSenderIdentity({
      tenantId,
      senderIdentityId: defaultIdentity.id,
      actorUserId,
      displayName: values.displayName,
      emailAddress: values.emailAddress,
    });
  } else {
    await createTenantCommunicationSenderIdentity({
      tenantId,
      actorUserId,
      displayName: values.displayName,
      emailAddress: values.emailAddress,
      setAsDefault: true,
    });
  }

  await logAction({
    tenantId,
    actorUserId: actorUserId || null,
    moduleKey: "communications",
    entityType: "TenantEmailSenderSettings",
    entityId: tenantId,
    action: "UPDATE",
    metadataJson: {
      changedFields: ["emailSenderDisplayName", "emailSenderAddress"],
      via: "legacy-compat-endpoint",
    },
  });

  return getTenantEmailSenderSettings(tenantId);
}

export async function ensureDefaultSenderIdentityUpdated(input: {
  tenantId: string;
  actorUserId: string;
  senderIdentityId: string;
}): Promise<void> {
  await setDefaultTenantCommunicationSenderIdentity(input);
}

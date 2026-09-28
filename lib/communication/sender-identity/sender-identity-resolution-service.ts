/**
 * SCE-COMM-EVO-08 — deterministic outbound sender resolution.
 *
 * explicit selected sender → tenant default (if usable) → platform EMAIL_FROM fallback.
 * An explicit but invalid/unusable sender MUST NOT silently switch to another tenant sender.
 */

import { PlatformCommunicationEmailSenderSource } from "@prisma/client";
import {
  formatEmailSender,
  type EmailSenderProviderStatus,
} from "@/lib/communication/email-sender-service";
import {
  isSenderIdentityUsable,
  loadActiveSenderIdentityById,
  loadTenantDefaultSenderIdentity,
  TenantCommunicationSenderIdentityError,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { parseEmailSenderIdentityIdFromOrchestration } from "@/lib/communication/sender-identity/communication-email-sender-intent";

export type ResolvedEffectiveEmailSender = {
  identityId: string | null;
  displayName: string;
  emailAddress: string;
  formattedFrom: string;
  source: "TENANT" | "PLATFORM";
  providerStatus: EmailSenderProviderStatus;
};

export class EmailSenderResolutionError extends Error {
  constructor(
    readonly code:
      | "SENDER_NOT_FOUND"
      | "SENDER_INACTIVE"
      | "SENDER_NOT_VERIFIED"
      | "SENDER_UNKNOWN"
      | "SENDER_NOT_USABLE"
      | "PLATFORM_NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "EmailSenderResolutionError";
  }
}

function requirePlatformFrom(): { displayName: string; emailAddress: string; formattedFrom: string } {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new EmailSenderResolutionError(
      "PLATFORM_NOT_CONFIGURED",
      "Plattform-Absender ist nicht konfiguriert.",
    );
  }
  const match = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    const emailAddress = match[2]!.trim().toLowerCase();
    const displayName = match[1]?.trim() || emailAddress;
    return { displayName, emailAddress, formattedFrom: from };
  }
  return { displayName: from, emailAddress: from.toLowerCase(), formattedFrom: from };
}

function mapProviderFailure(status: EmailSenderProviderStatus): EmailSenderResolutionError {
  if (status === "UNKNOWN") {
    return new EmailSenderResolutionError(
      "SENDER_UNKNOWN",
      "Absender-Verifizierung ist derzeit nicht verfügbar.",
    );
  }
  if (status === "NOT_VERIFIED") {
    return new EmailSenderResolutionError(
      "SENDER_NOT_VERIFIED",
      "Absender-Domain ist nicht verifiziert.",
    );
  }
  return new EmailSenderResolutionError(
    "SENDER_NOT_USABLE",
    "Absender ist nicht einsatzbereit.",
  );
}

async function resolveExplicitTenantSender(input: {
  tenantId: string;
  senderIdentityId: string;
}): Promise<ResolvedEffectiveEmailSender> {
  const row = await loadActiveSenderIdentityById({
    tenantId: input.tenantId,
    senderIdentityId: input.senderIdentityId,
  });
  if (!row) {
    throw new EmailSenderResolutionError("SENDER_NOT_FOUND", "Absender nicht gefunden.");
  }
  if (row.status !== "ACTIVE") {
    throw new EmailSenderResolutionError("SENDER_INACTIVE", "Absender ist deaktiviert.");
  }
  if (!isSenderIdentityUsable(row)) {
    throw mapProviderFailure(row.providerStatus);
  }
  return {
    identityId: row.id,
    displayName: row.displayName,
    emailAddress: row.emailAddress,
    formattedFrom: formatEmailSender(row.displayName, row.emailAddress),
    source: "TENANT",
    providerStatus: row.providerStatus,
  };
}

async function resolveDefaultTenantSenderOrFallback(
  tenantId: string,
): Promise<ResolvedEffectiveEmailSender> {
  const defaultSender = await loadTenantDefaultSenderIdentity(tenantId);
  if (defaultSender && isSenderIdentityUsable(defaultSender)) {
    return {
      identityId: defaultSender.id,
      displayName: defaultSender.displayName,
      emailAddress: defaultSender.emailAddress,
      formattedFrom: formatEmailSender(defaultSender.displayName, defaultSender.emailAddress),
      source: "TENANT",
      providerStatus: defaultSender.providerStatus,
    };
  }

  const platform = requirePlatformFrom();
  return {
    identityId: null,
    displayName: platform.displayName,
    emailAddress: platform.emailAddress,
    formattedFrom: platform.formattedFrom,
    source: "PLATFORM",
    providerStatus: defaultSender?.providerStatus ?? "NOT_CONFIGURED",
  };
}

export async function resolveEffectiveEmailSender(input: {
  tenantId: string;
  explicitSenderIdentityId?: string | null;
}): Promise<ResolvedEffectiveEmailSender> {
  const explicit = input.explicitSenderIdentityId?.trim();
  if (explicit) {
    return resolveExplicitTenantSender({
      tenantId: input.tenantId,
      senderIdentityId: explicit,
    });
  }
  return resolveDefaultTenantSenderOrFallback(input.tenantId);
}

export type EmailSenderPublishSnapshot = {
  emailSenderIdentityId: string | null;
  emailSenderDisplayNameSnapshot: string;
  emailSenderAddressSnapshot: string;
  emailSenderSource: PlatformCommunicationEmailSenderSource;
};

export async function resolveEmailSenderPublishSnapshot(input: {
  tenantId: string;
  orchestrationMetaJson: unknown;
  emailChannelEnabled: boolean;
}): Promise<EmailSenderPublishSnapshot | null> {
  if (!input.emailChannelEnabled) return null;

  const explicitId = parseEmailSenderIdentityIdFromOrchestration(input.orchestrationMetaJson);
  const resolved = await resolveEffectiveEmailSender({
    tenantId: input.tenantId,
    explicitSenderIdentityId: explicitId,
  });

  return {
    emailSenderIdentityId: resolved.identityId,
    emailSenderDisplayNameSnapshot: resolved.displayName,
    emailSenderAddressSnapshot: resolved.emailAddress,
    emailSenderSource:
      resolved.source === "TENANT"
        ? PlatformCommunicationEmailSenderSource.TENANT
        : PlatformCommunicationEmailSenderSource.PLATFORM,
  };
}

export function publishSnapshotToPrismaData(
  snapshot: EmailSenderPublishSnapshot | null,
): Record<string, unknown> {
  if (!snapshot) return {};
  return {
    emailSenderIdentityId: snapshot.emailSenderIdentityId,
    emailSenderDisplayNameSnapshot: snapshot.emailSenderDisplayNameSnapshot,
    emailSenderAddressSnapshot: snapshot.emailSenderAddressSnapshot,
    emailSenderSource: snapshot.emailSenderSource,
  };
}

export function resolvedSenderFromCommunicationSnapshot(input: {
  emailSenderIdentityId: string | null;
  emailSenderDisplayNameSnapshot: string | null;
  emailSenderAddressSnapshot: string | null;
  emailSenderSource: PlatformCommunicationEmailSenderSource | null;
}): ResolvedEffectiveEmailSender | null {
  const address = input.emailSenderAddressSnapshot?.trim().toLowerCase();
  if (!address) return null;
  const displayName =
    input.emailSenderDisplayNameSnapshot?.trim() || address;
  return {
    identityId: input.emailSenderIdentityId,
    displayName,
    emailAddress: address,
    formattedFrom: formatEmailSender(displayName, address),
    source:
      input.emailSenderSource === PlatformCommunicationEmailSenderSource.PLATFORM
        ? "PLATFORM"
        : "TENANT",
    providerStatus: "VERIFIED",
  };
}

export { TenantCommunicationSenderIdentityError };

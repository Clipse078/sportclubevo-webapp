import {
  CommunicationCenterConnectorType,
  CommunicationCenterImapSecurity,
  CommunicationCenterMailboxStatus,
  type CommunicationCenterMailbox,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  COMMUNICATION_SECRET_CRYPTO_VERSION,
  decryptCommunicationSecret,
  encryptCommunicationSecret,
} from "@/lib/communication/inbox/communication-secret-crypto";
import { CommunicationCenterError } from "@/lib/communication/inbox/errors";
import { COMMUNICATION_CENTER_INBOX_FOLDER_INBOX } from "@/lib/communication/inbox/constants";
import { normalizeEmailAddress } from "@/lib/communication/inbox/message-id";
import { createInboundCommunicationConnector } from "@/lib/communication/inbox/connector/imap/imap-connector";
import type { InboundImapConnectionConfig } from "@/lib/communication/inbox/connector/types";
import { recordCommunicationCenterAudit } from "@/lib/communication/inbox/inbox-audit";

export type PublicMailbox = {
  id: string;
  tenantId: string;
  displayName: string;
  emailAddress: string;
  connectorType: CommunicationCenterConnectorType;
  status: CommunicationCenterMailboxStatus;
  imapHost: string | null;
  imapPort: number | null;
  imapSecurity: CommunicationCenterImapSecurity | null;
  imapUsername: string | null;
  hasCredential: boolean;
  lastSyncAttemptAt: Date | null;
  lastSyncSuccessAt: Date | null;
  lastSyncErrorCode: string | null;
  lastSyncErrorMessage: string | null;
};

function toPublicMailbox(row: CommunicationCenterMailbox): PublicMailbox {
  return {
    id: row.id,
    tenantId: row.tenantId,
    displayName: row.displayName,
    emailAddress: row.emailAddress,
    connectorType: row.connectorType,
    status: row.status,
    imapHost: row.imapHost,
    imapPort: row.imapPort,
    imapSecurity: row.imapSecurity,
    imapUsername: row.imapUsername,
    hasCredential: Boolean(row.credentialEncrypted),
    lastSyncAttemptAt: row.lastSyncAttemptAt,
    lastSyncSuccessAt: row.lastSyncSuccessAt,
    lastSyncErrorCode: row.lastSyncErrorCode,
    lastSyncErrorMessage: row.lastSyncErrorMessage,
  };
}

export function resolveMailboxImapConfig(mailbox: CommunicationCenterMailbox): InboundImapConnectionConfig {
  if (
    !mailbox.imapHost ||
    !mailbox.imapPort ||
    !mailbox.imapSecurity ||
    !mailbox.imapUsername ||
    !mailbox.credentialEncrypted
  ) {
    throw new CommunicationCenterError("MAILBOX_NOT_CONFIGURED", "Postfach ist nicht vollständig konfiguriert.");
  }
  const password = decryptCommunicationSecret(mailbox.credentialEncrypted);
  return {
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    security: mailbox.imapSecurity,
    username: mailbox.imapUsername,
    password,
  };
}

export async function listCommunicationCenterMailboxes(tenantId: string): Promise<PublicMailbox[]> {
  const rows = await prisma.communicationCenterMailbox.findMany({
    where: { tenantId },
    orderBy: { displayName: "asc" },
  });
  return rows.map(toPublicMailbox);
}

export async function createCommunicationCenterMailbox(input: {
  tenantId: string;
  actorUserId: string;
  displayName: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  imapSecurity: CommunicationCenterImapSecurity;
  imapUsername: string;
  credential: string;
}): Promise<PublicMailbox> {
  const emailAddress = normalizeEmailAddress(input.emailAddress);
  if (!emailAddress) {
    throw new CommunicationCenterError("INVALID_INPUT", "E-Mail-Adresse ist erforderlich.");
  }
  if (!input.displayName.trim()) {
    throw new CommunicationCenterError("INVALID_INPUT", "Anzeigename ist erforderlich.");
  }
  if (!input.credential.trim()) {
    throw new CommunicationCenterError("INVALID_INPUT", "Zugangsdaten sind erforderlich.");
  }

  const encrypted = encryptCommunicationSecret(input.credential.trim());
  const mailbox = await prisma.$transaction(async (tx) => {
    const created = await tx.communicationCenterMailbox.create({
      data: {
        tenantId: input.tenantId,
        displayName: input.displayName.trim(),
        emailAddress,
        connectorType: CommunicationCenterConnectorType.IMAP,
        status: CommunicationCenterMailboxStatus.ACTIVE,
        imapHost: input.imapHost.trim(),
        imapPort: input.imapPort,
        imapSecurity: input.imapSecurity,
        imapUsername: input.imapUsername.trim(),
        credentialEncrypted: encrypted,
        credentialKeyVersion: COMMUNICATION_SECRET_CRYPTO_VERSION,
      },
    });
    await tx.communicationCenterMailboxFolder.create({
      data: {
        tenantId: input.tenantId,
        mailboxId: created.id,
        providerPath: COMMUNICATION_CENTER_INBOX_FOLDER_INBOX,
      },
    });
    return created;
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.mailbox.created",
    targetType: "CommunicationCenterMailbox",
    targetId: mailbox.id,
    metadata: { emailAddress, displayName: mailbox.displayName },
  });

  return toPublicMailbox(mailbox);
}

export async function updateCommunicationCenterMailboxMetadata(input: {
  tenantId: string;
  mailboxId: string;
  actorUserId: string;
  displayName?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecurity?: CommunicationCenterImapSecurity;
  imapUsername?: string;
}): Promise<PublicMailbox> {
  const existing = await prisma.communicationCenterMailbox.findFirst({
    where: { id: input.mailboxId, tenantId: input.tenantId },
  });
  if (!existing) {
    throw new CommunicationCenterError("NOT_FOUND", "Postfach nicht gefunden.");
  }

  const updated = await prisma.communicationCenterMailbox.update({
    where: { id: existing.id },
    data: {
      displayName: input.displayName?.trim() ?? undefined,
      imapHost: input.imapHost?.trim() ?? undefined,
      imapPort: input.imapPort ?? undefined,
      imapSecurity: input.imapSecurity ?? undefined,
      imapUsername: input.imapUsername?.trim() ?? undefined,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.mailbox.updated",
    targetType: "CommunicationCenterMailbox",
    targetId: updated.id,
  });

  return toPublicMailbox(updated);
}

export async function replaceCommunicationCenterMailboxCredential(input: {
  tenantId: string;
  mailboxId: string;
  actorUserId: string;
  credential: string;
}): Promise<PublicMailbox> {
  if (!input.credential.trim()) {
    throw new CommunicationCenterError("INVALID_INPUT", "Zugangsdaten sind erforderlich.");
  }
  const existing = await prisma.communicationCenterMailbox.findFirst({
    where: { id: input.mailboxId, tenantId: input.tenantId },
  });
  if (!existing) {
    throw new CommunicationCenterError("NOT_FOUND", "Postfach nicht gefunden.");
  }

  const encrypted = encryptCommunicationSecret(input.credential.trim());
  const updated = await prisma.communicationCenterMailbox.update({
    where: { id: existing.id },
    data: {
      credentialEncrypted: encrypted,
      credentialKeyVersion: COMMUNICATION_SECRET_CRYPTO_VERSION,
      lastSyncErrorCode: null,
      lastSyncErrorMessage: null,
    },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: "communication.inbox.mailbox.credential_replaced",
    targetType: "CommunicationCenterMailbox",
    targetId: updated.id,
  });

  return toPublicMailbox(updated);
}

export async function setCommunicationCenterMailboxStatus(input: {
  tenantId: string;
  mailboxId: string;
  actorUserId: string;
  status: CommunicationCenterMailboxStatus;
}): Promise<PublicMailbox> {
  const existing = await prisma.communicationCenterMailbox.findFirst({
    where: { id: input.mailboxId, tenantId: input.tenantId },
  });
  if (!existing) {
    throw new CommunicationCenterError("NOT_FOUND", "Postfach nicht gefunden.");
  }

  const updated = await prisma.communicationCenterMailbox.update({
    where: { id: existing.id },
    data: { status: input.status },
  });

  await recordCommunicationCenterAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action:
      input.status === CommunicationCenterMailboxStatus.DISCONNECTED
        ? "communication.inbox.mailbox.disconnected"
        : "communication.inbox.mailbox.status_changed",
    targetType: "CommunicationCenterMailbox",
    targetId: updated.id,
    metadata: { status: input.status },
  });

  return toPublicMailbox(updated);
}

export async function testCommunicationCenterMailboxConnection(input: {
  tenantId: string;
  mailboxId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const mailbox = await prisma.communicationCenterMailbox.findFirst({
    where: { id: input.mailboxId, tenantId: input.tenantId },
  });
  if (!mailbox) {
    throw new CommunicationCenterError("NOT_FOUND", "Postfach nicht gefunden.");
  }
  const config = resolveMailboxImapConfig(mailbox);
  const connector = createInboundCommunicationConnector();
  return connector.testConnection(config);
}

export async function getCommunicationCenterMailboxForTenant(
  tenantId: string,
  mailboxId: string,
): Promise<CommunicationCenterMailbox | null> {
  return prisma.communicationCenterMailbox.findFirst({
    where: { id: mailboxId, tenantId },
  });
}

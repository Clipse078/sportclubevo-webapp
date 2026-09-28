import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import {
  communicationAttachmentStorage,
  getCommunicationStorageKey,
  readStorageStream,
  type CommunicationAttachmentStorage,
} from "@/lib/communication/attachment-storage";
import {
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE,
  validateCommunicationAttachment,
  validateCommunicationAttachmentSet,
} from "@/lib/communication/attachment-validation";
import {
  assertOutboundAttachmentOwnership,
  type OutboundAttachmentOwnershipScope,
} from "@/lib/communication/attachment-authorization";

export type CommunicationAttachmentServiceErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "ATTACHMENT_NOT_FOUND"
  | "MESSAGE_NOT_FOUND"
  | "DOCUMENT_VERSION_NOT_FOUND"
  | "ATTACHMENT_UNAVAILABLE"
  | "ORDER_CONFLICT"
  | "STORAGE_FAILED"
  | "PERSISTENCE_FAILED";

export class CommunicationAttachmentServiceError extends Error {
  constructor(
    readonly code: CommunicationAttachmentServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CommunicationAttachmentServiceError";
  }
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      `${field} is required.`,
    );
  }
  return normalized;
}

async function requireTenantActor(tenantId: string, actorUserId: string) {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId: actorUserId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) {
    throw new CommunicationAttachmentServiceError(
      "FORBIDDEN",
      "Der Benutzer gehört nicht zum aktiven Mandanten.",
    );
  }
}

type PersistBytesInput = {
  tenantId: string;
  actorUserId: string;
  originalFilename: string;
  declaredContentType: string;
  buffer: Uint8Array;
  sourceType: "UPLOAD" | "WORKSPACE_DOCUMENT_VERSION";
  sourceDocumentId?: string;
  sourceDocumentVersionId?: string;
  ingestionMetadata?: Prisma.InputJsonValue;
  storage: CommunicationAttachmentStorage;
};

async function persistBytes(input: PersistBytesInput) {
  const validated = await validateCommunicationAttachment({
    filename: input.originalFilename,
    declaredContentType: input.declaredContentType,
    buffer: input.buffer,
  });
  const id = randomUUID();
  const expectedStorageKey = getCommunicationStorageKey({
    tenantId: input.tenantId,
    attachmentId: id,
    filename: validated.sanitizedFilename,
  });

  let uploaded;
  try {
    uploaded = await input.storage.upload({
      storageKey: expectedStorageKey,
      contentType: validated.contentType,
      buffer: input.buffer,
    });
  } catch {
    throw new CommunicationAttachmentServiceError(
      "STORAGE_FAILED",
      "Der Anhang konnte nicht im privaten Speicher abgelegt werden.",
    );
  }

  try {
    const attachment = await prisma.communicationAttachment.create({
      data: {
        id,
        tenantId: input.tenantId,
        storageKey: uploaded.storageKey,
        originalFilename: validated.originalFilename,
        sanitizedFilename: validated.sanitizedFilename,
        contentType: validated.contentType,
        sizeBytes: uploaded.sizeBytes,
        checksumSha256: uploaded.checksumSha256,
        sourceType: input.sourceType,
        sourceDocumentId: input.sourceDocumentId ?? null,
        sourceDocumentVersionId: input.sourceDocumentVersionId ?? null,
        ingestionMetadata: input.ingestionMetadata,
        lifecycleStatus: "READY",
        // Transitional policy: no scanner is integrated. Strong content
        // validation succeeds, while scanStatus remains explicitly PENDING.
        scanStatus: "PENDING",
        createdByUserId: input.actorUserId,
      },
    });
    await logAction({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      moduleKey: "registrations",
      entityType: "CommunicationAttachment",
      entityId: attachment.id,
      action: "COMMUNICATION_ATTACHMENT_CREATED",
      afterJson: {
        sourceType: input.sourceType,
        filename: validated.sanitizedFilename,
        contentType: validated.contentType,
        sizeBytes: uploaded.sizeBytes,
        checksumSha256: uploaded.checksumSha256,
      },
    });
    return attachment;
  } catch {
    await input.storage.delete(uploaded.storageKey);
    throw new CommunicationAttachmentServiceError(
      "PERSISTENCE_FAILED",
      "Die Anhangsmetadaten konnten nicht gespeichert werden.",
    );
  }
}

export async function createUploadedAttachment(input: {
  tenantId: string;
  actorUserId: string;
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
  ingestionMetadata?: Prisma.InputJsonValue;
  storage?: CommunicationAttachmentStorage;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  await requireTenantActor(tenantId, actorUserId);
  return persistBytes({
    tenantId,
    actorUserId,
    originalFilename: input.filename,
    declaredContentType: input.declaredContentType,
    buffer: input.buffer,
    sourceType: "UPLOAD",
    ingestionMetadata: input.ingestionMetadata,
    storage: input.storage ?? communicationAttachmentStorage,
  });
}

export type OutboundCommunicationAttachment = {
  attachmentId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  content: Buffer;
};

function requireUniqueAttachmentIds(attachmentIds: string[]): string[] {
  const normalized = attachmentIds.map((id) => required(id, "attachmentId"));
  if (normalized.length > MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "Eine Nachricht darf höchstens 10 Anhänge enthalten.",
    );
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "Jeder Anhang darf nur einmal ausgewählt werden.",
    );
  }
  return normalized;
}

/**
 * Resolves a composer selection from persistence before a message is created.
 *
 * Transitional scan policy: READY attachments with PENDING are eligible while
 * no malware scanner is configured. PENDING means validated, not malware-safe.
 * CLEAN is eligible; QUARANTINED and FAILED are always blocked.
 */
export async function validateOutboundAttachmentSelection(input: {
  tenantId: string;
  actorUserId: string;
  attachmentIds: string[];
  ownershipScope?: OutboundAttachmentOwnershipScope;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  const attachmentIds = requireUniqueAttachmentIds(input.attachmentIds);
  await requireTenantActor(tenantId, actorUserId);
  if (attachmentIds.length === 0) return [];

  await assertOutboundAttachmentOwnership({
    tenantId,
    actorUserId,
    attachmentIds,
    scope: input.ownershipScope,
  });

  const attachments = await prisma.communicationAttachment.findMany({
    where: { tenantId, id: { in: attachmentIds } },
    select: {
      id: true,
      lifecycleStatus: true,
      scanStatus: true,
      sizeBytes: true,
    },
  });
  const byId = new Map(attachments.map((attachment) => [attachment.id, attachment]));
  const ordered = attachmentIds.map((id) => byId.get(id));
  if (ordered.some((attachment) => !attachment)) {
    throw new CommunicationAttachmentServiceError(
      "ATTACHMENT_NOT_FOUND",
      "Ein ausgewählter Anhang ist nicht mehr verfügbar.",
    );
  }
  for (const attachment of ordered) {
    if (!attachment || attachment.lifecycleStatus !== "READY") {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei steht noch nicht für den Versand bereit.",
      );
    }
    if (attachment.scanStatus === "QUARANTINED") {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei wurde gesperrt und darf nicht versendet werden.",
      );
    }
    if (attachment.scanStatus === "FAILED") {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei konnte nicht geprüft werden und darf nicht versendet werden.",
      );
    }
  }
  validateCommunicationAttachmentSet(
    ordered.map((attachment) => ({ sizeBytes: attachment?.sizeBytes ?? -1 })),
  );
  return attachmentIds;
}

export async function attachSelectionToMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
  attachmentIds: string[];
}) {
  const attachmentIds = await validateOutboundAttachmentSelection(input);
  const links = [];
  for (const [sortOrder, attachmentId] of attachmentIds.entries()) {
    links.push(
      await attachToMessage({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        messageId: input.messageId,
        attachmentId,
        sortOrder,
      }),
    );
  }
  return links;
}

/**
 * Loads the exact immutable objects associated with a message for provider
 * delivery. Storage metadata and checksums are verified before bytes leave SCE.
 */
export async function loadMessageAttachmentsForDelivery(input: {
  tenantId: string;
  messageId: string;
  storage?: CommunicationAttachmentStorage;
}): Promise<OutboundCommunicationAttachment[]> {
  const tenantId = required(input.tenantId, "tenantId");
  const messageId = required(input.messageId, "messageId");
  const links = await prisma.communicationMessageAttachment.findMany({
    where: { tenantId, messageId },
    select: {
      attachmentId: true,
      sortOrder: true,
      attachment: {
        select: {
          storageKey: true,
          sanitizedFilename: true,
          contentType: true,
          sizeBytes: true,
          checksumSha256: true,
          lifecycleStatus: true,
          scanStatus: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  validateCommunicationAttachmentSet(links.map((link) => link.attachment));
  const storage = input.storage ?? communicationAttachmentStorage;
  const result: OutboundCommunicationAttachment[] = [];

  for (const link of links) {
    const attachment = link.attachment;
    if (
      attachment.lifecycleStatus !== "READY" ||
      attachment.scanStatus === "QUARANTINED" ||
      attachment.scanStatus === "FAILED"
    ) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei steht nicht für den Versand bereit.",
      );
    }
    try {
      const stored = await storage.download({
        storageKey: attachment.storageKey,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
      });
      const bytes = await readStorageStream(
        stored.stream,
        MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
      );
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (
        bytes.byteLength !== attachment.sizeBytes ||
        stored.sizeBytes !== attachment.sizeBytes ||
        checksum !== attachment.checksumSha256
      ) {
        throw new Error("Stored attachment integrity mismatch.");
      }
      result.push({
        attachmentId: link.attachmentId,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        content: Buffer.from(bytes),
      });
    } catch {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Ein Anhang konnte nicht für den Versand geladen werden.",
      );
    }
  }
  return result;
}

export async function snapshotWorkspaceDocumentVersion(input: {
  tenantId: string;
  actorUserId: string;
  workspaceDocumentVersionId: string;
  storage?: CommunicationAttachmentStorage;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  const versionId = required(
    input.workspaceDocumentVersionId,
    "workspaceDocumentVersionId",
  );
  await requireTenantActor(tenantId, actorUserId);

  const version = await prisma.workspaceDocumentVersion.findFirst({
    where: { id: versionId, tenantId },
    select: {
      id: true,
      tenantId: true,
      documentId: true,
      filename: true,
      mimeType: true,
      storageKey: true,
    },
  });
  if (!version) {
    throw new CommunicationAttachmentServiceError(
      "DOCUMENT_VERSION_NOT_FOUND",
      "Dokumentversion nicht gefunden.",
    );
  }

  const storage = input.storage ?? communicationAttachmentStorage;
  let source;
  try {
    source = await storage.download({
      storageKey: version.storageKey,
      filename: version.filename,
      contentType: version.mimeType,
    });
  } catch {
    throw new CommunicationAttachmentServiceError(
      "STORAGE_FAILED",
      "Die Dokumentversion konnte nicht gelesen werden.",
    );
  }
  const buffer = await readStorageStream(
    source.stream,
    MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  );

  return persistBytes({
    tenantId,
    actorUserId,
    originalFilename: version.filename,
    declaredContentType: version.mimeType,
    buffer,
    sourceType: "WORKSPACE_DOCUMENT_VERSION",
    sourceDocumentId: version.documentId,
    sourceDocumentVersionId: version.id,
    storage,
  });
}

export async function attachToMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
  attachmentId: string;
  sortOrder: number;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "sortOrder must be a non-negative safe integer.",
    );
  }
  await requireTenantActor(tenantId, actorUserId);

  const result = await prisma.$transaction(async (tx) => {
    const [message, attachment, existingLinks] = await Promise.all([
      tx.communicationMessage.findFirst({
        where: { id: required(input.messageId, "messageId"), tenantId },
        select: { id: true, threadId: true },
      }),
      tx.communicationAttachment.findFirst({
        where: {
          id: required(input.attachmentId, "attachmentId"),
          tenantId,
          lifecycleStatus: "READY",
          scanStatus: { notIn: ["QUARANTINED", "FAILED"] },
        },
        select: { id: true, sizeBytes: true },
      }),
      tx.communicationMessageAttachment.findMany({
        where: { tenantId, messageId: input.messageId.trim() },
        select: {
          id: true,
          attachmentId: true,
          sortOrder: true,
          attachment: { select: { sizeBytes: true } },
        },
      }),
    ]);
    if (!message) {
      throw new CommunicationAttachmentServiceError(
        "MESSAGE_NOT_FOUND",
        "Nachricht nicht gefunden.",
      );
    }
    if (!attachment) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_NOT_FOUND",
        "Anhang nicht gefunden oder nicht verfügbar.",
      );
    }
    const duplicate = existingLinks.find(
      (link) => link.attachmentId === attachment.id,
    );
    if (duplicate) return duplicate;
    if (existingLinks.some((link) => link.sortOrder === input.sortOrder)) {
      throw new CommunicationAttachmentServiceError(
        "ORDER_CONFLICT",
        "Die Anhangsposition ist bereits belegt.",
      );
    }
    validateCommunicationAttachmentSet([
      ...existingLinks.map((link) => link.attachment),
      attachment,
    ]);
    return tx.communicationMessageAttachment.create({
      data: {
        tenantId,
        messageId: message.id,
        attachmentId: attachment.id,
        sortOrder: input.sortOrder,
      },
    });
  });

  await logAction({
    tenantId,
    actorUserId,
    moduleKey: "registrations",
    entityType: "CommunicationMessage",
    entityId: input.messageId.trim(),
    action: "COMMUNICATION_ATTACHMENT_LINKED",
    afterJson: {
      attachmentId: input.attachmentId.trim(),
      sortOrder: input.sortOrder,
    },
  });
  return result;
}

export async function attachToPlatformCommunication(input: {
  tenantId: string;
  actorUserId: string;
  communicationId: string;
  attachmentId: string;
  sortOrder: number;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "sortOrder must be a non-negative safe integer.",
    );
  }
  await requireTenantActor(tenantId, actorUserId);

  const result = await prisma.$transaction(async (tx) => {
    const [communication, attachment, existingLinks] = await Promise.all([
      tx.platformCommunication.findFirst({
        where: { id: required(input.communicationId, "communicationId"), tenantId },
        select: { id: true },
      }),
      tx.communicationAttachment.findFirst({
        where: {
          id: required(input.attachmentId, "attachmentId"),
          tenantId,
          lifecycleStatus: "READY",
          scanStatus: { notIn: ["QUARANTINED", "FAILED"] },
        },
        select: { id: true, sizeBytes: true },
      }),
      tx.platformCommunicationAttachment.findMany({
        where: { tenantId, communicationId: input.communicationId.trim() },
        select: {
          id: true,
          attachmentId: true,
          sortOrder: true,
          attachment: { select: { sizeBytes: true } },
        },
      }),
    ]);
    if (!communication) {
      throw new CommunicationAttachmentServiceError(
        "MESSAGE_NOT_FOUND",
        "Kommunikation nicht gefunden.",
      );
    }
    if (!attachment) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_NOT_FOUND",
        "Anhang nicht gefunden oder nicht verfügbar.",
      );
    }
    const duplicate = existingLinks.find((link) => link.attachmentId === attachment.id);
    if (duplicate) return duplicate;
    if (existingLinks.some((link) => link.sortOrder === input.sortOrder)) {
      throw new CommunicationAttachmentServiceError(
        "ORDER_CONFLICT",
        "Die Anhangsposition ist bereits belegt.",
      );
    }
    validateCommunicationAttachmentSet([
      ...existingLinks.map((link) => link.attachment),
      attachment,
    ]);
    return tx.platformCommunicationAttachment.create({
      data: {
        tenantId,
        communicationId: communication.id,
        attachmentId: attachment.id,
        sortOrder: input.sortOrder,
      },
    });
  });

  await logAction({
    tenantId,
    actorUserId,
    moduleKey: "communication",
    entityType: "PlatformCommunication",
    entityId: input.communicationId.trim(),
    action: "PLATFORM_COMMUNICATION_ATTACHMENT_LINKED",
    afterJson: {
      attachmentId: input.attachmentId.trim(),
      sortOrder: input.sortOrder,
    },
  });
  return result;
}

export async function attachSelectionToPlatformCommunication(input: {
  tenantId: string;
  actorUserId: string;
  communicationId: string;
  attachmentIds: string[];
}) {
  const attachmentIds = await validateOutboundAttachmentSelection({
    ...input,
    ownershipScope: { platformCommunicationId: input.communicationId },
  });
  const links = [];
  for (const [sortOrder, attachmentId] of attachmentIds.entries()) {
    links.push(
      await attachToPlatformCommunication({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        communicationId: input.communicationId,
        attachmentId,
        sortOrder,
      }),
    );
  }
  return links;
}

export async function syncPlatformCommunicationAttachments(input: {
  tenantId: string;
  actorUserId: string;
  communicationId: string;
  attachmentIds: string[];
}) {
  const attachmentIds = await validateOutboundAttachmentSelection({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    attachmentIds: input.attachmentIds,
    ownershipScope: { platformCommunicationId: input.communicationId },
  });

  await prisma.$transaction(async (tx) => {
    const communication = await tx.platformCommunication.findFirst({
      where: {
        id: required(input.communicationId, "communicationId"),
        tenantId: input.tenantId,
      },
      select: { id: true, status: true },
    });
    if (!communication) {
      throw new CommunicationAttachmentServiceError(
        "MESSAGE_NOT_FOUND",
        "Kommunikation nicht gefunden.",
      );
    }
    if (communication.status !== "DRAFT" && communication.status !== "READY") {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Anhänge können nur im Entwurf geändert werden.",
      );
    }

    await tx.platformCommunicationAttachment.deleteMany({
      where: {
        tenantId: input.tenantId,
        communicationId: communication.id,
        ...(attachmentIds.length > 0
          ? { attachmentId: { notIn: attachmentIds } }
          : {}),
      },
    });

    const existing = await tx.platformCommunicationAttachment.findMany({
      where: { tenantId: input.tenantId, communicationId: communication.id },
      select: { attachmentId: true, sortOrder: true },
    });
    const existingIds = new Set(existing.map((link) => link.attachmentId));

    for (const [sortOrder, attachmentId] of attachmentIds.entries()) {
      if (existingIds.has(attachmentId)) continue;
      await tx.platformCommunicationAttachment.create({
        data: {
          tenantId: input.tenantId,
          communicationId: communication.id,
          attachmentId,
          sortOrder,
        },
      });
    }
  });

  return attachmentIds;
}

export async function attachToCommunicationCenterMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
  attachmentId: string;
  sortOrder: number;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new CommunicationAttachmentServiceError(
      "INVALID_INPUT",
      "sortOrder must be a non-negative safe integer.",
    );
  }
  await requireTenantActor(tenantId, actorUserId);

  return prisma.$transaction(async (tx) => {
    const [message, attachment, existingLinks] = await Promise.all([
      tx.communicationCenterMessage.findFirst({
        where: { id: required(input.messageId, "messageId"), tenantId },
        select: { id: true },
      }),
      tx.communicationAttachment.findFirst({
        where: {
          id: required(input.attachmentId, "attachmentId"),
          tenantId,
          lifecycleStatus: "READY",
          scanStatus: { notIn: ["QUARANTINED", "FAILED"] },
        },
        select: { id: true, sizeBytes: true },
      }),
      tx.communicationCenterMessageAttachment.findMany({
        where: { tenantId, messageId: input.messageId.trim() },
        select: {
          attachmentId: true,
          sortOrder: true,
          attachment: { select: { sizeBytes: true } },
        },
      }),
    ]);
    if (!message) {
      throw new CommunicationAttachmentServiceError(
        "MESSAGE_NOT_FOUND",
        "Nachricht nicht gefunden.",
      );
    }
    if (!attachment) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_NOT_FOUND",
        "Anhang nicht gefunden oder nicht verfügbar.",
      );
    }
    if (existingLinks.some((link) => link.attachmentId === attachment.id)) {
      return existingLinks.find((link) => link.attachmentId === attachment.id)!;
    }
    if (existingLinks.some((link) => link.sortOrder === input.sortOrder)) {
      throw new CommunicationAttachmentServiceError(
        "ORDER_CONFLICT",
        "Die Anhangsposition ist bereits belegt.",
      );
    }
    validateCommunicationAttachmentSet([
      ...existingLinks.map((link) => link.attachment),
      attachment,
    ]);
    return tx.communicationCenterMessageAttachment.create({
      data: {
        tenantId,
        messageId: message.id,
        attachmentId: attachment.id,
        sortOrder: input.sortOrder,
      },
    });
  });
}

export async function mirrorPlatformAttachmentsToCenterMessage(input: {
  tenantId: string;
  actorUserId: string;
  platformCommunicationId: string;
  messageId: string;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  await requireTenantActor(tenantId, actorUserId);

  const platformLinks = await prisma.platformCommunicationAttachment.findMany({
    where: {
      tenantId,
      communicationId: required(input.platformCommunicationId, "platformCommunicationId"),
    },
    select: { attachmentId: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const link of platformLinks) {
    await attachToCommunicationCenterMessage({
      tenantId,
      actorUserId,
      messageId: input.messageId,
      attachmentId: link.attachmentId,
      sortOrder: link.sortOrder,
    });
  }
}

export async function attachSelectionToCommunicationCenterMessage(input: {
  tenantId: string;
  actorUserId: string;
  messageId: string;
  attachmentIds: string[];
}) {
  const attachmentIds = await validateOutboundAttachmentSelection({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    attachmentIds: input.attachmentIds,
    ownershipScope: { centerMessageId: input.messageId },
  });
  const links = [];
  for (const [sortOrder, attachmentId] of attachmentIds.entries()) {
    links.push(
      await attachToCommunicationCenterMessage({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        messageId: input.messageId,
        attachmentId,
        sortOrder,
      }),
    );
  }
  return links;
}

export async function loadCommunicationCenterMessageAttachmentsForDelivery(input: {
  tenantId: string;
  messageId: string;
  storage?: CommunicationAttachmentStorage;
}): Promise<OutboundCommunicationAttachment[]> {
  const tenantId = required(input.tenantId, "tenantId");
  const messageId = required(input.messageId, "messageId");
  const links = await prisma.communicationCenterMessageAttachment.findMany({
    where: { tenantId, messageId },
    select: {
      attachmentId: true,
      sortOrder: true,
      attachment: {
        select: {
          storageKey: true,
          sanitizedFilename: true,
          contentType: true,
          sizeBytes: true,
          checksumSha256: true,
          lifecycleStatus: true,
          scanStatus: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  validateCommunicationAttachmentSet(links.map((link) => link.attachment));
  const storage = input.storage ?? communicationAttachmentStorage;
  const result: OutboundCommunicationAttachment[] = [];

  for (const link of links) {
    const attachment = link.attachment;
    if (
      attachment.lifecycleStatus !== "READY" ||
      attachment.scanStatus === "QUARANTINED" ||
      attachment.scanStatus === "FAILED"
    ) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei steht nicht für den Versand bereit.",
      );
    }
    try {
      const stored = await storage.download({
        storageKey: attachment.storageKey,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
      });
      const bytes = await readStorageStream(
        stored.stream,
        MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
      );
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (
        bytes.byteLength !== attachment.sizeBytes ||
        stored.sizeBytes !== attachment.sizeBytes ||
        checksum !== attachment.checksumSha256
      ) {
        throw new Error("Stored attachment integrity mismatch.");
      }
      result.push({
        attachmentId: link.attachmentId,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        content: Buffer.from(bytes),
      });
    } catch {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Ein Anhang konnte nicht für den Versand geladen werden.",
      );
    }
  }
  return result;
}

export async function loadPlatformCommunicationAttachmentsForDelivery(input: {
  tenantId: string;
  communicationId: string;
  storage?: CommunicationAttachmentStorage;
}): Promise<OutboundCommunicationAttachment[]> {
  const tenantId = required(input.tenantId, "tenantId");
  const communicationId = required(input.communicationId, "communicationId");
  const links = await prisma.platformCommunicationAttachment.findMany({
    where: { tenantId, communicationId },
    select: {
      attachmentId: true,
      sortOrder: true,
      attachment: {
        select: {
          storageKey: true,
          sanitizedFilename: true,
          contentType: true,
          sizeBytes: true,
          checksumSha256: true,
          lifecycleStatus: true,
          scanStatus: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  validateCommunicationAttachmentSet(links.map((link) => link.attachment));
  const storage = input.storage ?? communicationAttachmentStorage;
  const result: OutboundCommunicationAttachment[] = [];

  for (const link of links) {
    const attachment = link.attachment;
    if (
      attachment.lifecycleStatus !== "READY" ||
      attachment.scanStatus === "QUARANTINED" ||
      attachment.scanStatus === "FAILED"
    ) {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Eine Datei steht nicht für den Versand bereit.",
      );
    }
    try {
      const stored = await storage.download({
        storageKey: attachment.storageKey,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
      });
      const bytes = await readStorageStream(
        stored.stream,
        MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
      );
      const checksum = createHash("sha256").update(bytes).digest("hex");
      if (
        bytes.byteLength !== attachment.sizeBytes ||
        stored.sizeBytes !== attachment.sizeBytes ||
        checksum !== attachment.checksumSha256
      ) {
        throw new Error("Stored attachment integrity mismatch.");
      }
      result.push({
        attachmentId: link.attachmentId,
        filename: attachment.sanitizedFilename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        content: Buffer.from(bytes),
      });
    } catch {
      throw new CommunicationAttachmentServiceError(
        "ATTACHMENT_UNAVAILABLE",
        "Ein Anhang konnte nicht für den Versand geladen werden.",
      );
    }
  }
  return result;
}

export async function cloneMessageAttachmentsForRetry(input: {
  tenantId: string;
  actorUserId: string;
  sourceMessageId: string;
  retryMessageId: string;
}) {
  const tenantId = required(input.tenantId, "tenantId");
  const actorUserId = required(input.actorUserId, "actorUserId");
  const sourceMessageId = required(input.sourceMessageId, "sourceMessageId");
  const retryMessageId = required(input.retryMessageId, "retryMessageId");
  await requireTenantActor(tenantId, actorUserId);

  return prisma.$transaction(async (tx) => {
    const messages = await tx.communicationMessage.findMany({
      where: { tenantId, id: { in: [sourceMessageId, retryMessageId] } },
      select: { id: true },
    });
    if (messages.length !== 2) {
      throw new CommunicationAttachmentServiceError(
        "MESSAGE_NOT_FOUND",
        "Quell- oder Wiederholungsnachricht nicht gefunden.",
      );
    }

    const [sourceLinks, retryLinks] = await Promise.all([
      tx.communicationMessageAttachment.findMany({
        where: { tenantId, messageId: sourceMessageId },
        select: { attachmentId: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      }),
      tx.communicationMessageAttachment.findMany({
        where: { tenantId, messageId: retryMessageId },
        select: { attachmentId: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    if (retryLinks.length > 0) {
      const same =
        retryLinks.length === sourceLinks.length &&
        retryLinks.every(
          (link, index) =>
            link.attachmentId === sourceLinks[index]?.attachmentId &&
            link.sortOrder === sourceLinks[index]?.sortOrder,
        );
      if (!same) {
        throw new CommunicationAttachmentServiceError(
          "ORDER_CONFLICT",
          "Die Wiederholungsnachricht besitzt bereits andere Anhänge.",
        );
      }
      return retryLinks;
    }

    if (sourceLinks.length > 0) {
      await tx.communicationMessageAttachment.createMany({
        data: sourceLinks.map((link) => ({
          tenantId,
          messageId: retryMessageId,
          attachmentId: link.attachmentId,
          sortOrder: link.sortOrder,
        })),
      });
    }
    return sourceLinks;
  });
}

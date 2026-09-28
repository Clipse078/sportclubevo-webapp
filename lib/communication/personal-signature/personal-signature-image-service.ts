/**
 * SCE-COMM-EVO-07 — signature logo upload (private EVO-04 storage).
 */

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  communicationAttachmentStorage,
  getCommunicationStorageKey,
} from "@/lib/communication/attachment-storage";
import {
  SignatureImageValidationError,
  validatePersonalSignatureImage,
} from "@/lib/communication/personal-signature/signature-image-validation";
import { createHash } from "node:crypto";

export type SignatureImageUploadResult =
  | {
      ok: true;
      attachmentId: string;
      cidKey: string;
      contentType: string;
      sizeBytes: number;
      filename: string;
    }
  | { ok: false; code: string; message: string };

export async function uploadPersonalSignatureImage(input: {
  tenantId: string;
  userId: string;
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
}): Promise<SignatureImageUploadResult> {
  let validated;
  try {
    validated = await validatePersonalSignatureImage({
      filename: input.filename,
      declaredContentType: input.declaredContentType,
      buffer: input.buffer,
    });
  } catch (error) {
    if (error instanceof SignatureImageValidationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      isActive: true,
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: { id: true },
  });
  if (!membership) {
    return { ok: false, code: "FORBIDDEN", message: "Nicht autorisiert." };
  }

  const id = randomUUID();
  const storageKey = getCommunicationStorageKey({
    tenantId: input.tenantId,
    attachmentId: id,
    filename: validated.sanitizedFilename,
  });
  const checksumSha256 = createHash("sha256").update(input.buffer).digest("hex");

  try {
    await communicationAttachmentStorage.upload({
      storageKey,
      contentType: validated.contentType,
      buffer: input.buffer,
    });
  } catch {
    return {
      ok: false,
      code: "STORAGE_FAILED",
      message: "Das Logo konnte nicht gespeichert werden.",
    };
  }

  const ingestionMetadata = {
    purpose: "PERSONAL_SIGNATURE_LOGO",
    ownerUserId: input.userId,
  } satisfies Prisma.InputJsonObject;

  await prisma.communicationAttachment.create({
    data: {
      id,
      tenantId: input.tenantId,
      storageKey,
      originalFilename: validated.originalFilename,
      sanitizedFilename: validated.sanitizedFilename,
      contentType: validated.contentType,
      sizeBytes: validated.sizeBytes,
      checksumSha256,
      sourceType: "PERSONAL_SIGNATURE",
      lifecycleStatus: "READY",
      scanStatus: "CLEAN",
      createdByUserId: input.userId,
      ingestionMetadata,
    },
  });

  return {
    ok: true,
    attachmentId: id,
    cidKey: id,
    contentType: validated.contentType,
    sizeBytes: validated.sizeBytes,
    filename: validated.sanitizedFilename,
  };
}

export async function assertSignatureImageOwnedByUser(input: {
  tenantId: string;
  userId: string;
  attachmentId: string;
}): Promise<boolean> {
  const row = await prisma.communicationAttachment.findFirst({
    where: {
      id: input.attachmentId,
      tenantId: input.tenantId,
      sourceType: "PERSONAL_SIGNATURE",
      createdByUserId: input.userId,
      lifecycleStatus: "READY",
      scanStatus: "CLEAN",
    },
    select: { id: true },
  });
  return Boolean(row);
}

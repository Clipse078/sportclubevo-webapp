/**
 * SCE-COMM-EVO-07 — CID inline assets for outbound communication email.
 */

import type { MailAttachment } from "@/lib/email/mailer";
import { prisma } from "@/lib/db/prisma";
import {
  communicationAttachmentStorage,
  readStorageStream,
} from "@/lib/communication/attachment-storage";
import { MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES } from "@/lib/communication/attachment-validation";
import { PERSONAL_SIGNATURE_CID_PREFIX } from "@/lib/communication/personal-signature/personal-signature-constants";
import type { PersonalSignatureFreezeSnapshot } from "@/lib/communication/personal-signature/personal-signature-freeze";
import {
  signatureContentToEmailHtml,
  type SignatureEmailRenderContext,
} from "@/lib/communication/personal-signature/signature-content";
import { plainTextToSafeHtml } from "@/lib/communication/outbound-email-service";

export function buildSignatureCid(attachmentId: string, cidKey: string): string {
  return `${PERSONAL_SIGNATURE_CID_PREFIX}-${cidKey || attachmentId}@sportclubevo.local`;
}

export async function loadSignatureCidMailAttachments(input: {
  tenantId: string;
  freeze: PersonalSignatureFreezeSnapshot;
}): Promise<MailAttachment[]> {
  if (input.freeze.assets.length === 0) return [];
  const attachmentIds = input.freeze.assets.map((a) => a.attachmentId);
  const rows = await prisma.communicationAttachment.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: attachmentIds },
      lifecycleStatus: "READY",
      scanStatus: "CLEAN",
    },
    select: {
      id: true,
      sanitizedFilename: true,
      contentType: true,
      storageKey: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: MailAttachment[] = [];
  for (const asset of input.freeze.assets) {
    const row = byId.get(asset.attachmentId);
    if (!row) continue;
    const stored = await communicationAttachmentStorage.download({
      storageKey: row.storageKey,
      filename: row.sanitizedFilename,
      contentType: row.contentType,
    });
    const bytes = await readStorageStream(stored.stream, MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES);
    out.push({
      filename: row.sanitizedFilename,
      content: Buffer.from(bytes),
      contentType: row.contentType,
      cid: buildSignatureCid(asset.attachmentId, asset.cidKey),
      contentDisposition: "inline",
    });
  }
  return out;
}

export function renderEmailBodyHtmlFromFreeze(input: {
  messageBodyText: string;
  signaturePlainText: string | null;
  freeze: PersonalSignatureFreezeSnapshot | null;
}): string {
  const messageHtml = plainTextToSafeHtml(input.messageBodyText.trim()).replace(
    "<p>",
    '<p style="margin:0 0 12px;font-family:sans-serif;">',
  );
  if (!input.freeze) {
    if (input.signaturePlainText?.trim()) {
      const sigHtml = plainTextToSafeHtml(input.signaturePlainText.trim()).replace(
        "<p>",
        '<p style="margin:16px 0 0;font-family:sans-serif;font-size:14px;color:#333;">',
      );
      return `${messageHtml}${sigHtml}`;
    }
    return messageHtml;
  }

  const ctx: SignatureEmailRenderContext = {
    cidForAttachment: (attachmentId, cidKey) => buildSignatureCid(attachmentId, cidKey),
  };
  const signatureHtml = signatureContentToEmailHtml(input.freeze.contentJson, ctx);
  const wrapper = signatureHtml
    ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;">${signatureHtml}</div>`
    : "";
  return `${messageHtml}${wrapper}`;
}

/** Split combined personalised plain body back into message + signature using freeze metadata. */
export function splitPersonalisedBodyUsingFreeze(
  combinedBody: string,
  freeze: PersonalSignatureFreezeSnapshot | null,
): { messageBody: string; signaturePlain: string | null } {
  if (!freeze) {
    return { messageBody: combinedBody, signaturePlain: null };
  }
  const messagePrefix = freeze.messageBodyText;
  const normalised = combinedBody.replace(/\r\n/g, "\n");
  if (normalised.startsWith(messagePrefix)) {
    const rest = normalised.slice(messagePrefix.length).replace(/^\n\n/, "");
    return {
      messageBody: messagePrefix,
      signaturePlain: rest || freeze.plainTextFallback,
    };
  }
  const sigLen = freeze.plainTextFallback.length;
  if (sigLen > 0 && normalised.endsWith(freeze.plainTextFallback)) {
    const messageBody = normalised.slice(0, normalised.length - freeze.plainTextFallback.length).replace(/\n\n$/, "");
    return { messageBody, signaturePlain: freeze.plainTextFallback };
  }
  return { messageBody: combinedBody, signaturePlain: freeze.plainTextFallback };
}

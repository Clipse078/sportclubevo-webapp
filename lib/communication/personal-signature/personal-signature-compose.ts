/**
 * SCE-COMM-UX-08A / EVO-07 — compose outbound message body with optional personal signature.
 * Signature is embedded into stored communication body text at send/publish time.
 */

import type { PersonalSignatureContent } from "@/lib/communication/personal-signature/signature-content-types";
import { signatureContentToInAppHtml } from "@/lib/communication/personal-signature/signature-content";

export function composeMessageBodyWithPersonalSignature(
  messageBody: string,
  signatureBody: string | null | undefined,
): string {
  const message = messageBody.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const signature = signatureBody?.replace(/\r\n/g, "\n").trim() ?? "";
  if (!signature) return message;
  if (!message.trim()) return signature;
  return `${message}\n\n${signature}`;
}

export function previewMessageWithPersonalSignature(
  messageBody: string,
  signatureBody: string | null | undefined,
  options?: { contentJson?: PersonalSignatureContent | null },
): {
  message: string;
  signature: string | null;
  signatureHtml: string | null;
  combined: string;
} {
  const message = messageBody.replace(/\r\n/g, "\n");
  const signature = signatureBody?.replace(/\r\n/g, "\n").trim() ?? "";
  const signatureHtml =
    options?.contentJson && signature
      ? signatureContentToInAppHtml(options.contentJson, {
          previewUrlForAttachment: (attachmentId) =>
            `/api/communication/attachments/${attachmentId}/download?disposition=inline`,
        })
      : null;
  if (!signature) {
    return { message, signature: null, signatureHtml: null, combined: message };
  }
  return {
    message,
    signature,
    signatureHtml,
    combined: composeMessageBodyWithPersonalSignature(message, signature),
  };
}

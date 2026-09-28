/**
 * SCE-COMM-UX-08A — compose outbound message body with optional personal signature.
 * Signature is embedded into stored communication body text at send/publish time.
 */

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
): { message: string; signature: string | null; combined: string } {
  const message = messageBody.replace(/\r\n/g, "\n");
  const signature = signatureBody?.replace(/\r\n/g, "\n").trim() ?? "";
  if (!signature) {
    return { message, signature: null, combined: message };
  }
  return {
    message,
    signature,
    combined: composeMessageBodyWithPersonalSignature(message, signature),
  };
}

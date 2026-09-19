/**
 * BILLING-COMMS-01F — safe Content-Disposition for billing attachment downloads.
 */

const FORCE_ATTACHMENT_CONTENT_TYPES = new Set([
  "text/html",
  "text/javascript",
  "application/javascript",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/xml",
  "application/xml",
]);

export function sanitizeBillingAttachmentDownloadFilename(filename: string): string {
  return filename.replace(/[\r\n"]/g, "").trim() || "download";
}

export function resolveBillingAttachmentContentDisposition(input: {
  contentType: string;
  filename: string;
}): string {
  const filename = sanitizeBillingAttachmentDownloadFilename(input.filename);
  const normalizedType = input.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const forceAttachment =
    FORCE_ATTACHMENT_CONTENT_TYPES.has(normalizedType) ||
    normalizedType.startsWith("text/") ||
    normalizedType.includes("script");

  if (forceAttachment) {
    return `attachment; filename="${filename}"`;
  }

  // Billing attachments are always served as downloads (no inline rendering).
  return `attachment; filename="${filename}"`;
}

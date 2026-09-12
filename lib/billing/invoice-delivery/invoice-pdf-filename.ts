const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function buildInvoicePdfAttachmentFilename(invoiceNumber: string): string {
  const sanitized = invoiceNumber
    .trim()
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const safe = sanitized.length > 0 ? sanitized : "rechnung";
  return `SportClubEvo-Rechnung-${safe}.pdf`;
}

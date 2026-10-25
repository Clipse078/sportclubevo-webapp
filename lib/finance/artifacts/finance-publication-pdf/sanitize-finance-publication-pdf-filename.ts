/**
 * Safe, human-readable PDF filenames for publication artifacts.
 */

export function sanitizeFinancePublicationPdfFilenameSegment(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized.slice(0, 48) || "Publication";
}

export function buildFinancePublicationPdfFilename(input: {
  organisationName: string;
  reportTitle: string;
  financeYearLabel: string;
  versionNumber: number;
}): string {
  const org = sanitizeFinancePublicationPdfFilenameSegment(input.organisationName);
  const report = sanitizeFinancePublicationPdfFilenameSegment(input.reportTitle);
  const year = sanitizeFinancePublicationPdfFilenameSegment(input.financeYearLabel);
  return `${org}_${report}_FY-${year}_Version-${input.versionNumber}.pdf`;
}

export function financePublicationPdfContentDisposition(filename: string): string {
  const safe = filename.replace(/[\r\n"]/g, "").trim() || "publication.pdf";
  return `attachment; filename="${safe}"`;
}

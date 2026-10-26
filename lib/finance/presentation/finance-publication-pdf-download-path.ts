export function financePublicationPdfDownloadPath(input: {
  publicationId: string;
  versionNumber: number;
}): string {
  const publicationId = encodeURIComponent(input.publicationId.trim());
  const versionNumber = Math.max(1, Math.floor(input.versionNumber));
  return `/api/dashboard/finance/publications/${publicationId}/versions/${versionNumber}/pdf`;
}

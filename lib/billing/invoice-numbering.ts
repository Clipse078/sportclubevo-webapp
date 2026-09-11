/** Formats a finalized invoice number: YYYY-NNNNNN (six-digit sequence). */
export function formatInvoiceNumber(sequenceYear: number, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(6, "0");
  return `${sequenceYear}-${padded}`;
}

export function invoiceSequenceYearFromDate(date: Date): number {
  return date.getUTCFullYear();
}

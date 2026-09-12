import { resolveInvoicePdfDocumentData } from "./invoice-pdf/resolve-invoice-pdf-data";
import { generateInvoicePdfFromDocumentData } from "./invoice-pdf/generate-invoice-pdf";

export async function generateNativeInvoicePdfBytes(invoiceKey: string): Promise<Uint8Array> {
  const data = await resolveInvoicePdfDocumentData(invoiceKey);
  const result = await generateInvoicePdfFromDocumentData(data);
  return result.pdfBytes;
}

export { resolveInvoicePdfDocumentData } from "./invoice-pdf/resolve-invoice-pdf-data";
export { generateInvoicePdfFromDocumentData } from "./invoice-pdf/generate-invoice-pdf";

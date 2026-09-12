import { PDFDocument } from "pdf-lib";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "./constants";
import { mmToPt } from "./mm";
import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import {
  drawInvoiceBodyPaginated,
  shouldUseSinglePageWithPayment,
} from "./render-invoice-document";
import {
  drawSwissPaymentSlipOnPage,
  type SwissPaymentSlipRenderInput,
} from "./render-swiss-payment-slip";
export type GenerateInvoicePdfResult = {
  pdfBytes: Uint8Array;
  pageCount: number;
  singlePageLayout: boolean;
};

export async function generateInvoicePdfFromDocumentData(
  data: InvoicePdfDocumentData,
): Promise<GenerateInvoicePdfResult> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Rechnung ${data.invoice.invoiceNumber ?? data.invoice.key}`);
  pdfDoc.setProducer("SportClubEvo Billing");

  const singlePageLayout =
    data.includeSwissPaymentSection &&
    shouldUseSinglePageWithPayment(data.lines.length);

  const { lastPage } = await drawInvoiceBodyPaginated(
    pdfDoc,
    data,
    singlePageLayout,
  );

  if (
    data.includeSwissPaymentSection &&
    data.paymentInstruction &&
    data.spcPayload &&
    data.creditorAccount
  ) {
    const slipInput: SwissPaymentSlipRenderInput = {
      spcPayload: data.spcPayload,
      instruction: data.paymentInstruction,
      issuer: data.issuer,
      recipient: data.recipient,
      creditorAccount: data.creditorAccount,
    };

    if (singlePageLayout) {
      await drawSwissPaymentSlipOnPage(pdfDoc, lastPage, 0, slipInput);
    } else {
      const paymentPage = pdfDoc.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);
      await drawSwissPaymentSlipOnPage(pdfDoc, paymentPage, 0, slipInput);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    pageCount: pdfDoc.getPageCount(),
    singlePageLayout,
  };
}

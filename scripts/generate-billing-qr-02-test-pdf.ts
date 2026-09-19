import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureInvoice,
  buildFixtureTax,
} from "../lib/billing/invoice-pdf/__tests__/invoice-pdf-fixtures";
import { buildSwissSpcPayload } from "../lib/billing/swiss-qr/swiss-spc-payload";
import { generateInvoicePdfFromDocumentData } from "../lib/billing/invoice-pdf/generate-invoice-pdf";

const REFERENCE_QR_IBAN = "CH693000523573415901X";
const REFERENCE_QRR = "273282026000002025434650072";

async function main() {
  const issuer = buildFixtureIssuer();
  const recipient = buildFixtureRecipient();
  const spcPayload = buildSwissSpcPayload({
    creditorAccount: REFERENCE_QR_IBAN,
    creditor: {
      name: issuer.legalName,
      street: issuer.addressLine1,
      houseNumber: issuer.houseNumber,
      postalCode: issuer.postalCode,
      city: issuer.city,
      countryCode: issuer.countryCode,
    },
    debtor: {
      name: recipient.companyOrName,
      street: recipient.street,
      houseNumber: recipient.houseNumber,
      postalCode: recipient.postalCode,
      city: recipient.city,
      countryCode: recipient.countryCode,
    },
    amountMinor: 21512,
    currency: "CHF",
    referenceType: "QRR",
    reference: REFERENCE_QRR,
  });

  const { pdfBytes } = await generateInvoicePdfFromDocumentData({
    invoice: buildFixtureInvoice(),
    lines: [buildFixtureLine()],
    taxSnapshots: [buildFixtureTax()],
    issuer,
    recipient,
    paymentInstruction: buildFixturePaymentInstruction({ reference: REFERENCE_QRR }),
    spcPayload,
    creditorAccount: REFERENCE_QR_IBAN,
    isVoid: false,
    includeSwissPaymentSection: true,
  });

  const outDir = "/opt/cursor/artifacts";
  await mkdir(outDir, { recursive: true });
  const pdfPath = path.join(outDir, "billing-qr-02b-invoice-2026-000002-test.pdf");
  await writeFile(pdfPath, pdfBytes);
  console.log(`Wrote ${pdfPath} (${pdfBytes.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

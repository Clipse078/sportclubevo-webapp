import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureInvoice,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "../lib/billing/invoice-pdf/__tests__/invoice-pdf-fixtures";
import { buildSwissSpcPayload } from "../lib/billing/swiss-qr/swiss-spc-payload";
import { generateInvoicePdfFromDocumentData } from "../lib/billing/invoice-pdf/generate-invoice-pdf";

async function main() {
  const spcPayload = buildSwissSpcPayload({
    creditorAccount: FIXTURE_QR_IBAN,
    creditor: {
      name: buildFixtureIssuer().legalName,
      street: buildFixtureIssuer().addressLine1,
      houseNumber: buildFixtureIssuer().houseNumber,
      postalCode: buildFixtureIssuer().postalCode,
      city: buildFixtureIssuer().city,
      countryCode: buildFixtureIssuer().countryCode,
    },
    debtor: {
      name: buildFixtureRecipient().companyOrName,
      street: buildFixtureRecipient().street,
      houseNumber: buildFixtureRecipient().houseNumber,
      postalCode: buildFixtureRecipient().postalCode,
      city: buildFixtureRecipient().city,
      countryCode: buildFixtureRecipient().countryCode,
    },
    amountMinor: 21512,
    currency: "CHF",
    referenceType: "QRR",
    reference: buildFixturePaymentInstruction().reference,
    additionalInformation: null,
  });

  const { pdfBytes } = await generateInvoicePdfFromDocumentData({
    invoice: buildFixtureInvoice(),
    lines: [buildFixtureLine()],
    taxSnapshots: [buildFixtureTax()],
    issuer: buildFixtureIssuer(),
    recipient: buildFixtureRecipient(),
    paymentInstruction: buildFixturePaymentInstruction(),
    spcPayload,
    creditorAccount: FIXTURE_QR_IBAN,
    isVoid: false,
    includeSwissPaymentSection: true,
  });

  const outDir = "/opt/cursor/artifacts";
  await mkdir(outDir, { recursive: true });
  const pdfPath = path.join(outDir, "sce-swiss-01e-invoice-2026-000002-fixture.pdf");
  await writeFile(pdfPath, pdfBytes);
  console.log(`Wrote ${pdfPath} (${pdfBytes.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

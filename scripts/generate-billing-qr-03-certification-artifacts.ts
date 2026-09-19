import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateInvoicePdfFromDocumentData } from "../lib/billing/invoice-pdf/generate-invoice-pdf";
import {
  buildFixtureInvoice,
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixtureRecipient,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "../lib/billing/invoice-pdf/__tests__/invoice-pdf-fixtures";
import { renderSwissQrCodePng } from "../lib/billing/invoice-pdf/swiss-qr-code-image";
import { goldenValidFixtures } from "../lib/billing/swiss-qr-compliance/fixtures/golden-fixtures";
import { runSwissQrCompliance } from "../lib/billing/swiss-qr-compliance/run-swiss-qr-compliance";

async function main() {
  const outDir = path.join(process.cwd(), "artifacts", "billing-qr-03");
  await mkdir(outDir, { recursive: true });

  for (const fixture of goldenValidFixtures) {
    if (fixture.id === "iban-scor-eur-shaped") {
      continue;
    }
    const compliance = await runSwissQrCompliance(fixture.data, { verifyQrArtifact: true });
    if (!compliance.ok) {
      throw new Error(`Fixture ${fixture.id} failed compliance`);
    }
    const payloadPath = path.join(outDir, `${fixture.id}.spc.txt`);
    await writeFile(payloadPath, compliance.canonicalPayload, "utf8");

    const png = await renderSwissQrCodePng(compliance.canonicalPayload);
    await writeFile(path.join(outDir, `${fixture.id}.qr.png`), png);

    if (fixture.id === "tulip-qrr-chf") {
      const { pdfBytes } = await generateInvoicePdfFromDocumentData({
        invoice: buildFixtureInvoice(),
        lines: [buildFixtureLine()],
        taxSnapshots: [buildFixtureTax()],
        issuer: buildFixtureIssuer(),
        recipient: buildFixtureRecipient(),
        paymentInstruction: buildFixturePaymentInstruction(),
        spcPayload: compliance.canonicalPayload,
        creditorAccount: FIXTURE_QR_IBAN,
        isVoid: false,
        includeSwissPaymentSection: true,
      });
      await writeFile(path.join(outDir, `${fixture.id}.pdf`), Buffer.from(pdfBytes));
    }
  }

  console.log(`Certification artifacts written to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

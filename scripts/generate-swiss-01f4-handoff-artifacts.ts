import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  buildFixtureIssuer,
  buildFixtureLine,
  buildFixturePaymentInstruction,
  buildFixturePdfDocumentData,
  buildFixtureRecipient,
  buildFixtureInvoice,
  buildFixtureTax,
  FIXTURE_QR_IBAN,
} from "../lib/billing/invoice-pdf/__tests__/invoice-pdf-fixtures";
import { buildSwissSpcPayload } from "../lib/billing/swiss-qr/swiss-spc-payload";
import { generateInvoicePdfFromDocumentData } from "../lib/billing/invoice-pdf/generate-invoice-pdf";
import {
  A4_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "../lib/billing/invoice-pdf/constants";
import {
  measureTotalsGrossTextBaselineYm,
  planInvoiceCreativeLayout,
} from "../lib/billing/invoice-pdf/invoice-creative-layout-planner";
import {
  PAGE_MARGIN_X_MM,
  computeOperatorBrandRowLayoutMm,
  planInvoiceBodyLayoutRegions,
} from "../lib/billing/invoice-pdf/invoice-design-geometry";

const execFileAsync = promisify(execFile);
const ARTIFACT_DIR = "/opt/cursor/artifacts";
const DPI = 300;

async function generateFixturePdf(): Promise<string> {
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

  const pdfPath = path.join(ARTIFACT_DIR, "swiss-01f4-invoice-2026-000002-fixture.pdf");
  await writeFile(pdfPath, pdfBytes);
  return pdfPath;
}

async function pdfFirstPageToPng(pdfPath: string, outPrefix: string): Promise<string> {
  await execFileAsync("pdftoppm", ["-png", "-r", String(DPI), "-f", "1", "-l", "1", pdfPath, outPrefix]);
  return `${outPrefix}-1.png`;
}

async function cropPng(
  inputPath: string,
  outputPath: string,
  crop: { x: number; y: number; width: number; height: number },
): Promise<void> {
  const geometry = `${Math.round(crop.width)}x${Math.round(crop.height)}+${Math.round(crop.x)}+${Math.round(crop.y)}`;
  await execFileAsync("convert", [inputPath, "-crop", geometry, outputPath]);
}

function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * (dpi / 25.4));
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const pdfPath = await generateFixturePdf();
  const fullPrefix = path.join(ARTIFACT_DIR, "swiss-01f4-a4-full");
  const fullPng = await pdfFirstPageToPng(pdfPath, fullPrefix);

  const { stdout: sizeOut } = await execFileAsync("identify", ["-format", "%w %h", fullPng]);
  const [pageWidthPx, pageHeightPx] = sizeOut.trim().split(/\s+/).map(Number);

  const creative = planInvoiceCreativeLayout(buildFixturePdfDocumentData());
  const region = (id: string) => {
    const entry = creative.regions.find((r) => r.id === id);
    if (!entry) {
      throw new Error(`Missing creative region ${id}`);
    }
    return entry;
  };

  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01f4-recipient-issuer-crop.png"), {
    x: mmToPx(PAGE_MARGIN_X_MM - 3, DPI),
    y: mmToPx(region("address_labels").yMm - 2, DPI),
    width: mmToPx(A4_WIDTH_MM - PAGE_MARGIN_X_MM * 2 + 6, DPI),
    height: mmToPx(
      Math.max(region("recipient_block").bottomYMm, region("issuer_block").bottomYMm) -
        region("address_labels").yMm +
        4,
      DPI,
    ),
  });

  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01f4-table-totals-thankyou-crop.png"), {
    x: mmToPx(PAGE_MARGIN_X_MM - 2, DPI),
    y: mmToPx(region("line_items_table").yMm - 2, DPI),
    width: mmToPx(A4_WIDTH_MM - PAGE_MARGIN_X_MM * 2 + 4, DPI),
    height: mmToPx(region("acknowledgement").bottomYMm - region("line_items_table").yMm + 4, DPI),
  });

  const brandRow = computeOperatorBrandRowLayoutMm();
  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01f4-brand-row-crop.png"), {
    x: mmToPx(PAGE_MARGIN_X_MM - 4, DPI),
    y: mmToPx(region("acknowledgement").yMm - 2, DPI),
    width: mmToPx(A4_WIDTH_MM - PAGE_MARGIN_X_MM * 2 + 8, DPI),
    height: mmToPx(brandRow.rowBottomYMm - region("acknowledgement").yMm + 6, DPI),
  });

  const paymentHeightPx = mmToPx(SWISS_PAYMENT_SECTION_HEIGHT_MM, DPI);
  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01f4-payment-section-210x105.png"), {
    x: 0,
    y: pageHeightPx - paymentHeightPx,
    width: pageWidthPx,
    height: paymentHeightPx,
  });

  const totals = region("totals_block");
  const thank = region("acknowledgement");
  const report = {
    recipientFontSizePt: creative.addressLayout.recipient.fontSizePt,
    issuerFontSizePt: creative.addressLayout.issuer.fontSizePt,
    recipientLineStepMm: creative.addressLayout.recipient.baselineStepMm,
    issuerLineStepMm: creative.addressLayout.issuer.baselineStepMm,
    addressesToTableMm: creative.gaps.addressesToTableMm,
    thankYouTopYm: thank.yMm,
    grossTextBaselineYm: measureTotalsGrossTextBaselineYm(totals.yMm),
    brandToSixMm: creative.gaps.brandToSixMm,
  };
  await writeFile(path.join(ARTIFACT_DIR, "swiss-01f4-layout-report.json"), JSON.stringify(report, null, 2));

  console.log("SWISS-01F4 artifacts:", ARTIFACT_DIR);
  console.log("PDF:", pdfPath);
  console.log("Report:", JSON.stringify(report));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

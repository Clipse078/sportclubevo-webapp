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
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  SWISS_PAYMENT_SECTION_HEIGHT_MM,
} from "../lib/billing/invoice-pdf/constants";
import {
  CREATIVE_AREA_HEIGHT_MM,
  HEADER_HEIGHT_MM,
  planInvoiceBodyLayoutRegions,
} from "../lib/billing/invoice-pdf/invoice-design-geometry";
import { mmToPt } from "../lib/billing/invoice-pdf/mm";

const execFileAsync = promisify(execFile);
const ARTIFACT_DIR = "/opt/cursor/artifacts";
/** High resolution for PO pixel review (SWISS-01E4B1). */
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

  const pdfPath = path.join(ARTIFACT_DIR, "sce-swiss-01e-invoice-2026-000002-fixture.pdf");
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
  const fullPrefix = path.join(ARTIFACT_DIR, "swiss-01e4b-a4-full");
  const fullPng = await pdfFirstPageToPng(pdfPath, fullPrefix);

  const { stdout: sizeOut } = await execFileAsync("identify", ["-format", "%w %h", fullPng]);
  const [pageWidthPx, pageHeightPx] = sizeOut.trim().split(/\s+/).map(Number);

  const creativeHeightPx = mmToPx(CREATIVE_AREA_HEIGHT_MM, DPI);
  const paymentHeightPx = mmToPx(SWISS_PAYMENT_SECTION_HEIGHT_MM, DPI);

  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01e4b-creative-area-210x192.png"), {
    x: 0,
    y: 0,
    width: pageWidthPx,
    height: creativeHeightPx,
  });

  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01e4b-payment-section-210x105.png"), {
    x: 0,
    y: pageHeightPx - paymentHeightPx,
    width: pageWidthPx,
    height: paymentHeightPx,
  });

  const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
  const cropRegion = async (regionId: string, filename: string, padMm = 1) => {
    const region = plan.regions.find((entry) => entry.id === regionId);
    if (!region) {
      throw new Error(`Missing region ${regionId}`);
    }
    await cropPng(fullPng, path.join(ARTIFACT_DIR, filename), {
      x: mmToPx(Math.max(0, region.xMm - padMm), DPI),
      y: mmToPx(Math.max(0, region.yMm - padMm), DPI),
      width: mmToPx(region.widthMm + padMm * 2, DPI),
      height: mmToPx(region.heightMm + padMm * 2, DPI),
    });
  };

  await cropPng(fullPng, path.join(ARTIFACT_DIR, "swiss-01e4b-header-crop.png"), {
    x: 0,
    y: 0,
    width: pageWidthPx,
    height: mmToPx(HEADER_HEIGHT_MM + 2, DPI),
  });

  await cropRegion("title", "swiss-01e4b-title-metadata-crop.png", 2);
  await cropRegion("metadata_block", "swiss-01e4b-metadata-crop.png", 1.5);
  await cropRegion("recipient_block", "swiss-01e4b-addresses-crop.png", 3);
  await cropRegion("line_items_table", "swiss-01e4b-table-totals-crop.png", 2);
  await cropRegion("operator_branding_sce", "swiss-01e4b-lower-branding-crop.png", 4);

  await writeFile(
    path.join(ARTIFACT_DIR, "swiss-01e4b-geometry-regions.json"),
    JSON.stringify(plan, null, 2),
  );

  console.log("SWISS-01E4B artifacts:", ARTIFACT_DIR);
  console.log("PDF:", pdfPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

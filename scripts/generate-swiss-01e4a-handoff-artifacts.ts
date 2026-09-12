import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument, rgb } from "pdf-lib";
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
  SWISS_QR_CODE_SIZE_MM,
  SWISS_RECEIPT_WIDTH_MM,
} from "../lib/billing/invoice-pdf/constants";
import {
  CREATIVE_AREA_HEIGHT_MM,
  mmFromPageTopToPdfY,
  planInvoiceBodyLayoutRegions,
} from "../lib/billing/invoice-pdf/invoice-design-geometry";
import { mmToPt } from "../lib/billing/invoice-pdf/mm";

const execFileAsync = promisify(execFile);
const ARTIFACT_DIR = "/opt/cursor/artifacts";

async function generateBaselinePdf(): Promise<string> {
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

async function buildGeometryOverlayPdf(): Promise<Uint8Array> {
  const data = buildFixturePdfDocumentData();
  const plan = planInvoiceBodyLayoutRegions(data);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([mmToPt(A4_WIDTH_MM), mmToPt(A4_HEIGHT_MM)]);
  const pageHeightPt = mmToPt(A4_HEIGHT_MM);

  const gridColor = rgb(0.82, 0.84, 0.88);
  for (let yMm = 0; yMm <= A4_HEIGHT_MM; yMm += 10) {
    const y = mmToPt(mmFromPageTopToPdfY(yMm));
    page.drawLine({
      start: { x: 0, y },
      end: { x: mmToPt(A4_WIDTH_MM), y },
      thickness: yMm % 50 === 0 ? 0.6 : 0.25,
      color: gridColor,
    });
  }
  for (let xMm = 0; xMm <= A4_WIDTH_MM; xMm += 10) {
    const x = mmToPt(xMm);
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: pageHeightPt },
      thickness: xMm % 50 === 0 ? 0.6 : 0.25,
      color: gridColor,
    });
  }

  const boundaryY = mmToPt(mmFromPageTopToPdfY(CREATIVE_AREA_HEIGHT_MM));
  page.drawLine({
    start: { x: 0, y: boundaryY },
    end: { x: mmToPt(A4_WIDTH_MM), y: boundaryY },
    thickness: 1.2,
    color: rgb(0.85, 0.2, 0.2),
  });

  const drawRect = (rect: { xMm: number; yMm: number; widthMm: number; heightMm: number }, stroke: ReturnType<typeof rgb>) => {
    const x = mmToPt(rect.xMm);
    const yTop = mmToPt(mmFromPageTopToPdfY(rect.yMm));
    const height = mmToPt(rect.heightMm);
    page.drawRectangle({
      x,
      y: yTop - height,
      width: mmToPt(rect.widthMm),
      height,
      borderColor: stroke,
      borderWidth: 0.8,
      opacity: 0.15,
      color: stroke,
    });
  };

  drawRect(plan.creativeArea, rgb(0.2, 0.45, 0.85));
  drawRect(plan.paymentSection, rgb(0.85, 0.2, 0.2));
  for (const region of plan.regions) {
    drawRect(region, rgb(0.15, 0.55, 0.25));
  }

  const qrX = SWISS_RECEIPT_WIDTH_MM + 5;
  const qrYFromTop =
    CREATIVE_AREA_HEIGHT_MM +
    (SWISS_PAYMENT_SECTION_HEIGHT_MM - SWISS_QR_CODE_SIZE_MM) / 2 -
    4;
  drawRect(
    {
      xMm: qrX,
      yMm: qrYFromTop,
      widthMm: SWISS_QR_CODE_SIZE_MM,
      heightMm: SWISS_QR_CODE_SIZE_MM,
    },
    rgb(0.6, 0.1, 0.7),
  );

  return pdfDoc.save();
}

async function pdfFirstPageToPng(pdfPath: string, outPrefix: string, dpi = 200): Promise<string> {
  await execFileAsync("pdftoppm", ["-png", "-r", String(dpi), "-f", "1", "-l", "1", pdfPath, outPrefix]);
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

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const pdfPath = await generateBaselinePdf();
  const overlayBytes = await buildGeometryOverlayPdf();
  const overlayPdfPath = path.join(ARTIFACT_DIR, "swiss-01e4a-geometry-overlay.pdf");
  await writeFile(overlayPdfPath, overlayBytes);

  const fullPrefix = path.join(ARTIFACT_DIR, "swiss-01e4a-baseline-a4-full");
  const fullPng = await pdfFirstPageToPng(pdfPath, fullPrefix, 200);

  const overlayPrefix = path.join(ARTIFACT_DIR, "swiss-01e4a-geometry-overlay");
  const overlayPng = await pdfFirstPageToPng(overlayPdfPath, overlayPrefix, 200);

  const dpi = 200;
  const { stdout: sizeOut } = await execFileAsync("identify", [
    "-format",
    "%w %h",
    fullPng,
  ]);
  const [pageWidthPx, pageHeightPx] = sizeOut.trim().split(/\s+/).map(Number);
  const creativeHeightPx = Math.round(CREATIVE_AREA_HEIGHT_MM * (dpi / 25.4));
  const paymentHeightPx = Math.round(SWISS_PAYMENT_SECTION_HEIGHT_MM * (dpi / 25.4));

  await cropPng(
    fullPng,
    path.join(ARTIFACT_DIR, "swiss-01e4a-creative-area-210x192.png"),
    { x: 0, y: 0, width: pageWidthPx, height: creativeHeightPx },
  );

  await cropPng(
    fullPng,
    path.join(ARTIFACT_DIR, "swiss-01e4a-payment-section-210x105.png"),
    { x: 0, y: pageHeightPx - paymentHeightPx, width: pageWidthPx, height: paymentHeightPx },
  );

  await execFileAsync("cp", [fullPng, path.join(ARTIFACT_DIR, "swiss-01e4a-baseline-a4-full.png")]);
  await execFileAsync("cp", [
    overlayPng,
    path.join(ARTIFACT_DIR, "swiss-01e4a-geometry-overlay.png"),
  ]);

  const plan = planInvoiceBodyLayoutRegions(buildFixturePdfDocumentData());
  await writeFile(
    path.join(ARTIFACT_DIR, "swiss-01e4a-geometry-regions.json"),
    JSON.stringify(plan, null, 2),
  );

  console.log("SWISS-01E4A handoff artifacts written to", ARTIFACT_DIR);
  console.log("Baseline PDF:", pdfPath);
  console.log("Full PNG:", fullPng);
  console.log("Overlay PNG:", overlayPng);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

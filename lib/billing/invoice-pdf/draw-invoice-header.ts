import type { PDFDocument, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import { INVOICE_HEADER_RIBBON_ACCENT_PATH, INVOICE_PDF_BRAND } from "./constants";
import {
  HEADER_HEIGHT_MM,
  HEADER_LOGO_HEIGHT_MM,
  HEADER_RIBBON_ACCENT_WIDTH_MM,
  PAGE_MARGIN_X_MM,
} from "./invoice-design-geometry";
import { mmToPt } from "./mm";
import {
  embedLogoIfPresent,
  loadBrandingAsset,
  SPORTCLUBEVO_LOGO_PATH,
} from "./render-swiss-payment-slip";

function brandColor(c: { r: number; g: number; b: number }) {
  return rgb(c.r, c.g, c.b);
}

/**
 * Decorative header artwork (no logos/text). Generated for SWISS-01E2;
 * layered under the SportClubEvo logo on the navy header bar.
 */
async function drawHeaderRibbonArtwork(
  pdfDoc: PDFDocument,
  page: PDFPage,
  pageWidthPt: number,
  headerBottomY: number,
  headerHeightPt: number,
): Promise<void> {
  const bytes = await loadBrandingAsset(INVOICE_HEADER_RIBBON_ACCENT_PATH);
  if (!bytes) {
    drawHeaderRibbonAccentVector(page, pageWidthPt, headerBottomY, headerHeightPt);
    return;
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const image = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
  const accentWidth = mmToPt(HEADER_RIBBON_ACCENT_WIDTH_MM);
  const scale = accentWidth / image.width;
  const accentHeight = image.height * scale;
  const drawHeight = Math.min(accentHeight, headerHeightPt);
  const drawWidth = (drawHeight / accentHeight) * accentWidth;

  page.drawImage(image, {
    x: pageWidthPt - drawWidth,
    y: headerBottomY + (headerHeightPt - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
    opacity: 0.92,
  });
}

/** Fallback vector ribbons if artwork asset is missing. */
function drawHeaderRibbonAccentVector(
  page: PDFPage,
  pageWidthPt: number,
  headerBottomY: number,
  headerHeightPt: number,
): void {
  const burnt = rgb(0.68, 0.32, 0.1);
  const vivid = brandColor(INVOICE_PDF_BRAND.orange);
  const highlight = rgb(0.99, 0.68, 0.38);
  const originX = pageWidthPt - mmToPt(102);
  const originY = headerBottomY + mmToPt(1);
  const scale = mmToPt(0.105);

  page.drawSvgPath(
    `M 0 52
     C 28 44, 52 22, 88 26
     C 118 30, 142 12, 178 18
     C 208 24, 232 40, 268 28
     L 268 44
     C 232 56, 208 40, 178 36
     C 142 30, 118 48, 88 44
     C 52 40, 28 62, 0 68 Z`,
    {
      x: originX,
      y: originY,
      scale,
      color: burnt,
      opacity: 0.2,
      borderWidth: 0,
    },
  );

  page.drawSvgPath(
    `M 0 38
     C 32 24, 58 40, 96 32
     C 132 24, 162 42, 204 34
     C 236 28, 258 46, 290 36
     L 290 50
     C 258 60, 236 42, 204 48
     C 162 56, 132 38, 96 46
     C 58 54, 32 38, 0 52 Z`,
    {
      x: originX + mmToPt(4),
      y: originY + mmToPt(2),
      scale,
      color: vivid,
      opacity: 0.34,
      borderWidth: 0,
    },
  );

  page.drawSvgPath(
    `M 0 28 C 36 14, 72 32, 108 24 C 148 16, 188 34, 228 26 C 258 20, 282 32, 310 24`,
    {
      x: originX + mmToPt(8),
      y: originY + mmToPt(5),
      scale,
      borderColor: highlight,
      borderWidth: 0.9,
      opacity: 0.45,
    },
  );
}

export async function drawSportClubEvoInvoiceHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  pageWidthPt: number,
  pageHeightPt: number,
): Promise<number> {
  const headerHeightPt = mmToPt(HEADER_HEIGHT_MM);
  const headerBottomY = pageHeightPt - headerHeightPt;

  page.drawRectangle({
    x: 0,
    y: headerBottomY,
    width: pageWidthPt,
    height: headerHeightPt,
    color: brandColor(INVOICE_PDF_BRAND.headerNavy),
  });

  await drawHeaderRibbonArtwork(pdfDoc, page, pageWidthPt, headerBottomY, headerHeightPt);

  const fontBold = await pdfDoc.embedFont("Helvetica-Bold");
  const logo = await embedLogoIfPresent(pdfDoc, SPORTCLUBEVO_LOGO_PATH);
  const margin = mmToPt(PAGE_MARGIN_X_MM);

  if (logo) {
    const logoHeight = mmToPt(HEADER_LOGO_HEIGHT_MM);
    const scale = logoHeight / logo.height;
    const logoWidth = logo.width * scale;
    page.drawImage(logo, {
      x: margin,
      y: headerBottomY + (headerHeightPt - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
    });
  } else {
    page.drawText("SportClubEvo", {
      x: margin,
      y: headerBottomY + mmToPt(10),
      size: 17,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  return headerBottomY;
}

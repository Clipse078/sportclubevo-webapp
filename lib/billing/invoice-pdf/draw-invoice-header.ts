import type { PDFDocument, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import { INVOICE_PDF_BRAND, SPORTCLUBEVO_HEADER_LOGO_PATH } from "./constants";
import {
  HEADER_HEIGHT_MM,
  HEADER_LOGO_WIDTH_MM,
  HEADER_LOGO_X_MM,
} from "./invoice-design-geometry";
import { mmToPt } from "./mm";
import { embedLogoIfPresent } from "./render-swiss-payment-slip";

function brandColor(c: { r: number; g: number; b: number }) {
  return rgb(c.r, c.g, c.b);
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

  const fontBold = await pdfDoc.embedFont("Helvetica-Bold");
  const logo = await embedLogoIfPresent(pdfDoc, SPORTCLUBEVO_HEADER_LOGO_PATH);
  const logoX = mmToPt(HEADER_LOGO_X_MM);

  if (logo) {
    const logoWidthPt = mmToPt(HEADER_LOGO_WIDTH_MM);
    const scale = logoWidthPt / logo.width;
    const logoHeightPt = logo.height * scale;
    page.drawImage(logo, {
      x: logoX,
      y: headerBottomY + (headerHeightPt - logoHeightPt) / 2,
      width: logoWidthPt,
      height: logoHeightPt,
    });
  } else {
    page.drawText("SportClubEvo", {
      x: logoX,
      y: headerBottomY + mmToPt(6),
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  }

  return headerBottomY;
}

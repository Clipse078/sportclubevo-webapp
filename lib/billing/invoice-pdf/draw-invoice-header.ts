import type { PDFDocument, PDFPage } from "pdf-lib";
import { rgb } from "pdf-lib";
import { INVOICE_PDF_BRAND } from "./constants";
import { INVOICE_HEADER_HEIGHT_MM, INVOICE_SIDE_MARGIN_MM } from "./invoice-layout";
import { mmToPt } from "./mm";
import { embedLogoIfPresent, SPORTCLUBEVO_LOGO_PATH } from "./render-swiss-payment-slip";

function brandColor(c: { r: number; g: number; b: number }) {
  return rgb(c.r, c.g, c.b);
}

export async function drawSportClubEvoInvoiceHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  pageWidthPt: number,
  pageHeightPt: number,
): Promise<number> {
  const headerHeightPt = mmToPt(INVOICE_HEADER_HEIGHT_MM);
  const headerBottomY = pageHeightPt - headerHeightPt;

  page.drawRectangle({
    x: 0,
    y: headerBottomY,
    width: pageWidthPt,
    height: headerHeightPt,
    color: brandColor(INVOICE_PDF_BRAND.headerNavy),
  });

  drawHeaderRibbonAccent(page, pageWidthPt, headerBottomY, headerHeightPt);

  const fontBold = await pdfDoc.embedFont("Helvetica-Bold");
  const logo = await embedLogoIfPresent(pdfDoc, SPORTCLUBEVO_LOGO_PATH);
  const margin = mmToPt(INVOICE_SIDE_MARGIN_MM);

  if (logo) {
    const logoHeight = mmToPt(16);
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

function drawHeaderRibbonAccent(
  page: PDFPage,
  pageWidthPt: number,
  headerBottomY: number,
  headerHeightPt: number,
): void {
  const orange = brandColor(INVOICE_PDF_BRAND.orange);
  const orangeSoft = rgb(0.96, 0.55, 0.28);

  page.drawSvgPath(
    "M 0 0 C 35 8, 55 2, 90 18 L 90 0 Z",
    {
      x: pageWidthPt - mmToPt(62),
      y: headerBottomY + headerHeightPt * 0.55,
      scale: mmToPt(0.42),
      color: orange,
      opacity: 0.5,
      borderWidth: 0,
    },
  );

  page.drawSvgPath(
    "M 0 5 C 40 28, 70 8, 110 35 L 110 0 Z",
    {
      x: pageWidthPt - mmToPt(78),
      y: headerBottomY + headerHeightPt * 0.35,
      scale: mmToPt(0.38),
      color: orangeSoft,
      opacity: 0.35,
      borderWidth: 0,
    },
  );

  page.drawSvgPath(
    "M 0 0 C 20 12, 45 6, 65 22 L 65 8 Z",
    {
      x: pageWidthPt - mmToPt(48),
      y: headerBottomY + headerHeightPt * 0.15,
      scale: mmToPt(0.3),
      color: orange,
      opacity: 0.28,
      borderWidth: 0,
    },
  );
}

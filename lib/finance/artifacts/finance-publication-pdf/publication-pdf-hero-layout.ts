import { mmToPt } from "@/lib/billing/invoice-pdf/mm";

/** Vertical band in PDF coordinates (yTop > yBottom). */
export type PublicationPdfVerticalBand = {
  yTop: number;
  yBottom: number;
};

export type PublicationPdfHeroLayoutBands = {
  label: PublicationPdfVerticalBand;
  value: PublicationPdfVerticalBand;
  variance: PublicationPdfVerticalBand;
  supporting: PublicationPdfVerticalBand;
};

const HERO_HEIGHT_MM = 42;
const PADDING_TOP_MM = 6;
const LABEL_BAND_MM = 5;
const VALUE_BAND_MM = 11;
const VARIANCE_BAND_MM = 7;
const SUPPORTING_BAND_MM = 10;
const PADDING_BOTTOM_MM = 3;

export function publicationPdfHeroHeightPt(): number {
  return mmToPt(HERO_HEIGHT_MM);
}

export function computePublicationPdfHeroLayoutBands(heroTopY: number): PublicationPdfHeroLayoutBands {
  const heroHeightPt = publicationPdfHeroHeightPt();
  const heroBottomY = heroTopY - heroHeightPt;
  let cursor = heroTopY - mmToPt(PADDING_TOP_MM);

  const labelBottom = cursor - mmToPt(LABEL_BAND_MM);
  const label: PublicationPdfVerticalBand = { yTop: cursor, yBottom: labelBottom };
  cursor = labelBottom;

  const valueBottom = cursor - mmToPt(VALUE_BAND_MM);
  const value: PublicationPdfVerticalBand = { yTop: cursor, yBottom: valueBottom };
  cursor = valueBottom;

  const varianceBottom = cursor - mmToPt(VARIANCE_BAND_MM);
  const variance: PublicationPdfVerticalBand = { yTop: cursor, yBottom: varianceBottom };
  cursor = varianceBottom;

  const supportingTop = heroBottomY + mmToPt(PADDING_BOTTOM_MM + SUPPORTING_BAND_MM);
  const supporting: PublicationPdfVerticalBand = {
    yTop: supportingTop,
    yBottom: heroBottomY + mmToPt(PADDING_BOTTOM_MM),
  };

  return { label, value, variance, supporting };
}

function bandsOverlap(a: PublicationPdfVerticalBand, b: PublicationPdfVerticalBand): boolean {
  return a.yBottom < b.yTop && b.yBottom < a.yTop;
}

export function publicationPdfHeroBandsNonOverlapping(bands: PublicationPdfHeroLayoutBands): boolean {
  const ordered = [bands.label, bands.value, bands.variance, bands.supporting];
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      if (bandsOverlap(ordered[i]!, ordered[j]!)) {
        return false;
      }
    }
  }
  return bands.label.yTop > bands.supporting.yTop;
}

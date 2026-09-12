/**
 * SWISS-01E4C3 — deterministic creative-area vertical flow (page-top Y, mm downward).
 */

import type { InvoicePdfDocumentData } from "./invoice-pdf-types";
import {
  ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM,
  ADDRESS_GRID_COLUMN_GAP_MM,
  ADDRESS_SECTION_LABEL_STEP_MM,
  CREATIVE_AREA_HEIGHT_MM,
  FOOTER_BRAND_DIVIDER_GAP_MM,
  FOOTER_BRAND_LOGO_GAP_MM,
  FOOTER_BRAND_ROW_BOTTOM_Y_MM,
  FOOTER_SCE_LOGO_HEIGHT_MM,
  IDENTITY_TOP_Y_MM,
  INNER_CONTENT_WIDTH_MM,
  METADATA_BLOCK_WIDTH_MM,
  METADATA_LEFT_X_MM,
  METADATA_STACK_TOP_Y_MM,
  MIN_PAYMENT_BREATHING_ROOM_MM,
  PAGE_MARGIN_X_MM,
  PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM,
  TABLE_HEADER_ROW_HEIGHT_MM,
  TABLE_ROW_HEIGHT_MULTI_MM,
  TABLE_ROW_HEIGHT_SINGLE_MM,
  TITLE_TOP_Y_MM,
  TOTALS_AFTER_BLOCK_GAP_MM,
  splitLineDescription,
} from "./invoice-design-geometry";
import {
  planAddressBlockLayout,
  type PlannedAddressBlockLayout,
} from "./invoice-address-layout";
import {
  fontAscentMm,
  gapBetweenInkMm,
  inkExtentsFromBaselineMm,
} from "./invoice-font-metrics";
import {
  TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM,
  TOTALS_GROSS_TEXT_INSET_MM,
  TOTALS_NET_ROW_STEP_MM,
  TOTALS_VAT_TO_GROSS_GAP_MM,
} from "./invoice-totals-layout";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
} from "../native-billing-presentation";
import { computeTulipVisibleDrawSizeMm } from "./tulip-logo-visible-bounds";

export type LayoutRegionMm = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  bottomYMm: number;
  note?: string;
};

export type InvoiceCreativeLayoutPlan = {
  regions: LayoutRegionMm[];
  metadataGroups: MetadataGroupPlan[];
  addressLayout: PlannedAddressBlockLayout;
  gaps: {
    metadataToAddressesMm: number;
    addressesToTableMm: number;
    tableToTotalsMm: number;
    totalsToThankYouMm: number;
    thankYouToBrandMm: number;
    brandToSixMm: number;
  };
};

export type MetadataGroupPlan = {
  label: string;
  value: string;
  labelBaselineYMm: number;
  valueBaselineYMm: number;
  topYMm: number;
  bottomYMm: number;
  labelToValueGapMm: number;
  valueToNextLabelGapMm: number | null;
};

export const METADATA_LABEL_FONT_PT = 8;
export const METADATA_VALUE_FONT_PT = 10.5;
export const INVOICE_NUMBER_LABEL_FONT_PT = 8;
export const INVOICE_NUMBER_VALUE_FONT_PT = 15;

export const METADATA_INTRA_GROUP_INK_GAP_MM = 3.5;
export const METADATA_INTER_GROUP_INK_GAP_MM = 3.5;
export const METADATA_INTER_GROUP_INK_GAP_MIN_MM = 3.0;
export const METADATA_INTRA_GROUP_INK_GAP_MIN_MM = 3.0;
export const METADATA_TO_ADDRESS_INK_GAP_MM = 7;
export const METADATA_TO_ADDRESS_INK_GAP_MIN_MM = 6.0;
export const ADDRESS_TO_TABLE_INK_GAP_MM = 7;
export const ADDRESS_TO_TABLE_INK_GAP_MIN_MM = 4;
export const TABLE_TO_TOTALS_INK_GAP_MM = 3;
export const TOTALS_TO_THANKYOU_INK_GAP_MM = 6;
export const THANKYOU_TO_BRAND_INK_GAP_MM = 5;

export const DESIGN_MIN_ADDRESS_TOP_Y_MM = 72;
export const DESIGN_MIN_TABLE_TOP_Y_MM = 100;

/** Matches {@link render-invoice-document} totals block (page-top Y). */
export const TOTALS_BLOCK_TOP_CONTENT_OFFSET_MM = 4;
export const TOTALS_HIGHLIGHT_EXTRA_OFFSET_MM = 1.5;

const ACKNOWLEDGEMENT_TEXT_FONT_PT = 10.5;

/** Matches {@link render-invoice-document} thank-you text baseline offset from accent bar top. */
export const THANKYOU_TEXT_BASELINE_OFFSET_FROM_BAR_TOP_MM = 2;

function sceFooterLogoWidthMm(): number {
  return FOOTER_SCE_LOGO_HEIGHT_MM * (937 / 204);
}

export class InvoiceCreativeLayoutOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceCreativeLayoutOverflowError";
  }
}

function lineRowHeightMm(line: InvoicePdfDocumentData["lines"][number]): number {
  const split = splitLineDescription(line.description);
  return split.secondaryFromData ? TABLE_ROW_HEIGHT_MULTI_MM : TABLE_ROW_HEIGHT_SINGLE_MM;
}

export function measureTableHeightMm(data: InvoicePdfDocumentData): number {
  let h = TABLE_HEADER_ROW_HEIGHT_MM + 1;
  for (const line of data.lines) {
    h += lineRowHeightMm(line);
  }
  return h;
}

/** Bottom Y of rendered totals ink (matches PDF renderer). */
export function measureTotalsInkBottomYm(totalsBlockTopYm: number): number {
  const firstBaselineYm = totalsBlockTopYm + TOTALS_BLOCK_TOP_CONTENT_OFFSET_MM;
  const vatBaselineYm = firstBaselineYm + TOTALS_NET_ROW_STEP_MM;
  return (
    vatBaselineYm +
    TOTALS_VAT_TO_GROSS_GAP_MM +
    TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM +
    TOTALS_HIGHLIGHT_EXTRA_OFFSET_MM
  );
}

/** Gross highlight band (page-top Y, mm downward) — matches PDF totals renderer. */
export function measureTotalsGrossHighlightBandYm(totalsBlockTopYm: number): {
  topYm: number;
  bottomYm: number;
  centerYm: number;
} {
  const firstBaselineYm = totalsBlockTopYm + TOTALS_BLOCK_TOP_CONTENT_OFFSET_MM;
  const vatBaselineYm = firstBaselineYm + TOTALS_NET_ROW_STEP_MM;
  const topYm = vatBaselineYm + TOTALS_VAT_TO_GROSS_GAP_MM;
  const bottomYm = topYm + TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM;
  return { topYm, bottomYm, centerYm: (topYm + bottomYm) / 2 };
}

/** Primary "Total brutto" text baseline (page-top Y). */
export function measureTotalsGrossTextBaselineYm(totalsBlockTopYm: number): number {
  const { bottomYm } = measureTotalsGrossHighlightBandYm(totalsBlockTopYm);
  return bottomYm - TOTALS_GROSS_TEXT_INSET_MM;
}

export function planThankYouTopYmForGrossBandAlignment(totalsBlockTopYm: number): number {
  return (
    measureTotalsGrossTextBaselineYm(totalsBlockTopYm) -
    THANKYOU_TEXT_BASELINE_OFFSET_FROM_BAR_TOP_MM
  );
}

/** Thank-you region top Y is the accent bar top (page-top). */
export function measureThankYouInkBottomYm(thankYouTopYm: number): number {
  const barBottomYm = thankYouTopYm + ACKNOWLEDGEMENT_ACCENT_BAR_HEIGHT_MM;
  const textBaselineYm = thankYouTopYm + THANKYOU_TEXT_BASELINE_OFFSET_FROM_BAR_TOP_MM;
  const textInk = inkExtentsFromBaselineMm(textBaselineYm, ACKNOWLEDGEMENT_TEXT_FONT_PT);
  return Math.max(barBottomYm, textInk.bottomYMm);
}

export function measureThankYouBlockHeightMm(thankYouTopYm: number): number {
  return measureThankYouInkBottomYm(thankYouTopYm) - thankYouTopYm;
}

function maxTableBottomYmForFooter(brandRowTopYm: number): number {
  const totalsSpanMm = measureTotalsContentSpanMm();
  return (
    brandRowTopYm -
    THANKYOU_TO_BRAND_INK_GAP_MM -
    totalsSpanMm -
    TABLE_TO_TOTALS_INK_GAP_MM
  );
}

function measureTotalsContentSpanMm(): number {
  const dummyTop = 0;
  return measureTotalsInkBottomYm(dummyTop) - dummyTop;
}

export function planMetadataGroups(data: InvoicePdfDocumentData): MetadataGroupPlan[] {
  return planMetadataGroupsWithGap(data, METADATA_INTER_GROUP_INK_GAP_MM);
}

function invoiceNumberHeroBottomYm(): number {
  const valueBaselineYm = IDENTITY_TOP_Y_MM + 8;
  return inkExtentsFromBaselineMm(valueBaselineYm, INVOICE_NUMBER_VALUE_FONT_PT).bottomYMm;
}

function planMetadataGroupsWithGap(
  data: InvoicePdfDocumentData,
  interGroupInkGapMm: number,
  intraGroupInkGapMm: number = METADATA_INTRA_GROUP_INK_GAP_MM,
): MetadataGroupPlan[] {
  const rows: Array<[string, string]> = [
    ["Rechnungsdatum", formatBillingDateDisplay(data.invoice.invoiceDate)],
    ["Fällig am", formatBillingDateDisplay(data.invoice.dueDate)],
    [
      "Leistungszeitraum",
      formatBillingPeriodDisplay(data.invoice.periodStart, data.invoice.periodEnd),
    ],
    [
      "Zahlungsziel",
      data.invoice.paymentTermsDays != null ? `${data.invoice.paymentTermsDays} Tage` : "—",
    ],
  ];

  let groupTopYMm = Math.max(
    METADATA_STACK_TOP_Y_MM,
    invoiceNumberHeroBottomYm() + METADATA_INTRA_GROUP_INK_GAP_MM,
  );
  const groups: MetadataGroupPlan[] = [];

  for (let index = 0; index < rows.length; index++) {
    const [label, value] = rows[index]!;
    const labelBaselineYMm = groupTopYMm + fontAscentMm(METADATA_LABEL_FONT_PT);
    const labelInk = inkExtentsFromBaselineMm(labelBaselineYMm, METADATA_LABEL_FONT_PT);
    const valueBaselineYMm =
      labelInk.bottomYMm + intraGroupInkGapMm + fontAscentMm(METADATA_VALUE_FONT_PT);
    const valueInk = inkExtentsFromBaselineMm(valueBaselineYMm, METADATA_VALUE_FONT_PT);

    const nextTop =
      index < rows.length - 1 ? valueInk.bottomYMm + interGroupInkGapMm : null;

    groups.push({
      label,
      value,
      labelBaselineYMm,
      valueBaselineYMm,
      topYMm: labelInk.topYMm,
      bottomYMm: valueInk.bottomYMm,
      labelToValueGapMm: gapBetweenInkMm(labelInk.bottomYMm, valueInk.topYMm),
      valueToNextLabelGapMm:
        nextTop == null ? null : gapBetweenInkMm(valueInk.bottomYMm, nextTop),
    });

    if (nextTop != null) {
      groupTopYMm = nextTop;
    }
  }

  return groups;
}

export function estimateOverflowCreativeHeightMm(data: InvoicePdfDocumentData): number {
  return DESIGN_MIN_TABLE_TOP_Y_MM + measureTableHeightMm(data) + 75;
}

export function tryPlanInvoiceCreativeLayout(
  data: InvoicePdfDocumentData,
): InvoiceCreativeLayoutPlan | null {
  try {
    return planInvoiceCreativeLayout(data);
  } catch (error) {
    if (error instanceof InvoiceCreativeLayoutOverflowError) {
      return null;
    }
    throw error;
  }
}

export function planInvoiceCreativeLayout(data: InvoicePdfDocumentData): InvoiceCreativeLayoutPlan {
  const recipientLines = buildRecipientLines(data);
  const issuerLines = buildIssuerLines(data);

  const tableHeightMm = measureTableHeightMm(data);
  const tulip = computeTulipVisibleDrawSizeMm();
  const brandRowHeightMm = Math.max(FOOTER_SCE_LOGO_HEIGHT_MM, tulip.visibleHeightMm);
  const brandRowBottomYMm = FOOTER_BRAND_ROW_BOTTOM_Y_MM;
  const brandRowTopYMm = brandRowBottomYMm - brandRowHeightMm;

  let metadataInterGroupGapMm = METADATA_INTER_GROUP_INK_GAP_MM;
  let metadataIntraGroupGapMm = METADATA_INTRA_GROUP_INK_GAP_MM;
  let metadataToAddressGapMm = METADATA_TO_ADDRESS_INK_GAP_MM;
  let addressLabelToBodyGapMm = ADDRESS_SECTION_LABEL_STEP_MM;
  let addressToTableGapMm = ADDRESS_TO_TABLE_INK_GAP_MM;

  let metadataGroups = planMetadataGroupsWithGap(
    data,
    metadataInterGroupGapMm,
    metadataIntraGroupGapMm,
  );
  let metadataBottomYMm = metadataGroups[metadataGroups.length - 1]!.bottomYMm;
  let addressTopYMm = Math.max(DESIGN_MIN_ADDRESS_TOP_Y_MM, metadataBottomYMm + metadataToAddressGapMm);
  let addressLayout!: PlannedAddressBlockLayout;

  let tableTopYMm = 0;
  let tableBottomYMm = 0;
  let totalsTopYMm = 0;
  let totalsBottomYMm = 0;
  let thankYouTopYMm = 0;
  let thankYouBottomYMm = 0;

  const maxTableBottomYm = maxTableBottomYmForFooter(brandRowTopYMm);

  for (let attempt = 0; attempt < 40; attempt++) {
    metadataGroups = planMetadataGroupsWithGap(
      data,
      metadataInterGroupGapMm,
      metadataIntraGroupGapMm,
    );
    metadataBottomYMm = metadataGroups[metadataGroups.length - 1]!.bottomYMm;
    addressTopYMm = Math.max(DESIGN_MIN_ADDRESS_TOP_Y_MM, metadataBottomYMm + metadataToAddressGapMm);
    const maxTableTopFromFooterYm = maxTableBottomYm - tableHeightMm;
    try {
      addressLayout = planAddressBlockLayout({
        labelBaselineYm: addressTopYMm,
        labelToBodyGapMm: addressLabelToBodyGapMm,
        recipientLineCount: recipientLines.length,
        issuerLineCount: issuerLines.length,
        maxIssuerInkBottomYm: maxTableTopFromFooterYm - addressToTableGapMm,
      });
    } catch {
      if (addressToTableGapMm > ADDRESS_TO_TABLE_INK_GAP_MIN_MM + 0.01) {
        addressToTableGapMm = Math.max(ADDRESS_TO_TABLE_INK_GAP_MIN_MM, addressToTableGapMm - 0.5);
        continue;
      }
      throw new InvoiceCreativeLayoutOverflowError(
        "Invoice creative layout does not fit in the 210×192 mm area for this document.",
      );
    }

    const minTableTopFromAddressYm =
      addressLayout.sectionInkBottomYMm + addressToTableGapMm;

    tableTopYMm = Math.max(DESIGN_MIN_TABLE_TOP_Y_MM, minTableTopFromAddressYm);
    if (tableTopYMm > maxTableTopFromFooterYm + 0.01) {
      tableTopYMm = maxTableTopFromFooterYm;
    }

    tableBottomYMm = tableTopYMm + tableHeightMm;
    totalsTopYMm = tableBottomYMm + TABLE_TO_TOTALS_INK_GAP_MM;
    totalsBottomYMm = measureTotalsInkBottomYm(totalsTopYMm);
    thankYouTopYMm = planThankYouTopYmForGrossBandAlignment(totalsTopYMm);
    thankYouBottomYMm = measureThankYouInkBottomYm(thankYouTopYMm);

    const addressOk = tableTopYMm + 0.01 >= minTableTopFromAddressYm;
    const footerOk =
      totalsBottomYMm + THANKYOU_TO_BRAND_INK_GAP_MM <= brandRowTopYMm + 0.01 &&
      tableBottomYMm <= maxTableBottomYm + 0.01 &&
      thankYouTopYMm + 0.01 >= totalsTopYMm &&
      thankYouBottomYMm <= totalsBottomYMm + 0.01 &&
      thankYouBottomYMm + THANKYOU_TO_BRAND_INK_GAP_MM <= brandRowTopYMm + 0.01;

    if (addressOk && footerOk) {
      break;
    }

    if (addressToTableGapMm > ADDRESS_TO_TABLE_INK_GAP_MIN_MM + 0.01) {
      addressToTableGapMm = Math.max(ADDRESS_TO_TABLE_INK_GAP_MIN_MM, addressToTableGapMm - 0.5);
      continue;
    }
    if (addressLabelToBodyGapMm > ADDRESS_SECTION_LABEL_STEP_MM - 1 + 0.01) {
      addressLabelToBodyGapMm = Math.max(
        ADDRESS_SECTION_LABEL_STEP_MM - 1,
        addressLabelToBodyGapMm - 0.25,
      );
      continue;
    }
    if (metadataIntraGroupGapMm > METADATA_INTRA_GROUP_INK_GAP_MIN_MM + 0.01) {
      metadataIntraGroupGapMm = Math.max(
        METADATA_INTRA_GROUP_INK_GAP_MIN_MM,
        metadataIntraGroupGapMm - 0.25,
      );
      continue;
    }
    if (metadataInterGroupGapMm > METADATA_INTER_GROUP_INK_GAP_MIN_MM + 0.01) {
      metadataInterGroupGapMm = Math.max(METADATA_INTER_GROUP_INK_GAP_MIN_MM, metadataInterGroupGapMm - 0.25);
      continue;
    }
    if (metadataToAddressGapMm > METADATA_TO_ADDRESS_INK_GAP_MIN_MM + 0.01) {
      metadataToAddressGapMm = Math.max(
        METADATA_TO_ADDRESS_INK_GAP_MIN_MM,
        metadataToAddressGapMm - 0.25,
      );
      continue;
    }

    throw new InvoiceCreativeLayoutOverflowError(
      "Invoice creative layout does not fit in the 210×192 mm area for this document.",
    );
  }

  const brandToSixMm = PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM - brandRowBottomYMm;
  const totalsHeightMm = totalsBottomYMm - totalsTopYMm;
  const thankYouHeightMm = thankYouBottomYMm - thankYouTopYMm;

  const regions: LayoutRegionMm[] = [];

  regions.push({
    id: "title",
    xMm: PAGE_MARGIN_X_MM,
    yMm: TITLE_TOP_Y_MM,
    widthMm: INNER_CONTENT_WIDTH_MM * 0.45,
    heightMm: 12,
    bottomYMm: TITLE_TOP_Y_MM + 12,
  });

  regions.push({
    id: "invoice_number_hero",
    xMm: METADATA_LEFT_X_MM,
    yMm: IDENTITY_TOP_Y_MM,
    widthMm: METADATA_BLOCK_WIDTH_MM,
    heightMm: invoiceNumberHeroBottomYm() - IDENTITY_TOP_Y_MM,
    bottomYMm: invoiceNumberHeroBottomYm(),
  });

  regions.push({
    id: "metadata_block",
    xMm: METADATA_LEFT_X_MM,
    yMm: metadataGroups[0]?.topYMm ?? METADATA_STACK_TOP_Y_MM,
    widthMm: METADATA_BLOCK_WIDTH_MM,
    heightMm: metadataBottomYMm - (metadataGroups[0]?.topYMm ?? METADATA_STACK_TOP_Y_MM),
    bottomYMm: metadataBottomYMm,
  });

  const colWidth = (INNER_CONTENT_WIDTH_MM - ADDRESS_GRID_COLUMN_GAP_MM) / 2;
  regions.push({
    id: "address_labels",
    xMm: PAGE_MARGIN_X_MM,
    yMm: addressTopYMm,
    widthMm: INNER_CONTENT_WIDTH_MM,
    heightMm: addressLayout.sharedBodyFirstBaselineYMm - addressTopYMm,
    bottomYMm: addressLayout.sharedBodyFirstBaselineYMm,
  });
  regions.push({
    id: "recipient_block",
    xMm: PAGE_MARGIN_X_MM,
    yMm: addressLayout.sharedBodyFirstBaselineYMm,
    widthMm: colWidth,
    heightMm: addressLayout.recipient.inkBottomYMm - addressLayout.sharedBodyFirstBaselineYMm,
    bottomYMm: addressLayout.recipient.inkBottomYMm,
  });
  regions.push({
    id: "issuer_block",
    xMm: PAGE_MARGIN_X_MM + colWidth + ADDRESS_GRID_COLUMN_GAP_MM,
    yMm: addressLayout.sharedBodyFirstBaselineYMm,
    widthMm: colWidth,
    heightMm: addressLayout.issuer.inkBottomYMm - addressLayout.sharedBodyFirstBaselineYMm,
    bottomYMm: addressLayout.issuer.inkBottomYMm,
  });

  regions.push({
    id: "line_items_table",
    xMm: PAGE_MARGIN_X_MM,
    yMm: tableTopYMm,
    widthMm: INNER_CONTENT_WIDTH_MM,
    heightMm: tableHeightMm,
    bottomYMm: tableBottomYMm,
  });

  regions.push({
    id: "totals_block",
    xMm: PAGE_MARGIN_X_MM + INNER_CONTENT_WIDTH_MM - 52,
    yMm: totalsTopYMm,
    widthMm: 52,
    heightMm: totalsHeightMm,
    bottomYMm: totalsBottomYMm,
  });

  regions.push({
    id: "acknowledgement",
    xMm: PAGE_MARGIN_X_MM,
    yMm: thankYouTopYMm,
    widthMm: INNER_CONTENT_WIDTH_MM * 0.55,
    heightMm: thankYouHeightMm,
    bottomYMm: thankYouBottomYMm,
  });

  const tulipX =
    PAGE_MARGIN_X_MM +
    sceFooterLogoWidthMm() +
    FOOTER_BRAND_LOGO_GAP_MM +
    FOOTER_BRAND_DIVIDER_GAP_MM +
    FOOTER_BRAND_DIVIDER_GAP_MM;

  regions.push({
    id: "operator_brand_row",
    xMm: PAGE_MARGIN_X_MM,
    yMm: brandRowTopYMm,
    widthMm: INNER_CONTENT_WIDTH_MM * 0.75,
    heightMm: brandRowHeightMm,
    bottomYMm: brandRowBottomYMm,
  });
  regions.push({
    id: "operator_branding_sce",
    xMm: PAGE_MARGIN_X_MM,
    yMm: brandRowBottomYMm - FOOTER_SCE_LOGO_HEIGHT_MM,
    widthMm: sceFooterLogoWidthMm(),
    heightMm: FOOTER_SCE_LOGO_HEIGHT_MM,
    bottomYMm: brandRowBottomYMm,
  });
  regions.push({
    id: "operator_branding_tulip",
    xMm: tulipX,
    yMm: brandRowBottomYMm - tulip.visibleHeightMm,
    widthMm: tulip.visibleWidthMm,
    heightMm: tulip.visibleHeightMm,
    bottomYMm: brandRowBottomYMm,
  });

  return {
    regions,
    metadataGroups,
    addressLayout,
    gaps: {
      metadataToAddressesMm: gapBetweenInkMm(metadataBottomYMm, addressTopYMm),
      addressesToTableMm: gapBetweenInkMm(addressLayout.sectionInkBottomYMm, tableTopYMm),
      tableToTotalsMm: gapBetweenInkMm(tableBottomYMm, totalsTopYMm),
      totalsToThankYouMm: thankYouTopYMm >= totalsBottomYMm
        ? gapBetweenInkMm(totalsBottomYMm, thankYouTopYMm)
        : 0,
      thankYouToBrandMm: gapBetweenInkMm(thankYouBottomYMm, brandRowTopYMm),
      brandToSixMm: brandToSixMm,
    },
  };
}

function buildRecipientLines(data: InvoicePdfDocumentData): string[] {
  return [
    data.recipient.companyOrName,
    data.recipient.houseNumber
      ? `${data.recipient.street} ${data.recipient.houseNumber}`
      : data.recipient.street,
    `${data.recipient.postalCode} ${data.recipient.city}`,
    data.recipient.countryCode,
  ];
}

function buildIssuerLines(data: InvoicePdfDocumentData): string[] {
  const lines = [
    data.issuer.displayName,
    data.issuer.legalName,
    data.issuer.houseNumber
      ? `${data.issuer.addressLine1} ${data.issuer.houseNumber}`
      : data.issuer.addressLine1,
    `${data.issuer.postalCode} ${data.issuer.city}`,
    data.issuer.countryCode,
  ];
  if (data.issuer.uid) {
    lines.push(`UID: ${data.issuer.uid}`);
  }
  if (data.issuer.vatId) {
    lines.push(`MWST-Nr.: ${data.issuer.vatId}`);
  }
  return lines;
}

export function assertCreativeLayoutNoCollisions(plan: InvoiceCreativeLayoutPlan): void {
  const byId = (id: string) => {
    const region = plan.regions.find((entry) => entry.id === id);
    if (!region) {
      throw new Error(`Missing region ${id}`);
    }
    return region;
  };

  const meta = byId("metadata_block");
  const invoiceHero = byId("invoice_number_hero");
  const addr = byId("address_labels");
  const table = byId("line_items_table");
  const totals = byId("totals_block");
  const thank = byId("acknowledgement");
  const brand = byId("operator_brand_row");

  if (invoiceHero.bottomYMm + METADATA_INTRA_GROUP_INK_GAP_MIN_MM - 0.01 > meta.yMm) {
    throw new Error("invoice number/metadata collision");
  }
  if (meta.bottomYMm + METADATA_TO_ADDRESS_INK_GAP_MIN_MM - 0.01 > addr.yMm) {
    throw new Error("metadata/address collision");
  }
  if (
    plan.addressLayout.sectionInkBottomYMm + ADDRESS_TO_TABLE_INK_GAP_MIN_MM - 0.01 >
    table.yMm
  ) {
    throw new Error("address/table collision");
  }
  if (table.bottomYMm + TABLE_TO_TOTALS_INK_GAP_MM - 0.01 > totals.yMm) {
    throw new Error("table/totals collision");
  }
  if (thank.yMm + 0.01 < totals.yMm) {
    throw new Error("thank-you above totals block");
  }
  if (thank.bottomYMm > totals.bottomYMm + 0.01) {
    throw new Error("thank-you extends below totals block");
  }
  if (totals.bottomYMm + THANKYOU_TO_BRAND_INK_GAP_MM - 0.01 > brand.yMm) {
    throw new Error("totals/brand collision");
  }
  if (thank.bottomYMm + THANKYOU_TO_BRAND_INK_GAP_MM - 0.01 > brand.yMm) {
    throw new Error("thank-you/brand collision");
  }
  if (brand.bottomYMm + MIN_PAYMENT_BREATHING_ROOM_MM - 0.01 > PAYMENT_SECTION_BOUNDARY_Y_FROM_TOP_MM) {
    throw new Error("brand/SIX collision");
  }
  if (brand.bottomYMm > CREATIVE_AREA_HEIGHT_MM + 0.01) {
    throw new Error("creative overflow");
  }

  for (const group of plan.metadataGroups) {
    if (group.labelToValueGapMm + 0.01 < METADATA_INTRA_GROUP_INK_GAP_MIN_MM) {
      throw new Error(`metadata label/value collision: ${group.label}`);
    }
    if (
      group.valueToNextLabelGapMm != null &&
      group.valueToNextLabelGapMm + 0.01 < METADATA_INTER_GROUP_INK_GAP_MIN_MM
    ) {
      throw new Error(`metadata inter-group collision after ${group.label}`);
    }
  }
}

/** Vertical layout for invoice totals block (mm). */
export const TOTALS_NET_ROW_STEP_MM = 4.5;
export const TOTALS_VAT_ROW_STEP_MM = 4.5;
/** Minimum clear gap between VAT baseline and gross highlight top. */
export const TOTALS_VAT_TO_GROSS_GAP_MM = 6;
export const TOTALS_DIVIDER_OFFSET_MM = 2;
export const TOTALS_GROSS_HIGHLIGHT_HEIGHT_MM = 9;
export const TOTALS_GROSS_TEXT_INSET_MM = 2.5;
export const TOTALS_GROSS_FONT_SIZE_PT = 14;

export function minimumVatToGrossSeparationMm(): number {
  return TOTALS_VAT_TO_GROSS_GAP_MM + 1.5;
}

/** A4 portrait (mm). */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** SIX Swiss QR-bill regulated section (mm). */
export const SWISS_RECEIPT_WIDTH_MM = 62;
export const SWISS_PAYMENT_PART_WIDTH_MM = 148;
export const SWISS_PAYMENT_SECTION_HEIGHT_MM = 105;
export const SWISS_QR_CODE_SIZE_MM = 46;
export const SWISS_CROSS_SIZE_MM = 7;

export const INVOICE_PDF_BRAND = {
  /** SCE navy ~#111B29 */
  headerNavy: { r: 17 / 255, g: 27 / 255, b: 41 / 255 },
  orange: { r: 0.91, g: 0.45, b: 0.18 },
  orangeMuted: { r: 1, g: 0.94, b: 0.9 },
  /** Primary body text ~#17202D */
  text: { r: 23 / 255, g: 32 / 255, b: 45 / 255 },
  muted: { r: 0.45, g: 0.48, b: 0.52 },
  tableHeaderBg: { r: 0.95, g: 0.96, b: 0.97 },
  white: { r: 1, g: 1, b: 1 },
} as const;

/** White/orange mark for dark invoice header. */
export const SPORTCLUBEVO_HEADER_LOGO_PATH =
  "public/images/branding/sportclubevo_logo_alt.png";
/** Full-color mark for white invoice body (footer operator row). */
export const SPORTCLUBEVO_FOOTER_LOGO_PATH = "public/images/branding/sportclubevo_logo.png";
/** @deprecated Use SPORTCLUBEVO_HEADER_LOGO_PATH or SPORTCLUBEVO_FOOTER_LOGO_PATH. */
export const SPORTCLUBEVO_LOGO_PATH = SPORTCLUBEVO_HEADER_LOGO_PATH;
export const TULIP_DIGITAL_LOGO_PATH =
  "public/images/branding/Logo-730036c6-150f-4549-8e03-5ea1efb24084.png";
/** Approved compact header accent (SWISS-01E4C); far-right crop only. */
export const INVOICE_HEADER_JPG_PATH = "public/images/branding/invoice.jpg";
/** Left edge of source crop (fraction of source width). Right ~18% of artwork. */
export const HEADER_JPG_SOURCE_CROP_X_FRACTION = 0.82;
/** @deprecated Retired from invoice header in SWISS-01E4C. */
export const INVOICE_HEADER_RIBBON_ACCENT_PATH =
  "public/images/branding/sce-invoice-header-ribbon-accent.png";

export const INVOICE_PDF_SITE_URL = "www.sportclubevo.com";

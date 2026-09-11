/** Swiss standard VAT rate for SCE billing MVP (8.1%). */
export const SWISS_VAT_STANDARD_RATE_BPS = 810;

export const SWISS_VAT_STANDARD_LABEL = "MWST 8.1%";

export function vatRateBpsFromTreatment(
  treatment: "STANDARD_81",
): number {
  if (treatment === "STANDARD_81") {
    return SWISS_VAT_STANDARD_RATE_BPS;
  }
  return SWISS_VAT_STANDARD_RATE_BPS;
}

/**
 * VAT from net amount in minor units (rappen). Uses major-unit intermediate
 * rounding (half up to nearest rappen) — e.g. CHF 199.00 @ 8.1% → CHF 16.12.
 */
export function calculateVatFromNetMinor(netMinor: number, rateBps: number): number {
  if (netMinor < 0 || rateBps < 0) {
    throw new Error("Invalid VAT calculation input.");
  }
  const netMajor = netMinor / 100;
  const rate = rateBps / 10_000;
  const vatMajor = netMajor * rate;
  return Math.round(vatMajor * 100);
}

export function calculateLineAmounts(
  quantity: number,
  unitPriceNetMinor: number,
  rateBps: number,
): {
  lineNetMinor: number;
  vatMinor: number;
  lineGrossMinor: number;
} {
  const lineNetMinor = Math.round(quantity * unitPriceNetMinor);
  const vatMinor = calculateVatFromNetMinor(lineNetMinor, rateBps);
  return {
    lineNetMinor,
    vatMinor,
    lineGrossMinor: lineNetMinor + vatMinor,
  };
}

export function sumInvoiceTotals(
  lines: Array<{ lineNetMinor: number; vatMinor: number; lineGrossMinor: number }>,
): { netTotalMinor: number; vatTotalMinor: number; grossTotalMinor: number } {
  let netTotalMinor = 0;
  let vatTotalMinor = 0;
  let grossTotalMinor = 0;
  for (const line of lines) {
    netTotalMinor += line.lineNetMinor;
    vatTotalMinor += line.vatMinor;
    grossTotalMinor += line.lineGrossMinor;
  }
  return { netTotalMinor, vatTotalMinor, grossTotalMinor };
}

/**
 * FIN-05C R1 — human-readable variance percentages for management reporting surfaces.
 * Canonical calculation precision stays in the read model; this is display only.
 */

export function formatManagementReportingVariancePercent(
  variancePercent: number,
  locale: string,
): string {
  if (!Number.isFinite(variancePercent)) return "—";
  if (variancePercent === 0) return "0%";

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(variancePercent);
  } catch {
    formatted = new Intl.NumberFormat("en", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(variancePercent);
  }

  return `${formatted}%`;
}

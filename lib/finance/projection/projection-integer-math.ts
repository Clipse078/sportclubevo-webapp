/**
 * Deterministic integer rounding for projection amounts (minor units).
 * Uses half-away-from-zero on rational values numerator/denominator.
 */
const ZERO = BigInt(0);
const HALF_DIVISOR = BigInt(2);

export function roundRationalToMinor(numerator: bigint, denominator: bigint): number {
  if (denominator === ZERO) {
    throw new Error("Projection rational denominator must be non-zero.");
  }
  const sign = numerator < ZERO !== denominator < ZERO ? -1 : 1;
  const absNum = numerator < ZERO ? -numerator : numerator;
  const absDen = denominator < ZERO ? -denominator : denominator;
  const half = absDen / HALF_DIVISOR;
  const rounded = sign * Number((absNum + half) / absDen);
  if (!Number.isSafeInteger(rounded)) {
    throw new Error("Projected amount exceeds safe integer minor units.");
  }
  return rounded;
}

export function medianOfIntegers(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** Share in basis points (0–10000) from cumulative / annual totals. */
export function cumulativeShareBasisPoints(cumulativeMinor: number, annualMinor: number): number | null {
  if (annualMinor <= 0 || cumulativeMinor < 0) return null;
  const bp = Math.round((cumulativeMinor * 10000) / annualMinor);
  if (bp <= 0 || bp >= 10000) return null;
  return bp;
}

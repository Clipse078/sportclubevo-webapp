import { FinanceDomainError } from "@/lib/finance/errors";

export type ProjectionLineRangeInput = {
  projectedAmountMinor: number | null;
  lowerBoundMinor: number | null;
  upperBoundMinor: number | null;
};

/** Validates optional uncertainty range — absence of bounds is valid. */
export function assertValidProjectionLineRange(input: ProjectionLineRangeInput): void {
  const { projectedAmountMinor, lowerBoundMinor, upperBoundMinor } = input;
  const hasLower = lowerBoundMinor !== null;
  const hasUpper = upperBoundMinor !== null;

  if (!hasLower && !hasUpper) {
    return;
  }

  if (!hasLower || !hasUpper) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INVALID_RANGE",
      "Projection uncertainty range requires both lower and upper bounds.",
    );
  }

  if (projectedAmountMinor === null) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INVALID_RANGE",
      "Projection amount is required when uncertainty bounds are provided.",
    );
  }

  if (lowerBoundMinor > projectedAmountMinor || projectedAmountMinor > upperBoundMinor) {
    throw new FinanceDomainError(
      "FINANCE_PROJECTION_INVALID_RANGE",
      "Projection bounds must satisfy lower ≤ projected ≤ upper.",
    );
  }
}

import { FinanceDomainError } from "@/lib/finance/errors";
import { FORMAL_REFORECAST_REVISION_LABEL_MAX_LENGTH } from "@/lib/finance/forecast/formal-reforecast-contract";

/** Trim whitespace; blank → null; enforce practical max length. */
export function normalizeFormalReforecastRevisionLabel(
  revisionLabel?: string | null,
): string | null {
  if (revisionLabel == null) return null;
  const trimmed = revisionLabel.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > FORMAL_REFORECAST_REVISION_LABEL_MAX_LENGTH) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LABEL",
      "revisionLabel is too long.",
    );
  }
  return trimmed;
}

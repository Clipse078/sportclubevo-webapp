import { FinanceDomainError } from "@/lib/finance/errors";
import type { FormalReforecastOutcome } from "@/lib/finance/forecast/formal-reforecast-contract";

export function mapFormalReforecastDomainError(error: unknown): FormalReforecastOutcome {
  if (!(error instanceof FinanceDomainError)) {
    return "UNEXPECTED_ERROR";
  }
  switch (error.code) {
    case "FINANCE_FORECAST_REVISION_STALE_CURRENT":
      return "STALE_CURRENT";
    case "FINANCE_FORECAST_REVISION_INVALID_LABEL":
      return "INVALID_LABEL";
    case "FINANCE_FORECAST_REVISION_INVALID_REASON":
      return "INVALID_REVISION_REASON";
    case "FINANCE_FORECAST_REVISION_INVALID_CONTEXT":
      return "INVALID_REVISION_CONTEXT";
    case "FINANCE_FORBIDDEN":
      return "PERMISSION_DENIED";
    case "FINANCE_FORECAST_REVISION_INVALID_DATE":
      if (error.message.includes("actualsThroughDate")) {
        return "INVALID_ACTUALS_THROUGH_DATE";
      }
      return "INVALID_AS_OF_DATE";
    case "FINANCE_NOT_FOUND":
      if (error.message.toLowerCase().includes("financial year")) {
        return "INVALID_FINANCE_YEAR";
      }
      return "NO_CURRENT_FORECAST";
    case "FINANCE_CROSS_TENANT":
      return "NO_CURRENT_FORECAST";
    default:
      return "UNEXPECTED_ERROR";
  }
}

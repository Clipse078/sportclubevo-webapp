import type { FinanceForecastVersionStatus } from "@prisma/client";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type CurrentForecastVersionWithLines = {
  id: string;
  status: FinanceForecastVersionStatus;
  forecastId: string;
  lines: ReadonlyArray<{
    financialAccountId: string;
    amountMinor: number;
  }>;
};

export type CurrentForecastMeasurePayload = {
  measure: "CURRENT_FORECAST";
  forecastId: string;
  forecastVersionId: string;
  valuesByAccountId: ReadonlyMap<string, number>;
};

/**
 * Resolves current forecast lines via FinanceForecast.currentVersionId pointer — never MAX(version).
 */
export function resolveCurrentForecastMeasure(input: {
  forecastId: string;
  currentVersionId: string | null;
  versions: ReadonlyArray<CurrentForecastVersionWithLines>;
}): CurrentForecastMeasurePayload | null {
  if (!input.currentVersionId) return null;
  const version = input.versions.find((v) => v.id === input.currentVersionId);
  if (!version || version.forecastId !== input.forecastId) return null;

  const valuesByAccountId = new Map<string, number>();
  for (const line of version.lines) {
    assertSafeAmountMinor(line.amountMinor);
    if (valuesByAccountId.has(line.financialAccountId)) {
      throw new Error("FINANCE_REPORTING_DUPLICATE_FORECAST_ACCOUNT_LINE");
    }
    valuesByAccountId.set(line.financialAccountId, line.amountMinor);
  }

  return {
    measure: "CURRENT_FORECAST",
    forecastId: input.forecastId,
    forecastVersionId: version.id,
    valuesByAccountId,
  };
}

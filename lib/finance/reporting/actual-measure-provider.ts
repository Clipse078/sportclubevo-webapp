import {
  aggregateActualTotalsByAccount,
  type ActualEntryRow,
} from "@/lib/finance/actual/aggregate-actuals";
import { isEffectiveDateOnOrBeforeCutoff } from "@/lib/finance/actual/period-semantics";

export type ActualMeasurePayload = {
  measure: "ACTUAL";
  grain: "ANNUAL_FULL_YEAR" | "YTD";
  cutoffDate: Date | null;
  valuesByAccountId: ReadonlyMap<string, number>;
};

/**
 * Aggregates actual entries with explicit cutoff — never uses system clock implicitly.
 */
export function resolveActualMeasure(input: {
  entries: ReadonlyArray<
    Pick<ActualEntryRow, "financialAccountId" | "amountMinor"> & {
      effectiveDate: Date;
    }
  >;
  grain: "ANNUAL_FULL_YEAR" | "YTD";
  ytdCutoffDate: Date | null;
}): ActualMeasurePayload {
  const scoped =
    input.grain === "YTD" && input.ytdCutoffDate
      ? input.entries.filter((e) =>
          isEffectiveDateOnOrBeforeCutoff(e.effectiveDate, input.ytdCutoffDate!),
        )
      : input.entries;

  return {
    measure: "ACTUAL",
    grain: input.grain,
    cutoffDate: input.grain === "YTD" ? input.ytdCutoffDate : null,
    valuesByAccountId: aggregateActualTotalsByAccount(scoped),
  };
}

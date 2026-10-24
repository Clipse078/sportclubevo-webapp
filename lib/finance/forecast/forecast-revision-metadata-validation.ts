import {
  assertFinanceCalendarDateWithinFinanceYear,
  parseFinanceCalendarDateIso,
} from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import { FORECAST_REVISION_SOURCES } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import type { PersistFormalForecastRevisionInput } from "@/lib/finance/forecast/forecast-revision-persistence-types";

export function assertKnownForecastRevisionSource(
  value: string,
): asserts value is (typeof FORECAST_REVISION_SOURCES)[number] {
  if (!(FORECAST_REVISION_SOURCES as readonly string[]).includes(value)) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_SOURCE",
      "Unknown forecast revision source.",
    );
  }
}

export function validateFormalRevisionMetadata(
  input: Pick<
    PersistFormalForecastRevisionInput,
    "asOfDate" | "actualsThroughDate" | "revisionSource" | "revisionLabel"
  >,
  financeYear: { startDate: Date; endDate: Date },
): { asOfDate: Date; actualsThroughDate: Date } {
  assertKnownForecastRevisionSource(input.revisionSource);

  const asOfDate = parseFinanceCalendarDateIso(input.asOfDate);
  const actualsThroughDate = parseFinanceCalendarDateIso(input.actualsThroughDate);

  assertFinanceCalendarDateWithinFinanceYear(asOfDate, financeYear, "asOfDate");
  assertFinanceCalendarDateWithinFinanceYear(
    actualsThroughDate,
    financeYear,
    "actualsThroughDate",
  );

  if (actualsThroughDate.getTime() > asOfDate.getTime()) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_DATE",
      "actualsThroughDate must not be after asOfDate.",
    );
  }

  if (input.revisionLabel != null && input.revisionLabel.trim().length > 120) {
    throw new FinanceDomainError(
      "FINANCE_FORECAST_REVISION_INVALID_LABEL",
      "revisionLabel is too long.",
    );
  }

  return { asOfDate, actualsThroughDate };
}

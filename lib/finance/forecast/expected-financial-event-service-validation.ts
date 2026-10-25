import { FinanceDomainError } from "@/lib/finance/errors";
import {
  validateExpectedFinancialEventPersistence,
  type ExpectedFinancialEventPersistenceInput,
} from "@/lib/finance/forecast/expected-financial-event-persistence-validation";

/** Manual CRUD rejects zero amounts — timing evidence without magnitude is not useful in v1. */
export const EXPECTED_EVENT_MANUAL_ZERO_AMOUNT_POLICY = "REJECT_ZERO" as const;

export function assertManualExpectedEventAmountMinor(amountMinor: number): void {
  if (amountMinor === 0) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_AMOUNT",
      "Expected event amount must be greater than zero.",
      400,
    );
  }
}

function mapPersistenceValidationError(error: unknown): never {
  if (!(error instanceof Error)) throw error;
  const message = error.message;
  if (message.startsWith("FINANCE_EXPECTED_EVENT_INVALID_TIMING")) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_TIMING",
      "Invalid expected event timing payload.",
      400,
    );
  }
  if (
    message === "FINANCE_EXPECTED_EVENT_INVALID_AMOUNT" ||
    message.includes("FINANCE_AMOUNT")
  ) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_AMOUNT",
      "Invalid expected event amount.",
      400,
    );
  }
  if (
    message === "FINANCE_EXPECTED_EVENT_INVALID_FINANCE_YEAR" ||
    message === "FINANCE_EXPECTED_EVENT_INVALID_ACCOUNT" ||
    message === "FINANCE_EXPECTED_EVENT_INVALID_TENANT"
  ) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Invalid finance reference.", 404);
  }
  if (
    message === "FINANCE_EXPECTED_EVENT_INVALID_TIMING_PRECISION" ||
    message === "FINANCE_EXPECTED_EVENT_INVALID_SOURCE" ||
    message === "FINANCE_EXPECTED_EVENT_INVALID_SOURCE_REFERENCE"
  ) {
    throw new FinanceDomainError(
      "FINANCE_EXPECTED_EVENT_INVALID_TIMING",
      "Invalid expected event payload.",
      400,
    );
  }
  throw error;
}

export function validateManualExpectedFinancialEventInput(
  input: ExpectedFinancialEventPersistenceInput,
) {
  try {
    const validated = validateExpectedFinancialEventPersistence({
      ...input,
      sourceKind: "MANUAL",
      sourceRefType: null,
      sourceRefId: null,
    });
    assertManualExpectedEventAmountMinor(validated.expectedAmountMinor);
    return validated;
  } catch (error) {
    mapPersistenceValidationError(error);
  }
}

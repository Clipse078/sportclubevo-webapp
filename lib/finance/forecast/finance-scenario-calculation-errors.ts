export type FinanceScenarioCalculationErrorCode =
  | "INVALID_SCENARIO_INPUT"
  | "DUPLICATE_BASELINE_ACCOUNT"
  | "DUPLICATE_ASSUMPTION_ACCOUNT"
  | "ASSUMPTION_ACCOUNT_NOT_IN_BASELINE"
  | "INVALID_ASSUMPTION_PAYLOAD"
  | "UNSUPPORTED_ACCOUNT_TYPE"
  | "UNSAFE_INTEGER_RESULT";

export class FinanceScenarioCalculationError extends Error {
  readonly code: FinanceScenarioCalculationErrorCode;

  constructor(code: FinanceScenarioCalculationErrorCode, message: string) {
    super(message);
    this.name = "FinanceScenarioCalculationError";
    this.code = code;
  }
}

export function failScenarioCalculation(
  code: FinanceScenarioCalculationErrorCode,
  message: string,
): never {
  throw new FinanceScenarioCalculationError(code, message);
}

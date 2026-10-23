export type FinanceDomainErrorCode =
  | "FINANCE_FORBIDDEN"
  | "FINANCE_CROSS_TENANT"
  | "FINANCE_NOT_FOUND"
  | "FINANCE_CYCLE"
  | "FINANCE_SELF_PARENT"
  | "FINANCE_ARCHIVED"
  | "FINANCE_UNSAFE_DELETE"
  | "FINANCE_INVALID_YEAR"
  | "FINANCE_INVALID_CURRENCY"
  | "FINANCE_INVALID_CAPABILITY"
  | "FINANCE_INVALID_HIERARCHY"
  | "FINANCE_TEMPLATE_ALREADY_APPLIED"
  | "FINANCE_STRUCTURE_NOT_EMPTY"
  | "FINANCE_BUDGET_IMMUTABLE"
  | "FINANCE_BUDGET_BASELINE_EXISTS"
  | "FINANCE_BUDGET_INVALID_ACCOUNT"
  | "FINANCE_BUDGET_INVALID_AMOUNT"
  | "FINANCE_BUDGET_NOT_READY"
  | "FINANCE_BUDGET_NO_BASELINE"
  | "FINANCE_BUDGET_ALREADY_EXISTS"
  | "FINANCE_BUDGET_COPY_SOURCE_REQUIRED"
  | "FINANCE_BUDGET_INVALID_COPY_SOURCE"
  | "FINANCE_ACTUAL_INVALID_AMOUNT"
  | "FINANCE_ACTUAL_INVALID_DATE"
  | "FINANCE_ACTUAL_INVALID_ACCOUNT"
  | "FINANCE_FORECAST_EXISTS"
  | "FINANCE_FORECAST_NO_BASELINE"
  | "FINANCE_FORECAST_IMMUTABLE"
  | "FINANCE_FORECAST_NOT_CURRENT"
  | "FINANCE_FORECAST_INVALID_ACCOUNT"
  | "FINANCE_FORECAST_ARCHIVED_ACCOUNT";

export class FinanceDomainError extends Error {
  readonly code: FinanceDomainErrorCode;
  readonly status: number;

  constructor(code: FinanceDomainErrorCode, message: string, status = 400) {
    super(message);
    this.name = "FinanceDomainError";
    this.code = code;
    this.status = status;
  }
}

export function financeErrorMessage(error: unknown): string {
  if (error instanceof FinanceDomainError) return error.message;
  return "Interner Fehler";
}

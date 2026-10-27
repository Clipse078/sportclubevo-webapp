import type { FinanceDomainErrorCode } from "@/lib/finance/errors";

const COMMITMENT_MESSAGE_KEYS: Partial<Record<FinanceDomainErrorCode, string>> = {
  FINANCE_FORBIDDEN: "errors.forbidden",
  FINANCE_NOT_FOUND: "errors.notFound",
  FINANCE_COMMITMENT_INVALID_TRANSITION: "errors.invalidTransition",
  FINANCE_COMMITMENT_INVALID_STATE: "errors.invalidState",
  FINANCE_COMMITMENT_APPROVAL_REQUIRED: "errors.approvalRequired",
  FINANCE_COMMITMENT_NOT_EDITABLE: "errors.notEditable",
  FINANCE_COMMITMENT_DELETE_FORBIDDEN: "errors.deleteForbidden",
  FINANCE_COMMITMENT_VALIDATION: "errors.validation",
  FINANCE_COMMITMENT_IMMUTABLE_OBLIGATION: "errors.immutableObligation",
  FINANCE_COMMITMENT_APPROVAL_ALREADY_DECIDED: "errors.approvalAlreadyDecided",
  FINANCE_INVALID_CURRENCY: "errors.invalidCurrency",
  FINANCE_INVALID_YEAR: "errors.invalidYear",
};

export function resolveFinanceCommitmentActionMessageKey(
  code: FinanceDomainErrorCode | undefined,
): string | undefined {
  if (!code) return undefined;
  return COMMITMENT_MESSAGE_KEYS[code];
}

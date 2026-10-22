import { isSupportedIso4217CurrencyCode } from "@/lib/finance/currency/iso4217-currency";
import { FinanceDomainError } from "@/lib/finance/errors";

export function assertSameTenant(
  entityTenantId: string,
  tenantId: string,
  label = "Resource",
): void {
  if (entityTenantId !== tenantId) {
    throw new FinanceDomainError(
      "FINANCE_CROSS_TENANT",
      `${label} belongs to another organisation.`,
      404,
    );
  }
}

export function isIso4217Currency(code: string): boolean {
  return isSupportedIso4217CurrencyCode(code);
}

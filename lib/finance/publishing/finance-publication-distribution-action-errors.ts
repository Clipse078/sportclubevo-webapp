/**
 * FIN-06E — user-facing distribution send errors (German product copy).
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import { FinancePublicationDistributionEmailDeliveryError } from "@/lib/finance/delivery/finance-publication-distribution-email-port";

export const FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK =
  "Der Bericht konnte nicht versendet werden. Bitte versuche es erneut.";

export const FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE =
  "E-Mail-Versand ist in dieser Umgebung derzeit nicht verfügbar. Bitte später erneut versuchen oder den Support informieren.";

export const FINANCE_PUBLICATION_DISTRIBUTION_DELIVERY_TIMEOUT =
  "Der Versand konnte nicht rechtzeitig abgeschlossen werden. Bitte erneut versuchen — doppelte Zustellung wird verhindert.";

const DELIVERY_CODE_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE,
  TRANSPORT_TIMEOUT: FINANCE_PUBLICATION_DISTRIBUTION_DELIVERY_TIMEOUT,
  TRANSIENT_PROVIDER_FAILURE: FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK,
  PERMANENT_PROVIDER_FAILURE: FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK,
  DELIVERY_FAILED: FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK,
  UNKNOWN: FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK,
};

export function resolveFinancePublicationDistributionSendUserMessage(
  error: unknown,
): string {
  if (error instanceof FinanceDomainError) {
    if (error.code === "FINANCE_PUBLICATION_DISTRIBUTION_UNAVAILABLE") {
      return FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE;
    }
    if (error.message.trim()) {
      return error.message.trim();
    }
  }
  if (error instanceof FinancePublicationDistributionEmailDeliveryError) {
    return (
      DELIVERY_CODE_MESSAGES[error.code] ?? FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK
    );
  }
  return FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK;
}

export function resolveFinancePublicationDistributionDeliveryFailureMessage(
  failureCode: string | null | undefined,
): string {
  if (!failureCode) {
    return FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK;
  }
  return DELIVERY_CODE_MESSAGES[failureCode] ?? FINANCE_PUBLICATION_DISTRIBUTION_SEND_FALLBACK;
}

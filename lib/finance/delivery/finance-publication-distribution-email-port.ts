/**
 * FIN-06E — provider-neutral email delivery port for publication distribution.
 * Finance domain depends on this boundary, not on a concrete mail provider.
 */

export type FinancePublicationDistributionEmailPayload = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type FinancePublicationDistributionEmailDeliveryResult = {
  provider: string;
  providerMessageId: string;
  from: string;
};

export type FinancePublicationDistributionEmailPort = {
  send(
    payload: FinancePublicationDistributionEmailPayload,
  ): Promise<FinancePublicationDistributionEmailDeliveryResult>;
};

export class FinancePublicationDistributionEmailDeliveryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
    this.name = "FinancePublicationDistributionEmailDeliveryError";
  }
}

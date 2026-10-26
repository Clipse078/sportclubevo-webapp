/**
 * FIN-06E — default adapter: SCE outbound transport (COMM-14 boundary).
 */

import { resolveTenantEmailSender } from "@/lib/communication/email-sender-service";
import { sendOutboundEmail, OutboundEmailTransportError } from "@/lib/email/outbound-email-transport";
import {
  FinancePublicationDistributionEmailDeliveryError,
  type FinancePublicationDistributionEmailDeliveryResult,
  type FinancePublicationDistributionEmailPayload,
  type FinancePublicationDistributionEmailPort,
} from "@/lib/finance/delivery/finance-publication-distribution-email-port";

export const financePublicationDistributionEmailPort: FinancePublicationDistributionEmailPort = {
  async send(
    payload: FinancePublicationDistributionEmailPayload,
  ): Promise<FinancePublicationDistributionEmailDeliveryResult> {
    const sender = await resolveTenantEmailSender(payload.tenantId);
    try {
      const transport = await sendOutboundEmail({
        from: sender.formattedFrom,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        idempotencyKey: payload.idempotencyKey,
      });
      return {
        provider: transport.provider,
        providerMessageId: transport.messageId,
        from: transport.from,
      };
    } catch (error) {
      if (error instanceof OutboundEmailTransportError) {
        throw new FinancePublicationDistributionEmailDeliveryError(
          error.code,
          error.message,
          error.permanent,
        );
      }
      throw new FinancePublicationDistributionEmailDeliveryError(
        "UNKNOWN",
        error instanceof Error ? error.message : "Email delivery failed.",
        false,
      );
    }
  },
};

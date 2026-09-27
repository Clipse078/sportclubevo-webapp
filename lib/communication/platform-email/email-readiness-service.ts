import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import {
  getTenantEmailSenderSettings,
  type TenantEmailSenderSettings,
} from "@/lib/communication/email-sender-service";

export type PlatformEmailReadiness = {
  ready: boolean;
  senderConfigured: boolean;
  transportConfigured: boolean;
  fromAddressValid: boolean;
  activeSource: TenantEmailSenderSettings["activeSource"];
  providerStatus: TenantEmailSenderSettings["providerStatus"];
  platformFallbackActive: boolean;
  reasons: string[];
};

function transportConfigured(): boolean {
  return isExternalSideEffectConfigured("resend", ["RESEND_API_KEY", "EMAIL_FROM"]);
}

export async function evaluatePlatformEmailReadiness(
  tenantId: string,
): Promise<PlatformEmailReadiness> {
  const settings = await getTenantEmailSenderSettings(tenantId);
  const reasons: string[] = [];

  const transport = transportConfigured();
  if (!transport) {
    reasons.push("TRANSPORT_NOT_CONFIGURED");
  }

  const senderConfigured =
    Boolean(settings.displayName?.trim()) && Boolean(settings.emailAddress?.trim());
  if (!senderConfigured && settings.platformFallbackActive) {
    reasons.push("TENANT_SENDER_NOT_CONFIGURED_USING_PLATFORM_FALLBACK");
  }

  const fromAddressValid = Boolean(settings.activeFrom.trim());
  if (!fromAddressValid) {
    reasons.push("FROM_ADDRESS_INVALID");
  }

  if (settings.providerStatus === "NOT_VERIFIED") {
    reasons.push("SENDER_DOMAIN_NOT_VERIFIED");
  }

  const ready =
    transport &&
    fromAddressValid &&
    (settings.platformFallbackActive || settings.providerStatus === "VERIFIED");

  return {
    ready,
    senderConfigured,
    transportConfigured: transport,
    fromAddressValid,
    activeSource: settings.activeSource,
    providerStatus: settings.providerStatus,
    platformFallbackActive: settings.platformFallbackActive,
    reasons,
  };
}

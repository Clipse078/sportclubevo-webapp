import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import {
  getTenantEmailSenderSettings,
  type TenantEmailSenderSettings,
} from "@/lib/communication/email-sender-service";
import {
  isSenderIdentityUsable,
  loadActiveSenderIdentityById,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import { resolveEffectiveEmailSender } from "@/lib/communication/sender-identity/sender-identity-resolution-service";

export type PlatformEmailReadiness = {
  ready: boolean;
  senderConfigured: boolean;
  transportConfigured: boolean;
  fromAddressValid: boolean;
  activeSource: TenantEmailSenderSettings["activeSource"];
  providerStatus: TenantEmailSenderSettings["providerStatus"];
  platformFallbackActive: boolean;
  senderIdentityId: string | null;
  reasons: string[];
};

function transportConfigured(): boolean {
  return isExternalSideEffectConfigured("resend", ["RESEND_API_KEY", "EMAIL_FROM"]);
}

export async function evaluatePlatformEmailReadiness(
  tenantId: string,
  options?: { senderIdentityId?: string | null },
): Promise<PlatformEmailReadiness> {
  const explicitId = options?.senderIdentityId?.trim() || null;
  const settings = await getTenantEmailSenderSettings(tenantId);
  const reasons: string[] = [];

  const transport = transportConfigured();
  if (!transport) {
    reasons.push("TRANSPORT_NOT_CONFIGURED");
  }

  let effectiveSource = settings.activeSource;
  let providerStatus = settings.providerStatus;
  let platformFallbackActive = settings.platformFallbackActive;
  let senderIdentityId: string | null = settings.defaultSenderIdentityId;

  if (explicitId) {
    const explicit = await loadActiveSenderIdentityById({ tenantId, senderIdentityId: explicitId });
    if (!explicit) {
      reasons.push("SENDER_NOT_FOUND");
    } else if (explicit.status !== "ACTIVE") {
      reasons.push("SENDER_INACTIVE");
    } else if (explicit.providerStatus === "UNKNOWN") {
      reasons.push("SENDER_VERIFICATION_UNKNOWN");
    } else if (!isSenderIdentityUsable(explicit)) {
      reasons.push("SENDER_DOMAIN_NOT_VERIFIED");
    } else {
      senderIdentityId = explicit.id;
      effectiveSource = "TENANT";
      providerStatus = explicit.providerStatus;
      platformFallbackActive = false;
    }
  } else {
    try {
      const resolved = await resolveEffectiveEmailSender({ tenantId });
      senderIdentityId = resolved.identityId;
      effectiveSource = resolved.source;
      providerStatus = resolved.providerStatus;
      platformFallbackActive = resolved.source === "PLATFORM";
    } catch {
      reasons.push("FROM_ADDRESS_INVALID");
    }
  }

  const senderConfigured =
    Boolean(settings.displayName?.trim()) && Boolean(settings.emailAddress?.trim());
  if (!senderConfigured && platformFallbackActive) {
    reasons.push("TENANT_SENDER_NOT_CONFIGURED_USING_PLATFORM_FALLBACK");
  }

  const fromAddressValid = Boolean(settings.activeFrom.trim());
  if (!fromAddressValid) {
    reasons.push("FROM_ADDRESS_INVALID");
  }

  if (providerStatus === "NOT_VERIFIED") {
    reasons.push("SENDER_DOMAIN_NOT_VERIFIED");
  }
  if (providerStatus === "UNKNOWN") {
    reasons.push("SENDER_VERIFICATION_UNKNOWN");
  }

  const ready =
    transport &&
    fromAddressValid &&
    (platformFallbackActive || providerStatus === "VERIFIED") &&
    !reasons.includes("SENDER_NOT_FOUND") &&
    !reasons.includes("SENDER_INACTIVE") &&
    !reasons.includes("SENDER_VERIFICATION_UNKNOWN");

  return {
    ready,
    senderConfigured,
    transportConfigured: transport,
    fromAddressValid,
    activeSource: effectiveSource,
    providerStatus,
    platformFallbackActive,
    senderIdentityId,
    reasons,
  };
}

export async function evaluateSenderIdentityReadiness(input: {
  tenantId: string;
  senderIdentityId: string;
}): Promise<PlatformEmailReadiness> {
  return evaluatePlatformEmailReadiness(input.tenantId, {
    senderIdentityId: input.senderIdentityId,
  });
}

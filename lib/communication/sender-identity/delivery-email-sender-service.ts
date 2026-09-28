import { PlatformCommunicationEmailSenderSource } from "@prisma/client";
import { resolveTenantEmailSender } from "@/lib/communication/email-sender-service";
import {
  isSenderIdentityUsable,
  loadActiveSenderIdentityById,
} from "@/lib/communication/sender-identity/tenant-communication-sender-identity-service";
import {
  resolvedSenderFromCommunicationSnapshot,
  type ResolvedEffectiveEmailSender,
} from "@/lib/communication/sender-identity/sender-identity-resolution-service";

export type DeliveryEmailSenderFailure =
  | "SENDER_UNUSABLE"
  | "SENDER_VERIFICATION_UNKNOWN"
  | "SENDER_NOT_FOUND";

export async function resolveDeliveryEmailSender(input: {
  tenantId: string;
  emailSenderIdentityId: string | null;
  emailSenderDisplayNameSnapshot: string | null;
  emailSenderAddressSnapshot: string | null;
  emailSenderSource: PlatformCommunicationEmailSenderSource | null;
}): Promise<
  | { ok: true; sender: ResolvedEffectiveEmailSender }
  | { ok: false; failureCode: DeliveryEmailSenderFailure }
> {
  const fromSnapshot = resolvedSenderFromCommunicationSnapshot(input);
  if (fromSnapshot) {
    if (
      fromSnapshot.source === "TENANT" &&
      input.emailSenderIdentityId &&
      input.emailSenderSource === PlatformCommunicationEmailSenderSource.TENANT
    ) {
      const live = await loadActiveSenderIdentityById({
        tenantId: input.tenantId,
        senderIdentityId: input.emailSenderIdentityId,
      });
      if (!live) {
        return { ok: false, failureCode: "SENDER_NOT_FOUND" };
      }
      if (!isSenderIdentityUsable(live)) {
        if (live.providerStatus === "UNKNOWN") {
          return { ok: false, failureCode: "SENDER_VERIFICATION_UNKNOWN" };
        }
        return { ok: false, failureCode: "SENDER_UNUSABLE" };
      }
    }
    return { ok: true, sender: fromSnapshot };
  }

  const legacy = await resolveTenantEmailSender(input.tenantId);
  return {
    ok: true,
    sender: {
      identityId: legacy.senderIdentityId,
      displayName: legacy.displayName,
      emailAddress: legacy.emailAddress,
      formattedFrom: legacy.formattedFrom,
      source: legacy.source,
      providerStatus: legacy.providerStatus,
    },
  };
}

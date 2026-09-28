import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { parseEmailSenderIdentityIdFromCampaignOrchestration } from "@/lib/communication/sender-identity/communication-email-sender-intent";
import {
  EmailSenderResolutionError,
  publishSnapshotToPrismaData,
  resolveEmailSenderPublishSnapshot,
  type EmailSenderPublishSnapshot,
} from "@/lib/communication/sender-identity/sender-identity-resolution-service";

export async function prepareEmailSenderForPublish(input: {
  tenantId: string;
  orchestrationMetaJson: unknown;
  emailChannelEnabled: boolean;
}): Promise<{
  emailTransportReady: boolean;
  snapshotData: ReturnType<typeof publishSnapshotToPrismaData>;
}> {
  const explicitSenderId = parseEmailSenderIdentityIdFromCampaignOrchestration(
    input.orchestrationMetaJson,
  );

  const readiness = await evaluatePlatformEmailReadiness(input.tenantId, {
    senderIdentityId: explicitSenderId,
  });

  if (!input.emailChannelEnabled) {
    return { emailTransportReady: readiness.ready, snapshotData: {} };
  }

  let snapshot: EmailSenderPublishSnapshot | null = null;
  try {
    snapshot = await resolveEmailSenderPublishSnapshot({
      tenantId: input.tenantId,
      orchestrationMetaJson: input.orchestrationMetaJson,
      emailChannelEnabled: true,
    });
  } catch (error) {
    if (error instanceof EmailSenderResolutionError) {
      throw error;
    }
    throw error;
  }

  if (explicitSenderId && !readiness.ready) {
    throw new EmailSenderResolutionError(
      readiness.reasons.includes("SENDER_VERIFICATION_UNKNOWN")
        ? "SENDER_UNKNOWN"
        : "SENDER_NOT_USABLE",
      "Ausgewählter Absender ist nicht einsatzbereit.",
    );
  }

  return {
    emailTransportReady: readiness.ready,
    snapshotData: publishSnapshotToPrismaData(snapshot),
  };
}

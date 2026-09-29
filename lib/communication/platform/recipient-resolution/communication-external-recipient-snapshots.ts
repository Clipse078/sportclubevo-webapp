/**
 * SCE-ZIELGRUPPEN-02 — external communication contact snapshots at publish.
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { PlatformCommunicationRecipientKind } from "@prisma/client";
import {
  EXTERNAL_IN_APP_UNAVAILABLE,
  resolveExternalEmailDeliveryCapability,
  type ExternalSnapshotDeliveryCapability,
} from "@/lib/communication/platform-email/delivery-capability";
import {
  dedupeExternalContactsAgainstPersonEmails,
  resolveExternalContactIdsFromAudience,
} from "@/lib/communication/platform/recipient-resolution/external-contact-resolution";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";

export type CommunicationExternalSnapshotRow = {
  recipientKind: PlatformCommunicationRecipientKind;
  communicationExternalContactId: string;
  subjectPersonId: string | null;
  deliveryUserId: string | null;
  channel: string;
  externalSnapshotJson: {
    displayName: string;
    email: string;
    deliveryCapability: ExternalSnapshotDeliveryCapability;
  };
};

export async function collectCommunicationExternalSnapshotRows(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
  channel: string;
  emailChannelEnabled: boolean;
  emailTransportReady: boolean;
  structuralExclusionSelectors?: import("@/lib/communication/platform/audience/structural-targets").StructuralAudienceSelectors;
}): Promise<CommunicationExternalSnapshotRow[]> {
  const audienceResult = await resolveAudienceCandidates({
    tenantId: input.tenantId,
    audience: input.audience,
    structuralExclusionSelectors: input.structuralExclusionSelectors,
  });

  let contactIds = audienceResult.candidateExternalContactIds;
  contactIds = await dedupeExternalContactsAgainstPersonEmails({
    tenantId: input.tenantId,
    personIds: audienceResult.candidatePersonIds,
    externalContactIds: contactIds,
  });

  if (contactIds.length === 0) return [];

  const contacts = await prisma.communicationExternalContact.findMany({
    where: { tenantId: input.tenantId, id: { in: contactIds }, status: "ACTIVE" },
    select: {
      id: true,
      emailNormalized: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
  });

  const byId = new Map<string, CommunicationExternalSnapshotRow>();
  for (const contact of contacts) {
    const displayName =
      contact.displayName?.trim() ||
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() ||
      contact.emailNormalized;
    byId.set(contact.id, {
      recipientKind: "EXTERNAL_COMMUNICATION_CONTACT",
      communicationExternalContactId: contact.id,
      subjectPersonId: null,
      deliveryUserId: null,
      channel: input.channel,
      externalSnapshotJson: {
        displayName,
        email: contact.emailNormalized,
        deliveryCapability: resolveExternalEmailDeliveryCapability({
          emailChannelEnabled: input.emailChannelEnabled,
          transportReady: input.emailTransportReady,
          email: contact.emailNormalized,
        }),
      },
    });
  }

  return [...byId.values()];
}

/**
 * SCE-COMM-13 — external sponsor contact snapshots (canonical PlatformCommunicationRecipientSnapshot).
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { resolveSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-resolution";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import type { PlatformCommunicationRecipientKind } from "@prisma/client";
import {
  EXTERNAL_IN_APP_UNAVAILABLE,
  resolveExternalEmailDeliveryCapability,
  type ExternalSnapshotDeliveryCapability,
} from "@/lib/communication/platform-email/delivery-capability";

export type SponsorExternalSnapshotRow = {
  recipientKind: PlatformCommunicationRecipientKind;
  sponsorContactId: string;
  subjectPersonId: string | null;
  deliveryUserId: string | null;
  channel: string;
  externalSnapshotJson: {
    displayName: string;
    organisationName: string;
    email: string | null;
    deliveryCapability: ExternalSnapshotDeliveryCapability;
  };
};

export async function collectSponsorExternalSnapshotRows(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
  audienceFingerprint: string;
  channel: string;
  resolvedAt: string;
  emailChannelEnabled: boolean;
  emailTransportReady: boolean;
}): Promise<SponsorExternalSnapshotRow[]> {
  void input.audienceFingerprint;
  void input.resolvedAt;

  const rows: SponsorExternalSnapshotRow[] = [];

  for (const component of input.audience.components) {
    if (!component.sponsor || sponsorSelectorsAreEmpty(component.sponsor)) continue;
    const resolved = await resolveSponsorAudienceSelectors({
      tenantId: input.tenantId,
      selectors: component.sponsor,
    });

    for (const contact of resolved.contacts) {
      if (contact.personId) {
        const person = await prisma.person.findFirst({
          where: { tenantId: input.tenantId, id: contact.personId, isActive: true },
          select: { id: true, userId: true },
        });
        if (!person) continue;
        if (person.userId) {
          // Deliverable internal recipients are snapshotted by COMM-03 dispatch pipeline.
          continue;
        }
        rows.push({
          recipientKind: "INTERNAL_PERSON_NO_CHANNEL",
          sponsorContactId: contact.id,
          subjectPersonId: person.id,
          deliveryUserId: null,
          channel: input.channel,
          externalSnapshotJson: {
            displayName: `${contact.firstName} ${contact.lastName}`.trim(),
            organisationName: contact.sponsorOrganisationName,
            email: contact.email,
            deliveryCapability: EXTERNAL_IN_APP_UNAVAILABLE,
          },
        });
        continue;
      }

      rows.push({
        recipientKind: "EXTERNAL_SPONSOR_CONTACT",
        sponsorContactId: contact.id,
        subjectPersonId: null,
        deliveryUserId: null,
        channel: input.channel,
        externalSnapshotJson: {
          displayName: `${contact.firstName} ${contact.lastName}`.trim(),
          organisationName: contact.sponsorOrganisationName,
          email: contact.email,
          deliveryCapability: resolveExternalEmailDeliveryCapability({
            emailChannelEnabled: input.emailChannelEnabled,
            transportReady: input.emailTransportReady,
            email: contact.email,
          }),
        },
      });
    }
  }

  const byContact = new Map<string, SponsorExternalSnapshotRow>();
  for (const row of rows) {
    byContact.set(row.sponsorContactId, row);
  }
  return [...byContact.values()];
}

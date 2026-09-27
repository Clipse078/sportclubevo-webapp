/**
 * SCE-COMM-13 — sponsor-aware audience preview aggregates (extends COMM-11 preview).
 */

import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { resolveSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-resolution";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";
import { prisma } from "@/lib/db/prisma";
import { CAMPAIGN_OUTBOUND_EMAIL } from "@/lib/communication/campaign/campaign-boundaries";

export type SponsorAudiencePreviewAggregate = {
  sponsorOrganisationCount: number;
  sponsorContactCount: number;
  internalLinkedPersonCount: number;
  externalContactCount: number;
  internalDeliverableHint: string;
  externalDeliveryHint: string;
};

export async function aggregateSponsorAudiencePreview(input: {
  tenantId: string;
  audience: CommunicationAudienceSpec;
}): Promise<SponsorAudiencePreviewAggregate | null> {
  let hasSponsor = false;
  const orgIds = new Set<string>();
  let contactCount = 0;
  let internalLinked = 0;
  let externalCount = 0;

  for (const component of input.audience.components) {
    if (!component.sponsor || sponsorSelectorsAreEmpty(component.sponsor)) continue;
    hasSponsor = true;
    const resolved = await resolveSponsorAudienceSelectors({
      tenantId: input.tenantId,
      selectors: component.sponsor,
    });
    contactCount += resolved.contacts.length;
    for (const contact of resolved.contacts) {
      orgIds.add(contact.sponsorOrganisationId);
      if (contact.personId) {
        internalLinked += 1;
      } else {
        externalCount += 1;
      }
    }
  }

  if (!hasSponsor) return null;

  const linkedWithUser = await prisma.person.count({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      userId: { not: null },
      id: {
        in: (
          await Promise.all(
            input.audience.components.map(async (component) => {
              if (!component.sponsor || sponsorSelectorsAreEmpty(component.sponsor)) return [];
              const resolved = await resolveSponsorAudienceSelectors({
                tenantId: input.tenantId,
                selectors: component.sponsor,
              });
              return resolved.linkedPersonIds;
            }),
          )
        ).flat(),
      },
    },
  });

  return {
    sponsorOrganisationCount: orgIds.size,
    sponsorContactCount: contactCount,
    internalLinkedPersonCount: internalLinked,
    externalContactCount: externalCount,
    internalDeliverableHint: `${linkedWithUser} interne Empfänger (In-App/Push gemäss COMM-09)`,
    externalDeliveryHint: `E-Mail: ${CAMPAIGN_OUTBOUND_EMAIL}`,
  };
}

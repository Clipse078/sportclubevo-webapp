/**
 * SCE-COMM-13 — reference-based communication history seam for Sponsor module (no copied comm rows).
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { sponsorSelectorsAreEmpty } from "@/lib/sponsoring/sponsor-audience-selectors";

function audienceTargetsSponsorOrganisation(
  audience: CommunicationAudienceSpec,
  sponsorOrganisationId: string,
): boolean {
  for (const component of audience.components) {
    const sponsor = component.sponsor;
    if (!sponsor || sponsorSelectorsAreEmpty(sponsor)) continue;
    if (sponsor.allActiveSponsors) return true;
    if (sponsor.sponsorOrganisationIds?.includes(sponsorOrganisationId)) return true;
  }
  return false;
}

/** Lists canonical PlatformCommunication campaigns whose audience references a sponsor organisation. */
export async function listPlatformCommunicationsForSponsorOrganisation(input: {
  tenantId: string;
  sponsorOrganisationId: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const rows = await prisma.platformCommunication.findMany({
    where: {
      tenantId: input.tenantId,
      kind: { in: ["CAMPAIGN", "ANNOUNCEMENT", "MESSAGE"] },
      status: { in: ["PUBLISHED", "ARCHIVED"] },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit * 3,
    select: {
      id: true,
      kind: true,
      status: true,
      internalName: true,
      subject: true,
      publishedAt: true,
      audienceSpecJson: true,
    },
  });

  return rows
    .filter((row) =>
      audienceTargetsSponsorOrganisation(
        row.audienceSpecJson as CommunicationAudienceSpec,
        input.sponsorOrganisationId,
      ),
    )
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      internalName: row.internalName,
      subject: row.subject,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
}

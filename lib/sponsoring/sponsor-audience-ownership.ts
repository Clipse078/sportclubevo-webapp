/**
 * SCE-COMM-13 — fail-closed tenant ownership checks for sponsor audience selectors.
 */

import { prisma } from "@/lib/db/prisma";
import type { SponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-selectors";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export async function assertTenantOwnedSponsorAudienceSelectors(input: {
  tenantId: string;
  selectors: SponsorAudienceSelectors;
}): Promise<void> {
  const { tenantId, selectors } = input;

  if (selectors.sponsorOrganisationIds?.length) {
    const ids = [...new Set(selectors.sponsorOrganisationIds.map((id) => id.trim()).filter(Boolean))];
    const count = await prisma.sponsorOrganisation.count({
      where: { tenantId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new TeamCommunicationValidationError("sponsor organisation not found for tenant");
    }
  }

  if (selectors.sponsorContactIds?.length) {
    const ids = [...new Set(selectors.sponsorContactIds.map((id) => id.trim()).filter(Boolean))];
    const count = await prisma.sponsorContact.count({
      where: { tenantId, id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new TeamCommunicationValidationError("sponsor contact not found for tenant");
    }
  }

  if (selectors.sponsorCategoryIds?.length) {
    const ids = [...new Set(selectors.sponsorCategoryIds.map((id) => id.trim()).filter(Boolean))];
    const count = await prisma.sponsorCategory.count({
      where: { tenantId, id: { in: ids }, isActive: true },
    });
    if (count !== ids.length) {
      throw new TeamCommunicationValidationError("sponsor category not found for tenant");
    }
  }
}

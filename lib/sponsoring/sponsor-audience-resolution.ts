/**
 * SCE-COMM-13 — resolve Sponsor-domain selectors to contacts (publish/preview time).
 */

import { prisma } from "@/lib/db/prisma";
import type { SponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-selectors";

export type ResolvedSponsorContact = {
  id: string;
  tenantId: string;
  sponsorOrganisationId: string;
  sponsorOrganisationName: string;
  personId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  isActive: boolean;
};

export type SponsorAudienceResolutionResult = {
  contacts: ResolvedSponsorContact[];
  /** Person ids linked from sponsor contacts (for COMM-03 union/dedup). */
  linkedPersonIds: string[];
  /** External-only sponsor contacts (no Person link). */
  externalContactIds: string[];
};

function dedupeContacts(rows: ResolvedSponsorContact[]): ResolvedSponsorContact[] {
  const byId = new Map<string, ResolvedSponsorContact>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function loadContactsForOrganisationIds(input: {
  tenantId: string;
  organisationIds: readonly string[];
  requireActiveOrganisation: boolean;
}): Promise<ResolvedSponsorContact[]> {
  const orgIds = [...new Set(input.organisationIds.map((id) => id.trim()).filter(Boolean))];
  if (orgIds.length === 0) return [];

  const orgs = await prisma.sponsorOrganisation.findMany({
    where: {
      tenantId: input.tenantId,
      id: { in: orgIds },
      ...(input.requireActiveOrganisation ? { status: "ACTIVE" } : {}),
    },
    select: {
      id: true,
      name: true,
      contacts: {
        where: { isActive: true },
        select: {
          id: true,
          tenantId: true,
          sponsorOrganisationId: true,
          personId: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  const out: ResolvedSponsorContact[] = [];
  for (const org of orgs) {
    for (const contact of org.contacts) {
      out.push({
        id: contact.id,
        tenantId: contact.tenantId,
        sponsorOrganisationId: org.id,
        sponsorOrganisationName: org.name,
        personId: contact.personId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        isActive: contact.isActive,
      });
    }
  }
  return out;
}

export async function resolveSponsorAudienceSelectors(input: {
  tenantId: string;
  selectors: SponsorAudienceSelectors;
}): Promise<SponsorAudienceResolutionResult> {
  const { tenantId, selectors } = input;
  const batches: ResolvedSponsorContact[] = [];

  if (selectors.allActiveSponsors) {
    const activeOrgs = await prisma.sponsorOrganisation.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    batches.push(
      ...(await loadContactsForOrganisationIds({
        tenantId,
        organisationIds: activeOrgs.map((o) => o.id),
        requireActiveOrganisation: true,
      })),
    );
  }

  if (selectors.sponsorOrganisationIds?.length) {
    batches.push(
      ...(await loadContactsForOrganisationIds({
        tenantId,
        organisationIds: selectors.sponsorOrganisationIds,
        requireActiveOrganisation: true,
      })),
    );
  }

  if (selectors.sponsorCategoryIds?.length) {
    const categoryIds = [...new Set(selectors.sponsorCategoryIds.map((id) => id.trim()).filter(Boolean))];
    const orgs = await prisma.sponsorOrganisation.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        categoryId: { in: categoryIds },
      },
      select: { id: true },
    });
    batches.push(
      ...(await loadContactsForOrganisationIds({
        tenantId,
        organisationIds: orgs.map((o) => o.id),
        requireActiveOrganisation: true,
      })),
    );
  }

  if (selectors.sponsorContactIds?.length) {
    const contactIds = [...new Set(selectors.sponsorContactIds.map((id) => id.trim()).filter(Boolean))];
    const contacts = await prisma.sponsorContact.findMany({
      where: {
        tenantId,
        id: { in: contactIds },
        isActive: true,
        sponsorOrganisation: { status: "ACTIVE" },
      },
      select: {
        id: true,
        tenantId: true,
        sponsorOrganisationId: true,
        personId: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        sponsorOrganisation: { select: { name: true } },
      },
    });
    for (const contact of contacts) {
      batches.push({
        id: contact.id,
        tenantId: contact.tenantId,
        sponsorOrganisationId: contact.sponsorOrganisationId,
        sponsorOrganisationName: contact.sponsorOrganisation.name,
        personId: contact.personId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        isActive: contact.isActive,
      });
    }
  }

  const contacts = dedupeContacts(batches);
  const linkedPersonIds = [
    ...new Set(contacts.map((c) => c.personId).filter((id): id is string => Boolean(id?.trim()))),
  ];
  const externalContactIds = contacts.filter((c) => !c.personId).map((c) => c.id);

  return { contacts, linkedPersonIds, externalContactIds };
}

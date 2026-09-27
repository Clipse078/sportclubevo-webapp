import { notFound } from "next/navigation";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission([PERMISSIONS.COMMUNICATION_CLUB_SEND]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const params = await searchParams;
  const sponsorOrganisationId =
    typeof params.sponsorOrganisationId === "string" ? params.sponsorOrganisationId : undefined;
  const sponsorContactIdsRaw = params.sponsorContactId;
  const sponsorContactIds = Array.isArray(sponsorContactIdsRaw)
    ? sponsorContactIdsRaw
    : sponsorContactIdsRaw
      ? [sponsorContactIdsRaw]
      : [];

  const targetGroups = await prisma.targetGroup.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

  const sponsorAuth = await resolveSponsorAudienceAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const sponsorOrganisations = sponsorAuth.canViewSponsorData
    ? await prisma.sponsorOrganisation.findMany({
        where: { tenantId: tenant.id, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          contacts: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
          },
        },
        orderBy: { name: "asc" },
        take: 200,
      })
    : [];

  const hasSponsorPreselect = Boolean(sponsorOrganisationId?.trim());

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen", href: "/dashboard/communication/kampagnen" },
          { label: "Neu" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Neue Kampagne"
        description="Interner Name und Empfänger-Betreff sind getrennt. Empfänger werden erst bei Veröffentlichung eingefroren."
      />
      <CampaignComposer
        targetGroups={targetGroups}
        sponsorOrganisations={sponsorOrganisations.map((org) => ({
          id: org.id,
          name: org.name,
          contacts: org.contacts.map((c) => ({
            id: c.id,
            displayName: `${c.firstName} ${c.lastName}`.trim(),
            isPrimary: c.isPrimary,
          })),
        }))}
        initialAudienceMode={hasSponsorPreselect ? "SPONSORS" : "WHOLE_ORG"}
        initialSponsorMode={hasSponsorPreselect ? "SELECTED" : "ALL_ACTIVE"}
        initialSponsorOrganisationIds={
          sponsorOrganisationId?.trim() ? [sponsorOrganisationId.trim()] : []
        }
        initialSponsorContactIds={sponsorContactIds.map((id) => id.trim()).filter(Boolean)}
        tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
      />
    </PageShell>
  );
}

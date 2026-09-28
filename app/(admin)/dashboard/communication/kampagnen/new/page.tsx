import { notFound } from "next/navigation";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { requireCampaignSend } from "@/lib/communication/campaign/campaign-authorization";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { prisma } from "@/lib/db/prisma";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  await requireCampaignSend({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const params = await searchParams;
  const sponsorOrganisationId =
    typeof params.sponsorOrganisationId === "string" ? params.sponsorOrganisationId : undefined;
  const sponsorContactIdsRaw = params.sponsorContactId;
  const sponsorContactIds = Array.isArray(sponsorContactIdsRaw)
    ? sponsorContactIdsRaw
    : sponsorContactIdsRaw
      ? [sponsorContactIdsRaw]
      : [];

  const targetGroups = await listZielgruppenForManagement({
    tenantId: tenant.id,
    statusFilter: "ACTIVE",
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

  const templateAuthz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const templateOptions = templateAuthz.canView
    ? (await listPlatformCommunicationTemplates({ tenantId: tenant.id }))
        .filter((t) => t.kind === "CAMPAIGN" && (t.status === "ACTIVE" || t.status === "DRAFT"))
        .map((t) => ({ id: t.id, name: t.name }))
    : [];

  const hasSponsorPreselect = Boolean(sponsorOrganisationId?.trim());

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen", href: "/dashboard/communication/kampagnen" },
          { label: "Neu" },
        ]}
        title="Neue Kampagne"
        description="Planen Sie organisationsweite Kommunikation — Empfänger werden bei Veröffentlichung aufgelöst und eingefroren."
      />
      <CommunicationContentSurface>
        <CampaignComposer
          targetGroups={targetGroups.map((tg) => ({
            id: tg.id,
            name: tg.name,
            status: tg.status,
          }))}
          sponsorOrganisations={sponsorOrganisations.map((org) => ({
            id: org.id,
            name: org.name,
            contacts: org.contacts.map((c) => ({
              id: c.id,
              displayName: `${c.firstName} ${c.lastName}`.trim(),
              isPrimary: c.isPrimary,
            })),
          }))}
          templateOptions={templateOptions}
          canManageTemplates={templateAuthz.canManage}
          initialAudienceMode={hasSponsorPreselect ? "SPONSORS" : "WHOLE_ORG"}
          initialSponsorMode={hasSponsorPreselect ? "SELECTED" : "ALL_ACTIVE"}
          initialSponsorOrganisationIds={
            sponsorOrganisationId?.trim() ? [sponsorOrganisationId.trim()] : []
          }
          initialSponsorContactIds={sponsorContactIds.map((id) => id.trim()).filter(Boolean)}
          tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
        />
      </CommunicationContentSurface>
    </PageShell>
  );
}

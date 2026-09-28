import { notFound, redirect } from "next/navigation";
import VorlageManagementForm from "@/components/admin/communication/vorlagen/VorlageManagementForm";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePlatformTemplateManage } from "@/lib/communication/templates/platform-template-authorization";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function NewPlatformTemplatePage() {
  const session = await requireAnyPermission(PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  try {
    await requirePlatformTemplateManage({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch {
    redirect("/dashboard/communication/vorlagen");
  }

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

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen", href: "/dashboard/communication/vorlagen" },
          { label: "Neu" },
        ]}
        title="Neue Vorlage"
        description="Inhalte und optionale Standardwerte für wiederkehrende Kommunikation."
      />
      <CommunicationContentSurface>
        <VorlageManagementForm
          mode="create"
          tenantId={tenant.id}
          canManage
          targetGroups={targetGroups.map((tg) => ({
            id: tg.id,
            name: tg.name,
            status: tg.status,
          }))}
          sponsorOrganisations={sponsorOrganisations}
        />
      </CommunicationContentSurface>
    </PageShell>
  );
}

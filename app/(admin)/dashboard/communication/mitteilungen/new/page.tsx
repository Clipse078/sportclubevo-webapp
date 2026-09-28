import { notFound } from "next/navigation";
import ClubCommunicationComposer from "@/components/admin/communication/club/ClubCommunicationComposer";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export const dynamic = "force-dynamic";

export default async function NewClubMitteilungPage() {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  await requireClubCommunicationSend({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const targetGroups = await listZielgruppenForManagement({
    tenantId: tenant.id,
    statusFilter: "ACTIVE",
  });

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen", href: "/dashboard/communication/mitteilungen" },
          { label: "Neu" },
        ]}
        title="Neue Mitteilung"
        description="Inhalt, Empfänger, Kanäle und Zeitpunkt in einem durchgängigen Ablauf."
      />
      <CommunicationContentSurface>
        <ClubCommunicationComposer
          targetGroups={targetGroups.map((tg) => ({
            id: tg.id,
            name: tg.name,
            status: tg.status,
          }))}
          tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
        />
      </CommunicationContentSurface>
    </PageShell>
  );
}

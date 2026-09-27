import { notFound } from "next/navigation";
import ClubCommunicationComposer from "@/components/admin/communication/club/ClubCommunicationComposer";
import { PageBreadcrumbs, PageHeader, PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";

export const dynamic = "force-dynamic";

export default async function NewClubMitteilungPage() {
  const session = await requireAnyPermission([PERMISSIONS.COMMUNICATION_CLUB_SEND]);
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
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen", href: "/dashboard/communication/mitteilungen" },
          { label: "Neu" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Neue Vereinsmitteilung"
        description="Empfänger werden erst bei Veröffentlichung aufgelöst und eingefroren."
      />
      <SectionCard title="Composer">
        <ClubCommunicationComposer
          targetGroups={targetGroups.map((tg) => ({
            id: tg.id,
            name: tg.name,
            status: tg.status,
          }))}
          tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
        />
      </SectionCard>
    </PageShell>
  );
}

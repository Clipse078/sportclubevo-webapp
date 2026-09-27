import { notFound } from "next/navigation";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  await requireAnyPermission([PERMISSIONS.COMMUNICATION_CLUB_SEND]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const targetGroups = await prisma.targetGroup.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });

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
      <CampaignComposer targetGroups={targetGroups} />
    </PageShell>
  );
}

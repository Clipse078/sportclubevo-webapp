import { notFound } from "next/navigation";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS } from "@/lib/communication/zielgruppen/route-access";

export default async function NewCommunicationZielgruppePage() {
  await requireAnyPermission(ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Zielgruppen", href: "/dashboard/communication/zielgruppen" },
          { label: "Neu" },
        ]}
        title="Neue Zielgruppe"
        description="Bestimme, wer zu dieser Zielgruppe gehört."
      />
      <CommunicationContentSurface>
        <ZielgruppeManagementForm mode="create" />
      </CommunicationContentSurface>
    </PageShell>
  );
}

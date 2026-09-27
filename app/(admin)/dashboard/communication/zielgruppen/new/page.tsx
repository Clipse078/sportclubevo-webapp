import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS } from "@/lib/communication/zielgruppen/route-access";

export default async function NewCommunicationZielgruppePage() {
  await requireAnyPermission(ZIELGRUPPEN_MANAGE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Kommunikation · Zielgruppen"
        title="Neue Zielgruppe"
        description="Benenne die Gruppe und definiere strukturelle Zielkriterien."
      />
      <ZielgruppeManagementForm mode="create" />
    </div>
  );
}

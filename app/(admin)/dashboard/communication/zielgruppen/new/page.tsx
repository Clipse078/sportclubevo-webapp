import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export default async function NewCommunicationZielgruppePage() {
  await requireAnyPermission([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE]);
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

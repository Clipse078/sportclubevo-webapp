import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingCreateLegalEntityForm from "@/components/admin/billing/NativeBillingCreateLegalEntityForm";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingNewLegalEntityPage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Neuer Rechtsträger"
        description="Plattform-Rechtsträger für native SCE-Verträge und Rechnungen anlegen."
        actions={
          <Link href="/dashboard/admin/commercial/billing/settings" className="fca-button-secondary">
            Zurück zu Einstellungen
          </Link>
        }
      />
      <NativeBillingCreateLegalEntityForm />
    </div>
  );
}

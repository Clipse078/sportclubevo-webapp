import Link from "next/link";
import NativeBillingCreateLegalEntityForm from "@/components/admin/billing/NativeBillingCreateLegalEntityForm";
import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingNewLegalEntityPage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Abrechnung"
        title="Neuer Rechtsträger"
        description="Plattform-Rechtsträger für native SCE-Verträge und Rechnungen anlegen."
        breadcrumbs={billingWorkspaceBreadcrumbs("Neuer Rechtsträger")}
        contextTabs={<BillingWorkspaceTabs />}
        cancelAction={
          <Link href="/dashboard/admin/commercial/billing/settings" className="fca-button-secondary">
            Zurück zu Einstellungen
          </Link>
        }
      >
        <NativeBillingCreateLegalEntityForm />
      </FormPagePattern>
    </PageShell>
  );
}

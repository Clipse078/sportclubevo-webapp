import Link from "next/link";
import NativeBillingCreateCustomerForm from "@/components/admin/billing/NativeBillingCreateCustomerForm";
import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenants } from "@/lib/tenants/queries";

export default async function NativeBillingNewCustomerPage() {
  await requirePermission(PERMISSIONS.BILLING_MANAGE);

  const tenants = await getTenants();

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Abrechnung"
        title="Neuer Kunde"
        description="Nativen SCE Billing-Kunden anlegen und optional mit einem Club-Tenant verknüpfen."
        breadcrumbs={billingWorkspaceBreadcrumbs("Neuer Kunde")}
        contextTabs={<BillingWorkspaceTabs />}
        cancelAction={
          <Link href="/dashboard/admin/commercial/billing/customers" className="fca-button-secondary">
            Zurück
          </Link>
        }
      >
      <NativeBillingCreateCustomerForm
        tenants={tenants.map((t) => ({
          key: t.key,
          label: `${t.name} (${t.key})`,
        }))}
      />
      </FormPagePattern>
    </PageShell>
  );
}

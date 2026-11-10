import NativeBillingReconciliationImportDetail from "@/components/admin/billing/NativeBillingReconciliationImportDetail";
import BillingWorkspaceTabs from "@/components/admin/billing/shell/BillingWorkspaceTabs";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { billingWorkspaceBreadcrumbs } from "@/lib/nav/billing-workspace-breadcrumbs";
import { getCamt054ReconciliationImportDetail } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-overview-service";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ importKey: string }> };

export default async function NativeBillingReconciliationImportPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);
  const { importKey } = await params;

  let detail: Awaited<ReturnType<typeof getCamt054ReconciliationImportDetail>> | null = null;
  try {
    detail = await getCamt054ReconciliationImportDetail(importKey);
  } catch {
    notFound();
  }

  if (!detail.import.legalEntityKey) {
    notFound();
  }

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Abrechnung"
        title="Import-Details"
        description={`Bankabgleich — ${detail.import.legalEntityName ?? ""}`}
        breadcrumbs={billingWorkspaceBreadcrumbs("Import")}
        contextTabs={<BillingWorkspaceTabs />}
      >
      <NativeBillingReconciliationImportDetail
        legalEntityKey={detail.import.legalEntityKey}
        filename={detail.import.filename}
        transactions={detail.transactions}
        canManage={canManage}
      />
      </DetailPagePattern>
    </PageShell>
  );
}

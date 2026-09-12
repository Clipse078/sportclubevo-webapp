import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingReconciliationImportDetail from "@/components/admin/billing/NativeBillingReconciliationImportDetail";
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
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Import-Details"
        description={`Bankabgleich — ${detail.import.legalEntityName ?? ""}`}
      />
      <NativeBillingReconciliationImportDetail
        legalEntityKey={detail.import.legalEntityKey}
        importKey={importKey}
        filename={detail.import.filename}
        transactions={detail.transactions}
        canManage={canManage}
      />
    </div>
  );
}

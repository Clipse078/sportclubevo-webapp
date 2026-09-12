import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingReconciliationWorkspace from "@/components/admin/billing/NativeBillingReconciliationWorkspace";
import { getCamt054ReconciliationOverview } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-overview-service";
import { listLegalEntitiesForPlatform } from "@/lib/billing/native-billing-service";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingReconciliationPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let legalEntities: Awaited<ReturnType<typeof listLegalEntitiesForPlatform>> = [];
  try {
    legalEntities = await listLegalEntitiesForPlatform();
  } catch {
    legalEntities = [];
  }

  const primaryEntity = legalEntities[0] ?? null;
  let imports: Awaited<ReturnType<typeof getCamt054ReconciliationOverview>>["imports"] = [];

  if (primaryEntity) {
    try {
      const overview = await getCamt054ReconciliationOverview(primaryEntity.key);
      imports = overview.imports;
    } catch {
      imports = [];
    }
  }

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Bankabgleich"
        description="camt.054 Zahlungsavis importieren, per QRR zuordnen und Zahlungen auf SCE-Rechnungen verbuchen."
      />

      {legalEntities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Kein Rechtsträger konfiguriert. Bitte zuerst Billing-Einstellungen prüfen.
        </p>
      ) : (
        <NativeBillingReconciliationWorkspace
          legalEntities={legalEntities.map((e) => ({
            key: e.key,
            displayName: e.displayName,
          }))}
          initialLegalEntityKey={primaryEntity?.key ?? null}
          initialImports={imports}
          canManage={canManage}
        />
      )}
    </div>
  );
}

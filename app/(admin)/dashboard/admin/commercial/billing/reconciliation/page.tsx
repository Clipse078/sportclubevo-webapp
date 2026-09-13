import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import NativeBillingReconciliationWorkspace from "@/components/admin/billing/NativeBillingReconciliationWorkspace";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
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
    <div className="space-y-6">
      <BillingPageHeader
        title="Bankabgleich"
        description="camt.054-Zahlungsavis importieren, per Swiss QR zuordnen und Zahlungen verbuchen."
      />

      <BillingPanel
        title="Betriebsstatus"
        description="Swiss QR und camt.054 für die konfigurierte Rechtsperson."
        className="text-sm"
      >
        <p className="text-[var(--text-2)]">
          {legalEntities.length > 0
            ? `${legalEntities[0]?.displayName ?? "Rechtsträger"} · Import im XML-Format (max. 5 MB)`
            : "Kein Rechtsträger konfiguriert — bitte Einstellungen prüfen."}
        </p>
      </BillingPanel>

      {legalEntities.length === 0 ? (
        <BillingPanel>
          <p className="text-sm text-[var(--text-2)]">
            Bankabgleich ist erst nach Konfiguration eines Rechtsträgers verfügbar.
          </p>
        </BillingPanel>
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

import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingLegalEntitiesTable from "@/components/admin/billing/NativeBillingLegalEntitiesTable";
import {
  listBillingBankAccountsForPlatform,
  listLegalEntitiesForPlatform,
} from "@/lib/billing/native-billing-service";
import { maskIban } from "@/lib/billing/iban-mask";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingSettingsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let legalEntities: Awaited<ReturnType<typeof listLegalEntitiesForPlatform>> = [];
  let bankAccounts: Awaited<ReturnType<typeof listBillingBankAccountsForPlatform>> = [];

  try {
    legalEntities = await listLegalEntitiesForPlatform();
    bankAccounts = await listBillingBankAccountsForPlatform();
  } catch {
    legalEntities = [];
    bankAccounts = [];
  }

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Billing-Einstellungen"
        description="Rechtsträger und Bankkonten für native SCE-Rechnungen (Plattform-only)."
        actions={
          <Link href="/dashboard/admin/commercial/billing" className="fca-button-secondary">
            Zurück zu Billing
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Rechtsträger</h2>
            <p className="text-sm text-muted-foreground">
              Ausstellende Legal Entities für Verträge und Rechnungen.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/dashboard/admin/commercial/billing/settings/legal-entities/new"
              className="fca-button-primary"
            >
              Neuer Rechtsträger
            </Link>
          ) : null}
        </div>
        <NativeBillingLegalEntitiesTable
          canManage={canManage}
          rows={legalEntities.map((entity) => ({
            key: entity.key,
            displayName: entity.displayName,
            legalName: entity.legalName,
            entityType: entity.entityType,
            status: entity.status,
            city: entity.city,
            countryCode: entity.countryCode,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Bankkonten</h2>
        <p className="text-sm text-muted-foreground">
          Bankverbindungen werden separat konfiguriert (nicht Teil dieser Maske).
        </p>
        {bankAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Bankkonten konfiguriert.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {bankAccounts.map((account) => (
              <li key={account.id} className="rounded-lg border border-border p-3">
                <div className="font-medium">{account.label}</div>
                <div className="text-muted-foreground">
                  IBAN: {maskIban(account.iban)}
                  {account.qrIban ? ` · QR-IBAN: ${maskIban(account.qrIban)}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.referenceStrategy}
                  {account.isDefault ? " · Standard" : ""}
                  {account.activeUntil ? " · inaktiv" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

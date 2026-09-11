import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import {
  listBillingBankAccountsForPlatform,
  listLegalEntitiesForPlatform,
} from "@/lib/billing/native-billing-service";
import { maskIban } from "@/lib/billing/iban-mask";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingSettingsPage() {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

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
        title="Billing Settings"
        description="Legal Entities und Bankkonten für native SCE-Rechnungen (Plattform-only)."
        actions={
          <Link href="/dashboard/admin/commercial/billing" className="fca-button-secondary">
            Zurück zu Billing
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Legal Entities</h2>
        {legalEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Legal Entities konfiguriert.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {legalEntities.map((entity) => (
              <li key={entity.id} className="rounded-lg border border-border p-3">
                <div className="font-medium">{entity.displayName}</div>
                <div className="text-muted-foreground">{entity.legalName}</div>
                <div className="text-muted-foreground">
                  {entity.addressLine1} {entity.houseNumber ?? ""}, {entity.postalCode} {entity.city}
                </div>
                <div className="text-xs text-muted-foreground">Key: {entity.key} · {entity.status}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Bank Accounts</h2>
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

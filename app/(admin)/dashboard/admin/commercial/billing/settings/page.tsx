import Link from "next/link";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import NativeBillingCreateBankAccountDialog from "@/components/admin/billing/NativeBillingCreateBankAccountDialog";
import NativeBillingDeleteBankAccountButton from "@/components/admin/billing/NativeBillingDeleteBankAccountButton";
import NativeBillingLegalEntitiesTable from "@/components/admin/billing/NativeBillingLegalEntitiesTable";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import {
  listBillingBankAccountsForPlatform,
  listLegalEntitiesForPlatform,
} from "@/lib/billing/native-billing-service";
import { maskIban } from "@/lib/billing/iban-mask";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function referenceStrategyLabel(strategy: string): string {
  switch (strategy) {
    case "QRR":
      return "QRR";
    case "SCOR":
      return "SCOR";
    default:
      return strategy;
  }
}

export default async function NativeBillingSettingsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let legalEntities: Awaited<ReturnType<typeof listLegalEntitiesForPlatform>> = [];
  let bankAccounts: Awaited<ReturnType<typeof listBillingBankAccountsForPlatform>> = [];

  try {
    legalEntities = await listLegalEntitiesForPlatform();
  } catch {
    legalEntities = [];
  }

  try {
    bankAccounts = await listBillingBankAccountsForPlatform();
  } catch {
    bankAccounts = [];
  }

  const legalEntityLabelById = new Map(
    legalEntities.map((entity) => [entity.id, entity.displayName]),
  );

  return (
    <div className="space-y-8">
      <BillingPageHeader
        title="Einstellungen"
        description="Rechtsträger, Bankkonten und Abrechnungsgrundlagen für native SCE-Rechnungen."
        actions={
          canManage ? (
            <Link
              href="/dashboard/admin/commercial/billing/settings/legal-entities/new"
              className="fca-button-secondary"
            >
              Rechtsträger hinzufügen
            </Link>
          ) : undefined
        }
      />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Rechtsträger
        </h2>
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Bankkonten
          </h2>
          {canManage ? (
            <NativeBillingCreateBankAccountDialog
              legalEntities={legalEntities.map((entity) => ({
                key: entity.key,
                label: entity.displayName,
              }))}
            />
          ) : null}
        </div>

        {bankAccounts.length === 0 ? (
          <BillingPanel>
            <p className="text-sm text-[var(--text-2)]">
              Noch keine Bankkonten konfiguriert. Fügen Sie ein CHF-Geschäftskonto mit
              Referenzstrategie hinzu.
            </p>
          </BillingPanel>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {bankAccounts.map((account) => (
              <li key={account.id}>
                <BillingPanel className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{account.label}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {legalEntityLabelById.get(account.legalEntityId) ?? "Rechtsträger"}
                      </p>
                    </div>
                    {account.isDefault ? (
                      <BillingStatusBadge label="Standardkonto" tone="success" />
                    ) : null}
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">IBAN</dt>
                      <dd className="font-mono text-xs">{maskIban(account.iban)}</dd>
                    </div>
                    {account.qrIban ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--muted)]">QR-IBAN</dt>
                        <dd className="font-mono text-xs">{maskIban(account.qrIban)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">Referenz</dt>
                      <dd>{referenceStrategyLabel(account.referenceStrategy)}</dd>
                    </div>
                  </dl>
                  {canManage ? (
                    <div className="mt-4 border-t border-[color-mix(in_srgb,var(--border)_40%,transparent)] pt-3">
                      <NativeBillingDeleteBankAccountButton
                        accountId={account.id}
                        label={account.label}
                        legalEntityLabel={
                          legalEntityLabelById.get(account.legalEntityId) ??
                          account.legalEntityId
                        }
                        referenceStrategy={account.referenceStrategy}
                        ibanMasked={maskIban(account.iban) ?? "****"}
                        qrIbanMasked={account.qrIban ? maskIban(account.qrIban) : null}
                      />
                    </div>
                  ) : null}
                </BillingPanel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { getBillingCustomerDetail } from "@/lib/billing/native-billing-service";
import { presentBillingCustomerStatus } from "@/lib/billing/native-billing-presentation";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = {
  params: Promise<{ customerKey: string }>;
};

export default async function NativeBillingCustomerDetailPage({ params }: PageProps) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);
  const { customerKey } = await params;

  let detail: Awaited<ReturnType<typeof getBillingCustomerDetail>>;
  try {
    detail = await getBillingCustomerDetail(customerKey);
  } catch (error) {
    if (error instanceof NativeBillingNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { customer, tenantLinks, profiles } = detail;
  const statusPresentation = presentBillingCustomerStatus(customer.status);
  const billingProfile = profiles.find((p) => p.profileType === "BILLING") ?? profiles[0];

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={customer.displayName}
        description={`Kundennummer ${customer.key}`}
        actions={
          <Link href="/dashboard/admin/commercial/billing/customers" className="fca-button-secondary">
            Zurück zur Liste
          </Link>
        }
      />

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Profil</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Rechtlicher Name</dt>
            <dd>{customer.legalName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">E-Mail</dt>
            <dd>{customer.primaryEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <BillingStatusBadge
                label={statusPresentation.label}
                tone={statusPresentation.tone}
              />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kundennummer</dt>
            <dd className="font-mono text-xs">{customer.key}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Währung / Sprache</dt>
            <dd>
              {[customer.defaultCurrency, customer.defaultLanguage].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Verknüpfte Tenants</h2>
        {tenantLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Tenant-Verknüpfungen.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {tenantLinks.map((link) => (
              <li key={link.id}>
                {link.tenantName ?? link.tenantKey ?? link.tenantId}
                {link.activeUntil ? " (inaktiv)" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Rechnungsadresse</h2>
        {!billingProfile ? (
          <p className="text-sm text-muted-foreground">Keine Rechnungsadresse erfasst.</p>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{billingProfile.companyOrName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Strasse</dt>
              <dd>
                {billingProfile.street}
                {billingProfile.houseNumber ? ` ${billingProfile.houseNumber}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">PLZ / Ort</dt>
              <dd>
                {billingProfile.postalCode} {billingProfile.city}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Land</dt>
              <dd>{billingProfile.countryCode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rechnungs-E-Mail</dt>
              <dd>{billingProfile.invoiceEmail ?? customer.primaryEmail ?? "—"}</dd>
            </div>
          </dl>
        )}
      </section>
    </div>
  );
}

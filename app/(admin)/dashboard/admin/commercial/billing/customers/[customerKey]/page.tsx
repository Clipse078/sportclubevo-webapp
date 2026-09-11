import Link from "next/link";
import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { getBillingCustomerDetail } from "@/lib/billing/native-billing-service";
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

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={customer.displayName}
        description={`Billing-Kunde · ${customer.key}`}
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
            <dd>{customer.status}</dd>
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
        <h2 className="text-sm font-semibold">Billing-Profile / Adressen</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Profile erfasst.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {profiles.map((profile) => (
              <li key={profile.id} className="rounded-md bg-muted/30 p-3">
                <div className="font-medium">{profile.profileType}</div>
                <div>{profile.companyOrName}</div>
                <div className="text-muted-foreground">
                  {profile.street} {profile.houseNumber ?? ""}, {profile.postalCode} {profile.city},{" "}
                  {profile.countryCode}
                </div>
                {profile.invoiceEmail ? (
                  <div className="text-muted-foreground">Rechnung: {profile.invoiceEmail}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingInvoiceActions from "@/components/admin/billing/NativeBillingInvoiceActions";
import { getInvoiceDetail } from "@/lib/billing/native-billing-commercial-service";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { serializeInvoiceLine } from "@/lib/billing/native-billing-commercial-serializers";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = { params: Promise<{ invoiceKey: string }> };

export default async function NativeBillingInvoiceDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);
  const { invoiceKey } = await params;

  let detail: Awaited<ReturnType<typeof getInvoiceDetail>> | null = null;
  try {
    detail = await getInvoiceDetail(invoiceKey);
  } catch {
    detail = null;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Rechnung nicht gefunden.</p>
        <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
          Zurück
        </Link>
      </div>
    );
  }

  const { invoice, lines, taxSnapshots, issuer, recipient } = detail;
  const customer = await findBillingCustomerById(invoice.billingCustomerId);
  const serializedLines = lines.map(serializeInvoiceLine);
  const grossFormatted = formatBillingMoney(invoice.grossTotalMinor, invoice.currency);

  return (
    <div className="space-y-10">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={invoice.invoiceNumber ?? "Rechnungsentwurf"}
        description={
          invoice.contractLabel ??
          `${customer?.displayName ?? "Kunde"} · ${invoice.periodStart.toISOString().slice(0, 10)} – ${invoice.periodEnd.toISOString().slice(0, 10)}`
        }
        actions={
          <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
            Zurück
          </Link>
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p className="text-lg font-semibold">{invoice.status}</p>
        </div>
        <NativeBillingInvoiceActions
          invoiceKey={invoice.key}
          status={invoice.status}
          canManage={canManage}
          grossTotalFormatted={grossFormatted}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Aussteller</h2>
          {issuer ? (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p className="text-foreground font-medium">{issuer.legalName}</p>
              <p>{issuer.displayName}</p>
              <p>
                {issuer.addressLine1} {issuer.houseNumber ?? ""}
              </p>
              <p>{issuer.postalCode} {issuer.city}</p>
              {issuer.uid ? <p>UID: {issuer.uid}</p> : null}
              {issuer.vatId ? <p>MWST: {issuer.vatId}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {invoice.status === "DRAFT"
                ? "Wird bei Finalisierung eingefroren."
                : "—"}
            </p>
          )}
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Empfänger</h2>
          {recipient ? (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p className="text-foreground font-medium">{recipient.companyOrName}</p>
              <p>
                {recipient.street} {recipient.houseNumber ?? ""}
              </p>
              <p>{recipient.postalCode} {recipient.city}</p>
              {recipient.invoiceEmail ? <p>{recipient.invoiceEmail}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {customer?.displayName ?? "—"}
              {invoice.status === "DRAFT" ? " (Profil bei Finalisierung)" : ""}
            </p>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Positionen</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Beschreibung</th>
                <th className="px-4 py-3 font-medium">Menge</th>
                <th className="px-4 py-3 font-medium">Einzelpreis netto</th>
                <th className="px-4 py-3 font-medium">Netto</th>
                <th className="px-4 py-3 font-medium">MWST</th>
                <th className="px-4 py-3 font-medium">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {serializedLines.map((line) => (
                <tr key={line.id} className="border-t border-border">
                  <td className="px-4 py-3">{line.description}</td>
                  <td className="px-4 py-3 tabular-nums">{line.quantity}</td>
                  <td className="px-4 py-3 tabular-nums">{line.unitPriceNetFormatted}</td>
                  <td className="px-4 py-3 tabular-nums">{line.lineNetFormatted}</td>
                  <td className="px-4 py-3 tabular-nums">{line.vatFormatted}</td>
                  <td className="px-4 py-3 tabular-nums">{line.lineGrossFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-sm ml-auto space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Netto</span>
          <span className="tabular-nums font-medium">
            {formatBillingMoney(invoice.netTotalMinor, invoice.currency)}
          </span>
        </div>
        {taxSnapshots.map((tax) => (
          <div key={tax.id} className="flex justify-between">
            <span className="text-muted-foreground">{tax.taxLabel}</span>
            <span className="tabular-nums">
              {formatBillingMoney(tax.taxAmountMinor, tax.currency)}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total</span>
          <span className="tabular-nums font-semibold">{grossFormatted}</span>
        </div>
      </section>

      <dl className="grid gap-3 sm:grid-cols-2 max-w-2xl text-sm text-muted-foreground">
        <div>
          <dt>Leistungszeitraum</dt>
          <dd className="text-foreground">
            {invoice.periodStart.toISOString().slice(0, 10)} –{" "}
            {invoice.periodEnd.toISOString().slice(0, 10)}
          </dd>
        </div>
        <div>
          <dt>Rechnungsdatum</dt>
          <dd className="text-foreground">
            {invoice.invoiceDate ? invoice.invoiceDate.toISOString().slice(0, 10) : "—"}
          </dd>
        </div>
        <div>
          <dt>Fällig</dt>
          <dd className="text-foreground">
            {invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "—"}
          </dd>
        </div>
        {invoice.finalizedAt ? (
          <div>
            <dt>Finalisiert</dt>
            <dd className="text-foreground">{invoice.finalizedAt.toISOString()}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-xs text-muted-foreground">
        PDF und Versand folgen in späteren Schritten (SWISS-01E / SWISS-01F).
      </p>
    </div>
  );
}

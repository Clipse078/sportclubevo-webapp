import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import NativeBillingInvoiceActions from "@/components/admin/billing/NativeBillingInvoiceActions";
import NativeBillingInvoicePdfActions from "@/components/admin/billing/NativeBillingInvoicePdfActions";
import NativeBillingInvoiceDeliverySection from "@/components/admin/billing/NativeBillingInvoiceDeliverySection";
import NativeBillingInvoicePaymentSection from "@/components/admin/billing/NativeBillingInvoicePaymentSection";
import { getInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import {
  formatPaymentReferenceDisplay,
  presentReferenceTypeLabel,
  serializeInvoicePaymentInstructionMasked,
} from "@/lib/billing/invoice-payment-instruction-serializers";
import { getInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-summary";
import { serializeInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";
import { getInvoiceDetail } from "@/lib/billing/native-billing-commercial-service";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { formatBillingMoney } from "@/lib/billing/format-billing-money";
import { serializeInvoiceLine } from "@/lib/billing/native-billing-commercial-serializers";
import {
  formatBillingDateDisplay,
  formatBillingPeriodDisplay,
  presentInvoiceDisplayNumber,
  presentNativeInvoiceStatus,
} from "@/lib/billing/native-billing-presentation";
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
  const statusPresentation = presentNativeInvoiceStatus(invoice.status);
  const displayTitle = presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status);
  const periodLabel = formatBillingPeriodDisplay(invoice.periodStart, invoice.periodEnd);

  let deliverySummarySerialized: ReturnType<
    typeof serializeInvoiceDeliverySummary
  > | null = null;
  if (invoice.status === "FINALIZED") {
    const deliverySummary = await getInvoiceDeliverySummary(invoice.key);
    if (deliverySummary) {
      deliverySummarySerialized = serializeInvoiceDeliverySummary(deliverySummary);
    }
  }

  let paymentInstructionView: ReturnType<
    typeof serializeInvoicePaymentInstructionMasked
  > | null = null;
  if (invoice.status === "FINALIZED") {
    try {
      const instruction = await getInvoicePaymentInstruction(invoice.key);
      paymentInstructionView = instruction
        ? serializeInvoicePaymentInstructionMasked(instruction)
        : null;
    } catch {
      paymentInstructionView = null;
    }
  }

  return (
    <div className="space-y-10">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={displayTitle}
        description={
          invoice.contractLabel ??
          `${customer?.displayName ?? "Kunde"} · ${periodLabel}`
        }
        actions={
          <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
            Zurück
          </Link>
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <BillingStatusBadge
            label={statusPresentation.label}
            tone={statusPresentation.tone}
          />
        </div>
        <NativeBillingInvoiceActions
          invoiceKey={invoice.key}
          status={invoice.status}
          canManage={canManage}
          grossTotalFormatted={grossFormatted}
        />
        <NativeBillingInvoicePdfActions invoiceKey={invoice.key} status={invoice.status} />
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl text-sm">
        <div>
          <dt className="text-muted-foreground">Rechnungsnummer</dt>
          <dd className="font-medium text-foreground">
            {invoice.invoiceNumber ?? "Noch keine Rechnungsnummer"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kunde</dt>
          <dd className="font-medium text-foreground">{customer?.displayName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Abrechnungszeitraum</dt>
          <dd className="font-medium text-foreground">{periodLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rechnungsdatum</dt>
          <dd className="font-medium text-foreground">
            {formatBillingDateDisplay(invoice.invoiceDate)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fällig am</dt>
          <dd className="font-medium text-foreground">
            {formatBillingDateDisplay(invoice.dueDate)}
          </dd>
        </div>
        {invoice.paymentTermsDays != null ? (
          <div>
            <dt className="text-muted-foreground">Zahlungsziel</dt>
            <dd className="font-medium text-foreground">{invoice.paymentTermsDays} Tage</dd>
          </div>
        ) : null}
      </dl>

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
              <p>
                {issuer.postalCode} {issuer.city}
              </p>
              {issuer.uid ? <p>UID: {issuer.uid}</p> : null}
              {issuer.vatId ? <p>MWST-Nr.: {issuer.vatId}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {invoice.status === "DRAFT"
                ? "Ausstellerdaten werden bei der Finalisierung übernommen."
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
              <p>
                {recipient.postalCode} {recipient.city}
              </p>
              {recipient.invoiceEmail ? <p>{recipient.invoiceEmail}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {customer?.displayName ?? "—"}
              {invoice.status === "DRAFT"
                ? " — Rechnungsadresse wird bei der Finalisierung übernommen."
                : ""}
            </p>
          )}
        </section>
      </div>

      {invoice.status === "FINALIZED" ? (
        <NativeBillingInvoiceDeliverySection
          invoiceKey={invoice.key}
          invoiceNumber={invoice.invoiceNumber}
          grossTotalFormatted={grossFormatted}
          recipientEmail={recipient?.invoiceEmail ?? null}
          canManage={canManage}
          status={invoice.status}
          initialDelivery={deliverySummarySerialized}
        />
      ) : null}

      {invoice.status === "FINALIZED" ? (
        <NativeBillingInvoicePaymentSection
          invoiceKey={invoice.key}
          canManage={canManage}
          amountFormatted={grossFormatted}
          initialInstruction={
            paymentInstructionView
              ? {
                  referenceType: presentReferenceTypeLabel(
                    paymentInstructionView.referenceType,
                  ),
                  referenceFormatted: formatPaymentReferenceDisplay(
                    paymentInstructionView.referenceType,
                    paymentInstructionView.reference,
                  ),
                  creditorAccountMasked: paymentInstructionView.creditorAccountMasked,
                  amountMinor: paymentInstructionView.amountMinor,
                  currency: paymentInstructionView.currency,
                }
              : null
          }
        />
      ) : null}

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
          <span className="font-semibold">Total brutto</span>
          <span className="tabular-nums font-semibold">{grossFormatted}</span>
        </div>
      </section>

      {invoice.finalizedAt ? (
        <p className="text-sm text-muted-foreground">
          Finalisiert am {formatBillingDateDisplay(invoice.finalizedAt)}
        </p>
      ) : null}
    </div>
  );
}

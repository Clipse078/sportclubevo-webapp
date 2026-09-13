import Link from "next/link";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import NativeBillingInvoiceActions from "@/components/admin/billing/NativeBillingInvoiceActions";
import NativeBillingInvoiceDeliverySection from "@/components/admin/billing/NativeBillingInvoiceDeliverySection";
import NativeBillingInvoiceLifecycleTimeline from "@/components/admin/billing/NativeBillingInvoiceLifecycleTimeline";
import NativeBillingInvoicePaymentSection from "@/components/admin/billing/NativeBillingInvoicePaymentSection";
import NativeBillingInvoiceSendReviewDialog from "@/components/admin/billing/NativeBillingInvoiceSendReviewDialog";
import NativeBillingInvoiceSettlementsSection from "@/components/admin/billing/NativeBillingInvoiceSettlementsSection";
import BillingDataTableShell, {
  BillingDataTableCell,
  BillingDataTableHead,
  BillingDataTableHeaderCell,
  BillingDataTableRow,
} from "@/components/admin/billing/shell/BillingDataTable";
import { getInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-service";
import { serializeInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-serializers";
import { getInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import {
  formatPaymentReferenceDisplay,
  presentReferenceTypeLabel,
  serializeInvoicePaymentInstructionMasked,
} from "@/lib/billing/invoice-payment-instruction-serializers";
import { getInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-summary";
import { serializeInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";
import { getInvoiceDetail } from "@/lib/billing/native-billing-commercial-service";
import { findBillingContractById } from "@/lib/billing/native-billing-commercial-repository";
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

function deliveryStatusLabel(
  aggregateStatus: string | undefined,
  aggregateStatusLabel: string | undefined,
): { label: string; tone: "success" | "warning" | "muted" | "default" } {
  switch (aggregateStatus) {
    case "SENT":
      return { label: "Versendet", tone: "success" };
    case "FAILED":
      return { label: "Versand fehlgeschlagen", tone: "warning" };
    case "SENDING":
      return { label: "Wird gesendet", tone: "default" };
    default:
      return {
        label: aggregateStatusLabel ?? "Noch nicht versendet",
        tone: "muted",
      };
  }
}

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
        <BillingPageHeader title="Rechnung nicht gefunden" />
        <Link href="/dashboard/admin/commercial/billing/invoices" className="fca-button-secondary">
          Zurück zur Liste
        </Link>
      </div>
    );
  }

  const { invoice, lines, taxSnapshots, issuer, recipient } = detail;
  const customer = await findBillingCustomerById(invoice.billingCustomerId);
  const contract = invoice.billingContractId
    ? await findBillingContractById(invoice.billingContractId)
    : null;
  const serializedLines = lines.map(serializeInvoiceLine);
  const grossFormatted = formatBillingMoney(invoice.grossTotalMinor, invoice.currency);
  const netFormatted = formatBillingMoney(invoice.netTotalMinor, invoice.currency);
  const statusPresentation = presentNativeInvoiceStatus(invoice.status);
  const displayTitle = presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status);
  const periodLabel = formatBillingPeriodDisplay(invoice.periodStart, invoice.periodEnd);
  const dueDateFormatted = formatBillingDateDisplay(invoice.dueDate);
  const invoiceDateFormatted = formatBillingDateDisplay(invoice.invoiceDate);

  let deliverySummarySerialized: ReturnType<
    typeof serializeInvoiceDeliverySummary
  > | null = null;
  if (invoice.status === "FINALIZED") {
    const deliverySummary = await getInvoiceDeliverySummary(invoice.key);
    if (deliverySummary) {
      deliverySummarySerialized = serializeInvoiceDeliverySummary(deliverySummary);
    }
  }

  const payableForSettlements = new Set([
    "FINALIZED",
    "OPEN",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
  ]);
  let paymentSummarySerialized: ReturnType<
    typeof serializeInvoicePaymentSummary
  > | null = null;
  if (payableForSettlements.has(invoice.status)) {
    const paymentSummary = await getInvoicePaymentSummary(invoice.key);
    if (paymentSummary) {
      paymentSummarySerialized = serializeInvoicePaymentSummary(paymentSummary);
    }
  }

  let paymentInstructionView: ReturnType<
    typeof serializeInvoicePaymentInstructionMasked
  > | null = null;
  if (payableForSettlements.has(invoice.status)) {
    try {
      const instruction = await getInvoicePaymentInstruction(invoice.key);
      paymentInstructionView = instruction
        ? serializeInvoicePaymentInstructionMasked(instruction)
        : null;
    } catch {
      paymentInstructionView = null;
    }
  }

  const deliveryBadge = deliveryStatusLabel(
    deliverySummarySerialized?.aggregateStatus,
    deliverySummarySerialized?.aggregateStatusLabel,
  );

  const paidFormatted =
    paymentSummarySerialized?.paidTotalFormatted ??
    formatBillingMoney(0, invoice.currency);
  const outstandingFormatted =
    paymentSummarySerialized?.outstandingFormatted ?? grossFormatted;

  const isVoid = invoice.status === "VOID";
  const isHistoricalVoid = isVoid;

  return (
    <BillingWorkspaceContent width="detail">
      <div className={`space-y-8 ${isHistoricalVoid ? "opacity-95" : ""}`}>
      <div className="space-y-6">
        <BillingPageHeader
          size="hero"
          title={`Rechnung ${displayTitle}`}
          description={customer?.displayName ?? "Kunde"}
          actions={
            <Link
              href="/dashboard/admin/commercial/billing/invoices"
              className="fca-button-secondary"
            >
              Zurück
            </Link>
          }
        />

        {isHistoricalVoid ? (
          <p className="rounded-md bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-4 py-3 text-sm text-[var(--text-2)] ring-1 ring-[color-mix(in_srgb,var(--border)_45%,transparent)]">
            Diese Rechnung wurde storniert und ist nicht zahlungswirksam.
          </p>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <BillingStatusBadge
                label={statusPresentation.label.toUpperCase()}
                tone={statusPresentation.tone}
              />
              {invoice.status === "FINALIZED" ? (
                <BillingStatusBadge
                  label={deliveryBadge.label.toUpperCase()}
                  tone={deliveryBadge.tone}
                />
              ) : null}
            </div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{grossFormatted}</p>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--text-2)]">
              <div>
                <dt className="inline text-[var(--muted)]">Rechnungsdatum </dt>
                <dd className="inline font-medium text-[var(--foreground)]">
                  {invoiceDateFormatted}
                </dd>
              </div>
              <div>
                <dt className="inline text-[var(--muted)]">Fällig </dt>
                <dd className="inline font-medium text-[var(--foreground)]">{dueDateFormatted}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            {!isHistoricalVoid ? (
              <>
            <NativeBillingInvoiceSendReviewDialog
              invoiceKey={invoice.key}
              invoiceNumber={invoice.invoiceNumber}
              grossTotalFormatted={grossFormatted}
              dueDateFormatted={dueDateFormatted}
              recipientEmail={recipient?.invoiceEmail ?? null}
              canManage={canManage}
              status={invoice.status}
              initialDelivery={deliverySummarySerialized}
            />
            <NativeBillingInvoiceActions
              invoiceKey={invoice.key}
              status={invoice.status}
              canManage={canManage}
              grossTotalFormatted={grossFormatted}
            />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BillingPanel title="Finanzübersicht">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Netto</dt>
              <dd className="tabular-nums font-medium">{netFormatted}</dd>
            </div>
            {taxSnapshots.map((tax) => (
              <div key={tax.id} className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">{tax.taxLabel}</dt>
                <dd className="tabular-nums">
                  {formatBillingMoney(tax.taxAmountMinor, tax.currency)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-[color-mix(in_srgb,var(--border)_45%,transparent)] pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="tabular-nums font-semibold">{grossFormatted}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Bezahlt</dt>
              <dd className="tabular-nums">{paidFormatted}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Offen</dt>
              <dd className="tabular-nums font-semibold">{outstandingFormatted}</dd>
            </div>
          </dl>
        </BillingPanel>

        <BillingPanel title="Empfänger">
          {recipient ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-[var(--foreground)]">{recipient.companyOrName}</p>
              <p className="text-[var(--text-2)]">
                {recipient.street} {recipient.houseNumber ?? ""}
              </p>
              <p className="text-[var(--text-2)]">
                {recipient.postalCode} {recipient.city}
              </p>
              {recipient.invoiceEmail ? (
                <p className="pt-2 text-[var(--foreground)]">{recipient.invoiceEmail}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-2)]">
              {customer?.displayName ?? "—"}
              {invoice.status === "DRAFT"
                ? " — Adresse wird bei der Finalisierung übernommen."
                : ""}
            </p>
          )}
        </BillingPanel>

        <BillingPanel title="Vertrag & Leistung">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">Produkt</dt>
              <dd className="font-medium">{invoice.contractLabel ?? contract?.productName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Leistungszeitraum</dt>
              <dd>{periodLabel}</dd>
            </div>
            {contract ? (
              <div>
                <dt className="text-[var(--muted)]">Vertrag</dt>
                <dd>
                  <Link
                    href={`/dashboard/admin/commercial/billing/contracts/${contract.key}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {contract.contractNumber}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </BillingPanel>

        {invoice.status === "FINALIZED" ? (
          <BillingPanel title="Zahlung (Swiss QR)">
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
              embedded
            />
          </BillingPanel>
        ) : null}
      </div>

      {invoice.status === "FINALIZED" ? (
        <BillingPanel title="Versand">
          <NativeBillingInvoiceDeliverySection
            invoiceKey={invoice.key}
            invoiceNumber={invoice.invoiceNumber}
            grossTotalFormatted={grossFormatted}
            recipientEmail={recipient?.invoiceEmail ?? null}
            canManage={canManage}
            status={invoice.status}
            initialDelivery={deliverySummarySerialized}
            hideSendActions
          />
        </BillingPanel>
      ) : null}

      {payableForSettlements.has(invoice.status) && paymentSummarySerialized ? (
        <BillingPanel title="Zahlungen">
          <NativeBillingInvoiceSettlementsSection
            invoiceKey={invoice.key}
            invoiceNumber={invoice.invoiceNumber}
            customerName={customer?.displayName ?? "—"}
            canManage={canManage}
            initialSummary={paymentSummarySerialized}
            defaultReference={
              paymentInstructionView?.reference
                ? formatPaymentReferenceDisplay(
                    paymentInstructionView.referenceType,
                    paymentInstructionView.reference,
                  )
                : null
            }
          />
        </BillingPanel>
      ) : null}

      <BillingPanel title="Positionen">
        <BillingDataTableShell>
          <BillingDataTableHead>
            <tr>
              <BillingDataTableHeaderCell>Beschreibung</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Menge</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Einzelpreis netto</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Netto</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">MWST</BillingDataTableHeaderCell>
              <BillingDataTableHeaderCell align="right">Brutto</BillingDataTableHeaderCell>
            </tr>
          </BillingDataTableHead>
          <tbody>
            {serializedLines.map((line) => (
              <BillingDataTableRow key={line.id}>
                <BillingDataTableCell>{line.description}</BillingDataTableCell>
                <BillingDataTableCell align="right">{line.quantity}</BillingDataTableCell>
                <BillingDataTableCell align="right">{line.unitPriceNetFormatted}</BillingDataTableCell>
                <BillingDataTableCell align="right">{line.lineNetFormatted}</BillingDataTableCell>
                <BillingDataTableCell align="right">{line.vatFormatted}</BillingDataTableCell>
                <BillingDataTableCell align="right">{line.lineGrossFormatted}</BillingDataTableCell>
              </BillingDataTableRow>
            ))}
          </tbody>
        </BillingDataTableShell>
      </BillingPanel>

      <BillingPanel title="Aktivität">
        <NativeBillingInvoiceLifecycleTimeline
          invoiceCreatedAt={invoice.createdAt.toISOString()}
          finalizedAt={invoice.finalizedAt?.toISOString() ?? null}
          delivery={deliverySummarySerialized}
          paymentSummary={paymentSummarySerialized}
        />
      </BillingPanel>

      {issuer ? (
        <details className="text-xs text-[var(--muted)]">
          <summary className="cursor-pointer">Aussteller (intern)</summary>
          <p className="mt-2">
            {issuer.legalName} · {issuer.city}
          </p>
        </details>
      ) : null}
      </div>
    </BillingWorkspaceContent>
  );
}

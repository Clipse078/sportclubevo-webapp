import Link from "next/link";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import NativeBillingInvoicesTable from "@/components/admin/billing/NativeBillingInvoicesTable";
import { getInvoicesOverview } from "@/lib/billing/native-billing-commercial-service";
import {
  formatBillingPeriodDisplay,
  presentInvoiceDisplayNumber,
} from "@/lib/billing/native-billing-presentation";
import { listBillingCustomers } from "@/lib/billing/native-billing-repository";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function NativeBillingInvoicesPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  let invoices: Awaited<ReturnType<typeof getInvoicesOverview>> = [];
  let customers: Awaited<ReturnType<typeof listBillingCustomers>> = [];
  try {
    [invoices, customers] = await Promise.all([
      getInvoicesOverview(),
      listBillingCustomers(),
    ]);
  } catch {
    invoices = [];
    customers = [];
  }

  const customerById = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title="Rechnungen"
        description="SCE-Rechnungen: Entwurf, Finalisierung und Status — ohne Versand oder PDF in diesem Schritt."
        actions={
          canManage ? (
            <Link href="/dashboard/admin/commercial/billing/invoices/new" className="fca-button-primary">
              Rechnungsentwurf
            </Link>
          ) : undefined
        }
      />

      <NativeBillingInvoicesTable
        rows={invoices.map((invoice) => ({
          key: invoice.key,
          displayNumber: presentInvoiceDisplayNumber(invoice.invoiceNumber, invoice.status),
          customerLabel: customerById.get(invoice.billingCustomerId) ?? invoice.billingCustomerId,
          periodLabel: formatBillingPeriodDisplay(invoice.periodStart, invoice.periodEnd),
          invoiceDate: invoice.invoiceDate
            ? invoice.invoiceDate.toISOString().slice(0, 10)
            : null,
          netTotalMinor: invoice.netTotalMinor,
          vatTotalMinor: invoice.vatTotalMinor,
          grossTotalMinor: invoice.grossTotalMinor,
          currency: invoice.currency,
          status: invoice.status,
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
        }))}
      />
    </div>
  );
}

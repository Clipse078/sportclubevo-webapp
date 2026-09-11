import Link from "next/link";
import type { BillingCustomerStatus } from "@prisma/client";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { presentBillingCustomerStatus } from "@/lib/billing/native-billing-presentation";

export type NativeBillingCustomerRow = {
  key: string;
  displayName: string;
  legalName: string | null;
  primaryEmail: string | null;
  status: BillingCustomerStatus;
  tenantLabels: string[];
};

type Props = {
  rows: NativeBillingCustomerRow[];
  canManage?: boolean;
};

export default function NativeBillingCustomersTable({ rows, canManage = false }: Props) {
  if (rows.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed border-border p-6">
        <p className="text-sm text-muted-foreground">
          Noch keine nativen Billing-Kunden erfasst.
        </p>
        {canManage ? (
          <Link href="/dashboard/admin/commercial/billing/customers/new" className="fca-button-primary inline-flex">
            Neuer Kunde
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Kunde</th>
            <th className="px-4 py-3 font-medium">Kundennummer</th>
            <th className="px-4 py-3 font-medium">Club / Tenant</th>
            <th className="px-4 py-3 font-medium">Rechnungs-E-Mail</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusPresentation = presentBillingCustomerStatus(row.status);
            const billingEmail = row.primaryEmail;
            return (
              <tr key={row.key} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/commercial/billing/customers/${row.key}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.displayName}
                  </Link>
                  {row.legalName && row.legalName !== row.displayName ? (
                    <div className="text-xs text-muted-foreground">{row.legalName}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.key}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.tenantLabels.length > 0 ? row.tenantLabels.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{billingEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  <BillingStatusBadge
                    label={statusPresentation.label}
                    tone={statusPresentation.tone}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

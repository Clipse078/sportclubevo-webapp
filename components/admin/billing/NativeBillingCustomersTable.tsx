import Link from "next/link";
import type { BillingCustomerStatus } from "@prisma/client";

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
};

export default function NativeBillingCustomersTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine nativen Billing-Kunden erfasst.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Anzeigename</th>
            <th className="px-4 py-3 font-medium">Rechtlicher Name</th>
            <th className="px-4 py-3 font-medium">Tenants</th>
            <th className="px-4 py-3 font-medium">E-Mail</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/admin/commercial/billing/customers/${row.key}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.displayName}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.legalName ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.tenantLabels.length > 0 ? row.tenantLabels.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{row.primaryEmail ?? "—"}</td>
              <td className="px-4 py-3">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

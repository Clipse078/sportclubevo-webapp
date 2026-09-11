import Link from "next/link";
import type { LegalEntityStatus } from "@prisma/client";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import {
  presentLegalEntityStatus,
  presentLegalEntityType,
} from "@/lib/billing/native-billing-presentation";

export type NativeBillingLegalEntityRow = {
  key: string;
  displayName: string;
  legalName: string;
  entityType: string | null;
  status: LegalEntityStatus;
  city: string;
  countryCode: string;
};

type Props = {
  rows: NativeBillingLegalEntityRow[];
  canManage?: boolean;
};

export default function NativeBillingLegalEntitiesTable({ rows, canManage = false }: Props) {
  if (rows.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed border-border p-6">
        <p className="text-sm text-muted-foreground">
          Noch keine Rechtsträger für native SCE-Rechnungen erfasst. Legen Sie den Plattform-Rechtsträger
          an, bevor Sie Verträge erstellen.
        </p>
        {canManage ? (
          <Link
            href="/dashboard/admin/commercial/billing/settings/legal-entities/new"
            className="fca-button-primary inline-flex"
          >
            Neuer Rechtsträger
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
            <th className="px-4 py-3 font-medium">Rechtsträger</th>
            <th className="px-4 py-3 font-medium">Rechtsform</th>
            <th className="px-4 py-3 font-medium">Ort</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusPresentation = presentLegalEntityStatus(row.status);
            return (
              <tr key={row.key} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/commercial/billing/settings/legal-entities/${row.key}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.displayName}
                  </Link>
                  {row.legalName !== row.displayName ? (
                    <div className="text-xs text-muted-foreground">{row.legalName}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {presentLegalEntityType(row.entityType)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.city}, {row.countryCode}
                </td>
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

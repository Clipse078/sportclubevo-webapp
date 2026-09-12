import Link from "next/link";
import type { LegalEntityStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";
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

export function nativeBillingLegalEntityDetailHref(entityKey: string): string {
  return `/dashboard/admin/commercial/billing/settings/legal-entities/${encodeURIComponent(entityKey)}`;
}

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
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusPresentation = presentLegalEntityStatus(row.status);
            const detailHref = nativeBillingLegalEntityDetailHref(row.key);
            return (
              <tr
                key={row.key}
                className="group border-t border-border transition-colors hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <Link
                    href={detailHref}
                    className="block rounded-md outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="font-medium text-primary group-hover:underline">
                      {row.displayName}
                    </span>
                    {row.legalName !== row.displayName ? (
                      <div className="text-xs text-muted-foreground">{row.legalName}</div>
                    ) : null}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Link href={detailHref} className="block py-1 hover:text-foreground">
                    {presentLegalEntityType(row.entityType)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <Link href={detailHref} className="block py-1 hover:text-foreground">
                    {row.city}, {row.countryCode}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={detailHref} className="inline-flex rounded-md outline-offset-2">
                    <BillingStatusBadge
                      label={statusPresentation.label}
                      tone={statusPresentation.tone}
                    />
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={detailHref}
                    className="inline-flex rounded-md p-1 text-muted-foreground transition hover:text-primary group-hover:text-primary"
                    aria-label={`${row.displayName} verwalten`}
                  >
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import NativeBillingDeleteLegalEntityButton from "@/components/admin/billing/NativeBillingDeleteLegalEntityButton";
import { findLegalEntityByKey } from "@/lib/billing/native-billing-repository";
import {
  presentLegalEntityStatus,
  presentLegalEntityType,
} from "@/lib/billing/native-billing-presentation";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = {
  params: Promise<{ entityKey: string }>;
};

export default async function NativeBillingLegalEntityDetailPage({ params }: PageProps) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const canManage = hasPermission(session, PERMISSIONS.BILLING_MANAGE);
  const { entityKey } = await params;

  const entity = await findLegalEntityByKey(entityKey);
  if (!entity) {
    notFound();
  }

  const statusPresentation = presentLegalEntityStatus(entity.status);

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial"
        title={entity.displayName}
        description={`Rechtsträger · Key ${entity.key}`}
        actions={
          <Link href="/dashboard/admin/commercial/billing/settings" className="fca-button-secondary">
            Zurück zu Einstellungen
          </Link>
        }
      />

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Stammdaten</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Rechtlicher Name</dt>
            <dd>{entity.legalName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rechtsform</dt>
            <dd>{presentLegalEntityType(entity.entityType)}</dd>
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
            <dt className="text-muted-foreground">Standardwährung</dt>
            <dd>{entity.defaultCurrency}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">UID</dt>
            <dd>{entity.uid ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">MWST-Nr.</dt>
            <dd>{entity.vatId ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Adresse</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Strasse</dt>
            <dd>
              {entity.addressLine1}
              {entity.houseNumber ? ` ${entity.houseNumber}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">PLZ / Ort</dt>
            <dd>
              {entity.postalCode} {entity.city}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Land</dt>
            <dd>{entity.countryCode}</dd>
          </div>
        </dl>
      </section>

      {canManage ? (
        <section className="space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-4">
          <h2 className="text-sm font-semibold text-red-900">Gefahrenzone</h2>
          <p className="text-sm text-muted-foreground">
            Entfernt den Rechtsträger aus Einstellungen und Vertragsauswahl, sofern keine
            Abrechnungsdaten verknüpft sind.
          </p>
          <NativeBillingDeleteLegalEntityButton
            entityKey={entity.key}
            displayName={entity.displayName}
            legalName={entity.legalName}
          />
        </section>
      ) : null}
    </div>
  );
}

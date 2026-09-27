import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import ZielgruppeArchiveActions from "@/components/admin/communication/zielgruppen/ZielgruppeArchiveActions";
import TargetGroupDeleteButton from "@/components/admin/org/TargetGroupDeleteButton";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { getZielgruppeForManagement } from "@/lib/communication/zielgruppen/management-service";
import { loadZielgruppeDefinitionLabels } from "@/lib/communication/zielgruppen/load-definition-labels";
import {
  tenantPermissionsIncludeZielgruppenManage,
  ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/zielgruppen/route-access";

type PageProps = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ARCHIVED: "Archiviert",
};

export default async function CommunicationZielgruppeDetailPage({ params }: PageProps) {
  const session = await requireAnyPermission(ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS);
  const { id } = await params;
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const tg = await getZielgruppeForManagement(tenant.id, id);
  if (!tg) notFound();

  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    tenant.id,
  );
  const resolver = createEffectivePermissionResolver(prisma);
  const canManage = tenantPermissionsIncludeZielgruppenManage(tenantPermissions);
  const canDelete = await resolver.hasTenantDeletionAuthority({
    userId: session.user.id,
    permission: PERMISSIONS.ORG_DELETE,
    tenantId: tenant.id,
  });

  const knownLabels = await loadZielgruppeDefinitionLabels(tenant.id, tg.definition);

  return (
    <div className="space-y-6">
      <div className="sce-entity-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
              <Target className="h-7 w-7 text-white/90" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                Zielgruppe
              </p>
              <h1
                className="mt-1 text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              >
                {tg.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AdminStatusPill label={STATUS_LABELS[tg.status] ?? tg.status} tone="success" />
                <code className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[0.72rem] font-mono text-white/80">
                  {tg.key}
                </code>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ZielgruppeArchiveActions
              targetGroupId={tg.id}
              status={tg.status}
              canManage={canManage}
            />
            {canDelete ? (
              <TargetGroupDeleteButton
                targetGroupId={tg.id}
                targetGroupName={tg.name}
                targetGroupKey={tg.key}
              />
            ) : null}
            <Link
              href="/dashboard/communication/zielgruppen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Zurück
            </Link>
          </div>
        </div>
      </div>

      <AdminSectionHeader
        eyebrow="Definition"
        title={tg.summary.headline}
        description={tg.summary.parts.join(" · ") || "Strukturelle Zusammenfassung — keine authoritative Empfängerzahl."}
      />

      <ZielgruppeManagementForm
        mode="edit"
        targetGroupId={tg.id}
        canManage={canManage}
        knownLabels={knownLabels}
        defaultValues={{
          name: tg.name,
          key: tg.key,
          description: tg.description ?? "",
          status: tg.status,
          definition: tg.definition,
        }}
      />

      <div className="sce-detail-section sce-detail-section-body grid gap-4 sm:grid-cols-2">
        <div className="sce-data-field">
          <span className="sce-data-label">Erstellt</span>
          <span className="sce-data-value">
            {new Date(tg.createdAt).toLocaleString("de-CH")}
          </span>
        </div>
        <div className="sce-data-field">
          <span className="sce-data-label">Zuletzt geändert</span>
          <span className="sce-data-value">
            {new Date(tg.updatedAt).toLocaleString("de-CH")}
          </span>
        </div>
      </div>
    </div>
  );
}

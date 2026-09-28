import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import ZielgruppeManagementForm from "@/components/admin/communication/zielgruppen/ZielgruppeManagementForm";
import ZielgruppeArchiveActions from "@/components/admin/communication/zielgruppen/ZielgruppeArchiveActions";
import ZielgruppeHumanRulesPanel from "@/components/admin/communication/zielgruppen/ZielgruppeHumanRulesPanel";
import ZielgruppePreviewPanel from "@/components/admin/communication/zielgruppen/ZielgruppePreviewPanel";
import ZielgruppeUsagePanel from "@/components/admin/communication/zielgruppen/ZielgruppeUsagePanel";
import TargetGroupDeleteButton from "@/components/admin/org/TargetGroupDeleteButton";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { getZielgruppeForManagement } from "@/lib/communication/zielgruppen/management-service";
import { loadZielgruppeDefinitionLabels } from "@/lib/communication/zielgruppen/load-definition-labels";
import { getZielgruppeUsageSummary } from "@/lib/communication/zielgruppen/usage-references";
import { resolveZielgruppeRuleCharacter } from "@/lib/communication/zielgruppen/zielgruppen-display";
import {
  tenantPermissionsIncludeZielgruppenManage,
  ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS,
} from "@/lib/communication/zielgruppen/route-access";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ edit?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ARCHIVED: "Archiviert",
};

export default async function CommunicationZielgruppeDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireAnyPermission(ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS);
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const forceEdit = sp.edit === "1";
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
  const usage = await getZielgruppeUsageSummary(tenant.id, tg.id);
  const ruleCharacter = resolveZielgruppeRuleCharacter(tg.definition);

  const showEditor = forceEdit && canManage;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Zielgruppen", href: "/dashboard/communication/zielgruppen" },
          { label: tg.name },
        ]}
        title={tg.name}
        description={tg.description ?? ruleCharacter.label}
        primaryAction={
          <Link
            href="/dashboard/communication/zielgruppen"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zurück
          </Link>
        }
      />

      <CommunicationContentSurface>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <AdminStatusPill label={STATUS_LABELS[tg.status] ?? tg.status} tone="success" />
          <ZielgruppeArchiveActions targetGroupId={tg.id} status={tg.status} canManage={canManage} />
          {canDelete ? (
            <TargetGroupDeleteButton
              targetGroupId={tg.id}
              targetGroupName={tg.name}
              targetGroupKey={tg.key}
            />
          ) : null}
        </div>

        {showEditor ? (
          <ZielgruppeManagementForm
            mode="edit"
            targetGroupId={tg.id}
            canManage={canManage}
            knownLabels={knownLabels}
            startEditing
            defaultValues={{
              name: tg.name,
              key: tg.key,
              description: tg.description ?? "",
              status: tg.status,
              definition: tg.definition,
            }}
          />
        ) : (
          <div className="space-y-8">
            <section className="sce-detail-section sce-detail-section-body space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Definition</h2>
              <ZielgruppeHumanRulesPanel definition={tg.definition} labels={knownLabels} />
              {canManage ? (
                <Link
                  href={`/dashboard/communication/zielgruppen/${tg.id}?edit=1`}
                  className="fca-button-secondary inline-flex text-sm"
                >
                  Bearbeiten
                </Link>
              ) : null}
            </section>

            <section className="sce-detail-section sce-detail-section-body space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Aktuelle Empfänger (Vorschau)
              </h2>
              <ZielgruppePreviewPanel definition={tg.definition} disabled={false} />
            </section>

            <section className="sce-detail-section sce-detail-section-body space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Verwendet in</h2>
              <ZielgruppeUsagePanel usage={usage} />
            </section>

            <section className="sce-detail-section sce-detail-section-body grid gap-4 sm:grid-cols-2">
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
            </section>
          </div>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}

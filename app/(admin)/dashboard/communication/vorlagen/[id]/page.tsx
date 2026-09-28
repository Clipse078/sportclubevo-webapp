import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import VorlageManagementForm from "@/components/admin/communication/vorlagen/VorlageManagementForm";
import VorlageArchiveActions from "@/components/admin/communication/vorlagen/VorlageArchiveActions";
import VorlageDetailActions from "@/components/admin/communication/vorlagen/VorlageDetailActions";
import VorlageUsagePanel from "@/components/admin/communication/vorlagen/VorlageUsagePanel";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { getVorlageForManagement } from "@/lib/communication/templates/template-management-service";
import { getTemplateUsageSummary } from "@/lib/communication/templates/template-usage-references";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { prisma } from "@/lib/db/prisma";
import {
  formatVorlagenListTimestamp,
  formatVorlageChannelDefaults,
  vorlageApplicabilityLabel,
  vorlageKindLabel,
  vorlageStatusLabel,
  vorlageStatusTone,
  VORLAGEN_EDIT_FUTURE_NOTICE,
} from "@/lib/communication/templates/vorlagen-display";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ edit?: string }>;
};

export default async function VorlageDetailPage({ params, searchParams }: PageProps) {
  const session = await requireAnyPermission(PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const forceEdit = sp.edit === "1";

  const template = await getVorlageForManagement({ tenantId: tenant.id, templateId: id });
  if (!template) notFound();

  const authz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    tenant.id,
  );
  const canSendClub = CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS.some((p) =>
    tenantPermissions.includes(p),
  );

  const targetGroups = await listZielgruppenForManagement({
    tenantId: tenant.id,
    statusFilter: "ALL",
  });

  const sponsorAuth = await resolveSponsorAudienceAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });
  const sponsorOrganisations = sponsorAuth.canViewSponsorData
    ? await prisma.sponsorOrganisation.findMany({
        where: { tenantId: tenant.id, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          contacts: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, isPrimary: true },
            orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
          },
        },
        orderBy: { name: "asc" },
        take: 200,
      })
    : [];

  const usage = await getTemplateUsageSummary(tenant.id, id);
  const showEditor = forceEdit && authz.canManage && template.status !== "ARCHIVED";

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen", href: "/dashboard/communication/vorlagen" },
          { label: template.name },
        ]}
        title={template.name}
        description={template.description ?? vorlageApplicabilityLabel(template.kind)}
        primaryAction={
          <Link
            href="/dashboard/communication/vorlagen"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zurück
          </Link>
        }
      />

      <CommunicationContentSurface>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <AdminStatusPill
            label={vorlageStatusLabel(template.status)}
            tone={vorlageStatusTone(template.status)}
          />
          <span className="text-sm text-[var(--text-2)]">
            Geeignet für: {vorlageApplicabilityLabel(template.kind)}
          </span>
        </div>

        <div className="mb-8">
          <VorlageDetailActions
            templateId={template.id}
            canManage={authz.canManage}
            canUse={canSendClub}
            status={template.status}
          />
        </div>

        {showEditor ? (
          <VorlageManagementForm
            mode="edit"
            templateId={template.id}
            canManage={authz.canManage}
            startEditing
            targetGroups={targetGroups.map((tg) => ({
              id: tg.id,
              name: tg.name,
              status: tg.status,
            }))}
            sponsorOrganisations={sponsorOrganisations}
            defaultValues={{
              name: template.name,
              description: template.description ?? "",
              kind: template.kind,
              status: template.status,
              internalName: template.internalName ?? "",
              subject: template.subject ?? "",
              bodyText: template.bodyText,
              audienceSpec: template.audienceSpec,
              orchestration: template.orchestration,
            }}
          />
        ) : (
          <div className="space-y-8">
            {!showEditor && authz.canManage && template.status !== "ARCHIVED" ? (
              <VorlageManagementForm
                mode="edit"
                templateId={template.id}
                canManage={authz.canManage}
                startEditing={false}
                targetGroups={targetGroups.map((tg) => ({
                  id: tg.id,
                  name: tg.name,
                  status: tg.status,
                }))}
                sponsorOrganisations={sponsorOrganisations}
                defaultValues={{
                  name: template.name,
                  description: template.description ?? "",
                  kind: template.kind,
                  status: template.status,
                  internalName: template.internalName ?? "",
                  subject: template.subject ?? "",
                  bodyText: template.bodyText,
                  audienceSpec: template.audienceSpec,
                  orchestration: template.orchestration,
                }}
              />
            ) : null}

            <section aria-labelledby="vl-detail-content">
              <h2 id="vl-detail-content" className="text-base font-semibold">
                Inhalt
              </h2>
              <p className="mt-2 text-sm text-[var(--text-2)]">{VORLAGEN_EDIT_FUTURE_NOTICE}</p>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">Typ</dt>
                  <dd>{vorlageKindLabel(template.kind)}</dd>
                </div>
                {template.internalName ? (
                  <div>
                    <dt className="text-[var(--muted)]">Interner Name</dt>
                    <dd>{template.internalName}</dd>
                  </div>
                ) : null}
                {template.subject ? (
                  <div className="md:col-span-2">
                    <dt className="text-[var(--muted)]">Betreff</dt>
                    <dd>{template.subject}</dd>
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <dt className="text-[var(--muted)]">Nachricht</dt>
                  <dd className="whitespace-pre-wrap">{template.bodyText}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Zielgruppe (Default)</dt>
                  <dd>{template.audienceSummary ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Kanäle (Default)</dt>
                  <dd>{formatVorlageChannelDefaults(template.orchestration)}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="vl-detail-meta">
              <h2 id="vl-detail-meta" className="text-base font-semibold">
                Metadaten
              </h2>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">Zuletzt geändert</dt>
                  <dd>{formatVorlagenListTimestamp(template.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Erstellt</dt>
                  <dd>{formatVorlagenListTimestamp(template.createdAt)}</dd>
                </div>
                {template.creatorDisplayName ? (
                  <div>
                    <dt className="text-[var(--muted)]">Erstellt von</dt>
                    <dd>{template.creatorDisplayName}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <VorlageUsagePanel usage={usage} />

            <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
              <VorlageArchiveActions
                templateId={template.id}
                status={template.status}
                canManage={authz.canManage}
              />
            </div>
          </div>
        )}
      </CommunicationContentSurface>
    </PageShell>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { CampaignArchiveButton } from "@/components/admin/communication/kampagnen/CampaignArchiveButton";
import { PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { getCampaignById } from "@/lib/communication/campaign/campaign-service";
import {
  getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail,
} from "@/lib/communication/analytics/communication-delivery-analytics-service";
import CommunicationDeliveryAnalyticsPanel from "@/components/admin/communication/analytics/CommunicationDeliveryAnalyticsPanel";
import CommunicationDeliveryDetailTable from "@/components/admin/communication/analytics/CommunicationDeliveryDetailTable";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { prisma } from "@/lib/db/prisma";
import {
  formatKampagnenChannelSummary,
  formatKampagnenCreator,
  formatKampagnenListTimestamp,
  kampagnenListTitle,
  resolveKampagnenDisplayStatus,
} from "@/lib/communication/campaign/kampagnen-display";
import { inferKampagnenAudienceEditorState } from "@/lib/communication/campaign/kampagnen-audience-editor";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;

  const authz = await resolveCampaignAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  let item;
  try {
    item = await getCampaignById({
      tenantId: tenant.id,
      campaignId: id,
      viewerCanSend: authz.canSend,
    });
  } catch {
    notFound();
  }
  if (!item) notFound();

  const analytics = await getCommunicationDeliveryAnalytics({
    tenantId: tenant.id,
    communicationId: id,
  });

  const deliveryDetail =
    item.status === "PUBLISHED" && authz.canViewEngagementDetail
      ? await listCommunicationDeliveryDetail({
          tenantId: tenant.id,
          communicationId: id,
          limit: 50,
        })
      : null;

  const targetGroups =
    authz.canSend && (item.status === "DRAFT" || item.status === "READY")
      ? await listZielgruppenForManagement({
          tenantId: tenant.id,
          statusFilter: "ACTIVE",
        })
      : [];

  const sponsorAuth = await resolveSponsorAudienceAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const sponsorOrganisations =
    authz.canSend && sponsorAuth.canViewSponsorData
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

  const templateAuthz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const templateOptions = templateAuthz.canView
    ? (await listPlatformCommunicationTemplates({ tenantId: tenant.id }))
        .filter((t) => t.kind === "CAMPAIGN" && (t.status === "ACTIVE" || t.status === "DRAFT"))
        .map((t) => ({ id: t.id, name: t.name }))
    : [];

  const displayStatus = resolveKampagnenDisplayStatus({
    status: item.status,
    scheduleStatus: item.scheduleStatus,
  });

  const editable =
    authz.canSend &&
    (item.status === "DRAFT" || item.status === "READY") &&
    !item.scheduleStatus;
  const canArchive =
    authz.canSend &&
    (item.status === "PUBLISHED" || item.status === "DRAFT" || item.status === "READY");

  const title = kampagnenListTitle(item);
  const audienceEditor = inferKampagnenAudienceEditorState(item.audienceSpec);
  const isSponsorCampaign = audienceEditor.mode === "SPONSORS";

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen", href: "/dashboard/communication/kampagnen" },
          { label: title },
        ]}
        title={title}
        description={`${displayStatus.label} · Zielgruppe: ${item.audienceSummary}`}
        secondaryActions={
          canArchive && item.status !== "ARCHIVED" ? (
            <CampaignArchiveButton campaignId={item.id} />
          ) : undefined
        }
      />

      <CommunicationContentSurface className="space-y-6">
        <SectionCard title="Übersicht">
          <dl className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[var(--text-2)]">Status</dt>
              <dd className="mt-1">
                <AdminStatusPill label={displayStatus.label} tone={displayStatus.tone} />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Erstellt von</dt>
              <dd className="mt-1 font-medium">{formatKampagnenCreator(item.authorPerson)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Zeitpunkt</dt>
              <dd className="mt-1">{formatKampagnenListTimestamp(item)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Kanäle</dt>
              <dd className="mt-1">{formatKampagnenChannelSummary(item.orchestration)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-[var(--text-2)]">Zielgruppe</dt>
              <dd className="mt-1">{item.audienceSummary}</dd>
            </div>
            {isSponsorCampaign ? (
              <div className="md:col-span-2">
                <dt className="text-[var(--text-2)]">Sponsor-Kontext</dt>
                <dd className="mt-1">Werbliche Kommunikation (Sponsor-Zielgruppe)</dd>
              </div>
            ) : null}
          </dl>
          {editable ? (
            <p className="mt-4">
              <Link
                href="#kampagne-bearbeiten"
                className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
              >
                Entwurf bearbeiten
              </Link>
            </p>
          ) : null}
        </SectionCard>

        {editable ? (
          <div id="kampagne-bearbeiten">
          <SectionCard title="Kampagne bearbeiten">
            <CampaignComposer
              targetGroups={targetGroups.map((tg) => ({
                id: tg.id,
                name: tg.name,
                status: tg.status,
              }))}
              sponsorOrganisations={sponsorOrganisations.map((org) => ({
                id: org.id,
                name: org.name,
                contacts: org.contacts.map((c) => ({
                  id: c.id,
                  displayName: `${c.firstName} ${c.lastName}`.trim(),
                  isPrimary: c.isPrimary,
                })),
              }))}
              templateOptions={templateOptions}
              canManageTemplates={templateAuthz.canManage}
              campaignId={item.id}
              initialInternalName={item.internalName}
              initialSubject={item.subject ?? ""}
              initialBody={item.bodyText}
              initialAudienceSpec={item.audienceSpec}
              initialOrchestration={item.orchestration}
              tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
              canSaveAsTemplate={templateAuthz.canManage}
            />
          </SectionCard>
          </div>
        ) : (
          <>
            <SectionCard title="Inhalt">
              <p className="text-sm text-[var(--text-2)]">Intern: {item.internalName}</p>
              {item.subject ? (
                <p className="mt-2 text-sm font-medium">Betreff: {item.subject}</p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">
                {item.bodyText}
              </p>
            </SectionCard>
            <SectionCard title="Empfänger">
              <p className="text-sm text-[var(--foreground)]">{item.audienceSummary}</p>
              <p className="mt-2 text-xs text-[var(--text-2)]">
                Historischer Snapshot — Zielgruppenmitgliedschaft wird nach Veröffentlichung nicht
                neu berechnet.
              </p>
              {item.deliverySnapshotCount != null ? (
                <p className="mt-2 text-sm text-[var(--text-2)]">
                  {item.deliverySnapshotCount} Zustell-Identitäten im Snapshot
                </p>
              ) : null}
            </SectionCard>
          </>
        )}

        {analytics ? (
          <div>
            <h2 className="mb-3 text-base font-semibold">Zustellung &amp; Reaktionen</h2>
            <CommunicationDeliveryAnalyticsPanel analytics={analytics} />
          </div>
        ) : null}
        {deliveryDetail ? (
          <SectionCard title="Empfängerdetails">
            <CommunicationDeliveryDetailTable rows={deliveryDetail.items} />
          </SectionCard>
        ) : null}
      </CommunicationContentSurface>
    </PageShell>
  );
}

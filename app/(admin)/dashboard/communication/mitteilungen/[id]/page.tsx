import { notFound } from "next/navigation";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ClubCommunicationComposer from "@/components/admin/communication/club/ClubCommunicationComposer";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { MitteilungArchiveButton } from "@/components/admin/communication/mitteilungen/MitteilungArchiveButton";
import { PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/club/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { getClubCommunicationById } from "@/lib/communication/club/club-communication-service";
import {
  getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail,
} from "@/lib/communication/analytics/communication-delivery-analytics-service";
import CommunicationDeliveryAnalyticsPanel from "@/components/admin/communication/analytics/CommunicationDeliveryAnalyticsPanel";
import CommunicationDeliveryDetailTable from "@/components/admin/communication/analytics/CommunicationDeliveryDetailTable";
import { listZielgruppenForManagement } from "@/lib/communication/zielgruppen/management-service";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import {
  formatMitteilungCreator,
  formatMitteilungListTimestamp,
  resolveMitteilungDisplayStatus,
} from "@/lib/communication/club/mitteilungen-display";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClubMitteilungDetailPage({ params }: PageProps) {
  const session = await requireAnyPermission(CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;

  const authz = await resolveClubCommunicationAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  let item;
  try {
    item = await getClubCommunicationById({
      tenantId: tenant.id,
      communicationId: id,
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
    authz.canSend && item.status === "DRAFT"
      ? await listZielgruppenForManagement({
          tenantId: tenant.id,
          statusFilter: "ACTIVE",
        })
      : [];

  const displayStatus = resolveMitteilungDisplayStatus({
    status: item.status,
    scheduleStatus: item.scheduleStatus,
  });

  const editableDraft = authz.canSend && item.status === "DRAFT" && !item.scheduleStatus;
  const canArchive =
    authz.canSend && (item.status === "PUBLISHED" || item.status === "DRAFT");

  const title = item.subject?.trim() || "Mitteilung";

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen", href: "/dashboard/communication/mitteilungen" },
          { label: title },
        ]}
        title={title}
        description={`${displayStatus.label} · Zielgruppe: ${item.audienceSummary}`}
        secondaryActions={
          canArchive ? <MitteilungArchiveButton communicationId={item.id} /> : undefined
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
              <dd className="mt-1 font-medium">{formatMitteilungCreator(item.senderPerson)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Zeitpunkt</dt>
              <dd className="mt-1">{formatMitteilungListTimestamp(item)}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Zielgruppe</dt>
              <dd className="mt-1">{item.audienceSummary}</dd>
            </div>
          </dl>
        </SectionCard>

        {editableDraft ? (
          <SectionCard title="Mitteilung bearbeiten">
            <ClubCommunicationComposer
              communicationId={item.id}
              targetGroups={targetGroups.map((tg) => ({
                id: tg.id,
                name: tg.name,
                status: tg.status,
              }))}
              tenantTimezone={resolveTenantEventTimezone(tenant.timezone)}
              tenantId={tenant.id}
              initialKind={item.kind as "MESSAGE" | "ANNOUNCEMENT" | "ALERT"}
              initialSubject={item.subject ?? ""}
              initialBody={item.bodyText}
              initialAudienceSpec={item.audienceSpec}
            />
          </SectionCard>
        ) : (
          <SectionCard title="Inhalt">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{item.bodyText}</p>
          </SectionCard>
        )}

        {!editableDraft ? (
          <SectionCard title="Empfänger">
            <p className="text-sm text-[var(--foreground)]">{item.audienceSummary}</p>
            {item.deliverySnapshotCount != null ? (
              <p className="mt-2 text-sm text-[var(--text-2)]">
                {item.deliverySnapshotCount} Zustell-Identitäten im Snapshot
              </p>
            ) : null}
          </SectionCard>
        ) : null}

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

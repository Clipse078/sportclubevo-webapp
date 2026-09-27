import { notFound } from "next/navigation";
import Link from "next/link";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageBreadcrumbs, PageHeader, PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { getClubCommunicationById } from "@/lib/communication/club/club-communication-service";
import {
  getCommunicationDeliveryAnalytics,
  listCommunicationDeliveryDetail,
} from "@/lib/communication/analytics/communication-delivery-analytics-service";
import CommunicationDeliveryAnalyticsPanel from "@/components/admin/communication/analytics/CommunicationDeliveryAnalyticsPanel";
import CommunicationDeliveryDetailTable from "@/components/admin/communication/analytics/CommunicationDeliveryDetailTable";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClubMitteilungDetailPage({ params }: PageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_CLUB_VIEW,
    PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;

  const authz = await resolveClubCommunicationAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const item = await getClubCommunicationById({
    tenantId: tenant.id,
    communicationId: id,
    viewerCanSend: authz.canSend,
  });
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

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Mitteilungen", href: "/dashboard/communication/mitteilungen" },
          { label: item.subject?.trim() || "Detail" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title={item.subject?.trim() || "Vereinsmitteilung"}
        description={`Zielgruppe: ${item.audienceSummary}`}
        badge={
          <AdminStatusPill
            label={item.status}
            tone={item.status === "PUBLISHED" ? "success" : "muted"}
          />
        }
      />
      <div className="mb-4">
        <Link
          href="/dashboard/communication/mitteilungen"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          Zurück
        </Link>
      </div>

      <SectionCard title="Inhalt">
        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{item.bodyText}</p>
      </SectionCard>

      {analytics ? (
        <CommunicationDeliveryAnalyticsPanel analytics={analytics} />
      ) : null}
      {deliveryDetail ? (
        <CommunicationDeliveryDetailTable rows={deliveryDetail.items} />
      ) : null}
    </PageShell>
  );
}

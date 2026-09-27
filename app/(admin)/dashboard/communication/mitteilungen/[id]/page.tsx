import { notFound } from "next/navigation";
import Link from "next/link";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PageBreadcrumbs, PageHeader, PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveClubCommunicationAuthorization } from "@/lib/communication/club/club-communication-authorization";
import { getClubCommunicationById } from "@/lib/communication/club/club-communication-service";
import { getClubCommunicationEngagementSummary } from "@/lib/communication/club/club-formal-communication-service";

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

  const engagement =
    item.status === "PUBLISHED"
      ? await getClubCommunicationEngagementSummary({
          tenantId: tenant.id,
          communicationId: id,
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

      {engagement ? (
        <SectionCard title="Engagement" className="mt-6">
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[var(--text-2)]">Empfänger</dt>
              <dd className="text-lg font-semibold">{engagement.recipientCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Gelesen</dt>
              <dd className="text-lg font-semibold">{engagement.readCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Ungelesen</dt>
              <dd className="text-lg font-semibold">{engagement.unreadCount}</dd>
            </div>
            {engagement.acknowledgementRequired ? (
              <div>
                <dt className="text-[var(--text-2)]">Bestätigt</dt>
                <dd className="text-lg font-semibold">{engagement.acknowledgedCount}</dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

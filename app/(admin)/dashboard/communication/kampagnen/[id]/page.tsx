import { notFound } from "next/navigation";
import Link from "next/link";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import CampaignComposer from "@/components/admin/communication/campaign/CampaignComposer";
import { PageBreadcrumbs, PageHeader, PageShell, SectionCard } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveCampaignAuthorization } from "@/lib/communication/campaign/campaign-authorization";
import { getCampaignById } from "@/lib/communication/campaign/campaign-service";
import { getCampaignEngagementSummary } from "@/lib/communication/campaign/campaign-engagement-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_CLUB_VIEW,
    PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;

  const authz = await resolveCampaignAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const item = await getCampaignById({
    tenantId: tenant.id,
    campaignId: id,
    viewerCanSend: authz.canSend,
  });
  if (!item) notFound();

  const engagement =
    item.status === "PUBLISHED"
      ? await getCampaignEngagementSummary({ tenantId: tenant.id, campaignId: id })
      : null;

  const targetGroups = authz.canSend
    ? await prisma.targetGroup.findMany({
        where: { tenantId: tenant.id, status: "ACTIVE" },
        select: { id: true, name: true, status: true },
        orderBy: { name: "asc" },
      })
    : [];

  const editable = authz.canSend && (item.status === "DRAFT" || item.status === "READY");

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kampagnen", href: "/dashboard/communication/kampagnen" },
          { label: item.internalName },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title={item.internalName}
        description={`Empfänger-Betreff: ${item.subject?.trim() || "—"} · Zielgruppe: ${item.audienceSummary}`}
        badge={
          <AdminStatusPill
            label={item.status}
            tone={item.status === "PUBLISHED" ? "success" : "muted"}
          />
        }
      />
      <div className="mb-4">
        <Link
          href="/dashboard/communication/kampagnen"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          Zurück
        </Link>
      </div>

      {editable ? (
        <CampaignComposer
          targetGroups={targetGroups}
          campaignId={item.id}
          initialInternalName={item.internalName}
          initialSubject={item.subject ?? ""}
          initialBody={item.bodyText}
        />
      ) : (
        <SectionCard title="Veröffentlichter Inhalt">
          <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{item.bodyText}</p>
        </SectionCard>
      )}

      {engagement ? (
        <SectionCard title="Engagement" className="mt-6">
          <dl className="grid gap-2 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[var(--text-2)]">Empfänger</dt>
              <dd className="font-semibold">{engagement.recipientCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Gelesen</dt>
              <dd className="font-semibold">{engagement.readCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Ungelesen</dt>
              <dd className="font-semibold">{engagement.unreadCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-2)]">Bestätigt</dt>
              <dd className="font-semibold">{engagement.acknowledgedCount}</dd>
            </div>
          </dl>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

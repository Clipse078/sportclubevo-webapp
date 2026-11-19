import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { getClubMeldungDetail, listClubMeldungReporterTimeline } from "@/lib/club-meldungen/queries";
import { canViewMeldungInternal } from "@/lib/club-meldungen/access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import ClubMeldungDetailPanel from "@/components/admin/club-meldungen/ClubMeldungDetailPanel";
import ClubMeldungHandlerPanel from "@/components/admin/club-meldungen/ClubMeldungHandlerPanel";
import ClubMeldungSchemaUnavailable from "@/components/admin/club-meldungen/ClubMeldungSchemaUnavailable";
import { isClubMeldungSchemaReady } from "@/lib/club-meldungen/schema-ready";

type Props = { params: Promise<{ tenantSlug: string; meldungId: string }> };

export default async function TenantMeldungCockpitDetailPage({ params }: Props) {
  const { tenantSlug, meldungId } = await params;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  const session = await requireAnyPermission(
    [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.MELDUNGEN_VIEW_ALL],
    tenant.id,
  );
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const resolver = createEffectivePermissionResolver(prisma);
  const effective = await resolver.getEffectivePermissions({ userId: actorUserId, tenantId: tenant.id });
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const schemaReady = await isClubMeldungSchemaReady();
  if (!schemaReady) {
    return (
      <PageShell fullWidth>
        <DetailPagePattern
          eyebrow={CLUB_MELDUNG_DETAIL_EYEBROW}
          title="Anliegen & Meldungen"
          description="Detail"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Anliegen & Meldungen", href: `/tenant/${tenantSlug}/cockpit/meldungen` },
          ]}
        >
          <ClubMeldungSchemaUnavailable />
        </DetailPagePattern>
      </PageShell>
    );
  }

  const meldung = await getClubMeldungDetail(tenant.id, meldungId);
  if (
    !meldung ||
    !canViewMeldungInternal(meldung, {
      actorUserId,
      permissionKeys,
      collaboratorUserIds: meldung.collaborators.map((c) => c.userId),
    })
  ) {
    notFound();
  }

  const timeline = await listClubMeldungReporterTimeline(tenant.id, meldungId, true);

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow={CLUB_MELDUNG_DETAIL_EYEBROW}
        title={meldung.caseNumber}
        description={meldung.subject}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Anliegen & Meldungen",
            href: `/tenant/${tenantSlug}/cockpit/meldungen`,
          },
          { label: meldung.caseNumber },
        ]}
      >
        <div className="flex flex-col gap-6">
          <ClubMeldungHandlerPanel
            tenantSlug={tenantSlug}
            meldungId={meldung.id}
            version={meldung.version}
            status={meldung.status}
            accountableUserId={meldung.accountableUserId}
            actorUserId={actorUserId}
          />
          <ClubMeldungDetailPanel
          tenantSlug={tenantSlug}
          meldungId={meldung.id}
          mode="internal"
          caseNumber={meldung.caseNumber}
          subject={meldung.subject}
          description={meldung.description}
          category={meldung.category}
          status={meldung.status}
          version={meldung.version}
          messages={timeline.messages.map((m) => ({
            id: m.id,
            body: m.body,
            audience: m.audience,
            createdAt: m.createdAt.toISOString(),
            author: m.author,
          }))}
        />
        </div>
      </DetailPagePattern>
    </PageShell>
  );
}

const CLUB_MELDUNG_DETAIL_EYEBROW = "Anliegen & Meldungen";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { getClubMeldungDetail, listClubMeldungReporterTimeline } from "@/lib/club-meldungen/queries";
import { canViewMeldungAsReporter } from "@/lib/club-meldungen/access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import ClubMeldungDetailPanel from "@/components/admin/club-meldungen/ClubMeldungDetailPanel";

type Props = {
  params: Promise<{ tenantSlug: string; meldungId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function TenantAnliegenDetailPage({ params, searchParams }: Props) {
  const { tenantSlug, meldungId } = await params;
  const { created } = await searchParams;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  const session = await requireAnyPermission([PERMISSIONS.MELDUNGEN_SUBMIT], tenant.id);
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const resolver = createEffectivePermissionResolver(prisma);
  const effective = await resolver.getEffectivePermissions({ userId: actorUserId, tenantId: tenant.id });
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const meldung = await getClubMeldungDetail(tenant.id, meldungId);
  if (!meldung || !canViewMeldungAsReporter(meldung, actorUserId, permissionKeys)) {
    notFound();
  }

  const timeline = await listClubMeldungReporterTimeline(tenant.id, meldungId, false);

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Meine Meldung"
        title={meldung.caseNumber}
        description={meldung.subject}
        breadcrumbs={[
          { label: "Anliegen", href: `/tenant/${tenantSlug}/anliegen` },
          { label: meldung.caseNumber },
        ]}
      >
        <ClubMeldungDetailPanel
          tenantSlug={tenantSlug}
          meldungId={meldung.id}
          mode="reporter"
          caseNumber={meldung.caseNumber}
          subject={meldung.subject}
          description={meldung.description}
          category={meldung.category}
          status={meldung.status}
          version={meldung.version}
          createdBanner={created === "1"}
          messages={timeline.messages.map((m) => ({
            id: m.id,
            body: m.body,
            audience: m.audience,
            createdAt: m.createdAt.toISOString(),
            author: m.author,
          }))}
        />
      </DetailPagePattern>
    </PageShell>
  );
}
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContextForSlug } from "@/lib/tenants/active-tenant";
import { listClubMeldungen, type ClubMeldungListView } from "@/lib/club-meldungen/queries";
import { CLUB_MELDUNG_WORKSPACE_COPY } from "@/lib/club-meldungen/copy";
import { hasMeldungPermission } from "@/lib/club-meldungen/access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import ClubMeldungenWorkspace from "@/components/admin/club-meldungen/ClubMeldungenWorkspace";

type Props = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ ansicht?: string }>;
};

export default async function TenantMeldungenCockpitPage({ params, searchParams }: Props) {
  const { tenantSlug } = await params;
  const { ansicht } = await searchParams;
  const tenant = await requireTenantContextForSlug(tenantSlug);
  const session = await requireAnyPermission(
    [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.MELDUNGEN_VIEW_ALL],
    tenant.id,
  );
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const resolver = createEffectivePermissionResolver(prisma);
  const effective = await resolver.getEffectivePermissions({ userId: actorUserId, tenantId: tenant.id });
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const view = (ansicht === "unassigned" || ansicht === "all" || ansicht === "mine"
    ? ansicht
    : "mine") as ClubMeldungListView;

  const items = await listClubMeldungen({
    tenantId: tenant.id,
    view,
    actorUserId,
    canViewAll: hasMeldungPermission(permissionKeys, PERMISSIONS.MELDUNGEN_VIEW_ALL),
  });

  const emptyLabel =
    view === "unassigned"
      ? "Keine Meldungen ohne Zuständigkeit."
      : view === "all"
        ? "Keine Meldungen im Verein."
        : "Keine Meldungen in deinen Zuständigkeiten.";

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsbetrieb"
        title={CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle}
        description={CLUB_MELDUNG_WORKSPACE_COPY.pageSubtitle}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: CLUB_MELDUNG_WORKSPACE_COPY.moduleTitle },
        ]}
      >
        <p className="mb-4 text-xs text-slate-500">{CLUB_MELDUNG_WORKSPACE_COPY.emailNotActivatedNote}</p>
        <ClubMeldungenWorkspace
          tenantSlug={tenantSlug}
          view={view === "reporter" ? "mine" : view}
          baseHref={`/tenant/${tenantSlug}/cockpit/meldungen`}
          emptyLabel={emptyLabel}
          items={items.map((item) => ({
            ...item,
            followUpAt: item.followUpAt?.toISOString() ?? null,
            lastActivityAt: item.lastActivityAt.toISOString(),
          }))}
        />
      </ListPagePattern>
    </PageShell>
  );
}
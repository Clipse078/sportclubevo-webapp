import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  listAllFocusTargetIds,
  listClubStrategies,
  loadClubStrategyAuthoring,
} from "@/lib/club-development/club-strategy-service";
import { prisma } from "@/lib/db/prisma";
import { getMeetingDecisionLinkOptions, getMeetingLinkOptions } from "@/lib/linking/queries";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import {
  connectedWorkspacePageMeta,
  CD_CONNECTED_WORKSPACE_EYEBROW,
  resolveConnectedViewFromStrategieUndZieleAnsicht,
} from "@/lib/club-development/vereinsentwicklung-workspace-page-meta";
import {
  parseOrgEinheitQuery,
  resolveVereinsentwicklungOrgEinheitFilter,
} from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";
import StrategieUndZieleWorkspaceClient from "@/components/admin/club-development/StrategieUndZieleWorkspaceClient";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasSprintManagePermission } from "@/lib/club-development/sprints/queries";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function StrategieUndZielePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const query = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const connectedView = resolveConnectedViewFromStrategieUndZieleAnsicht(query.ansicht);
  const pageMeta = connectedWorkspacePageMeta(connectedView);
  const orgEinheitFilter = await resolveVereinsentwicklungOrgEinheitFilter(
    actor,
    parseOrgEinheitQuery(query),
  );
  const strategies = await listClubStrategies(actor, { orgUnitId: orgEinheitFilter?.id });
  const selectedStrategyId = query.strategyId?.trim() || null;

  const [authoring, { targets }, availableMeetings, availableDecisions, allFocusTargetIds, orgUnitOptions] =
    await Promise.all([
      selectedStrategyId
        ? loadClubStrategyAuthoring(actor, actorUserId, selectedStrategyId)
        : Promise.resolve(null),
      loadStrategyOverview(actor),
      getMeetingLinkOptions(actor),
      getMeetingDecisionLinkOptions(actor),
      listAllFocusTargetIds(actor),
      actor.tenantId
        ? prisma.orgUnit.findMany({
            where: { tenantId: actor.tenantId, status: "ACTIVE" },
            orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true },
            take: 200,
          })
        : Promise.resolve([]),
    ]);

  const canManageTargets = actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
  const focusTargetIds =
    connectedView === "ziele"
      ? allFocusTargetIds
      : (authoring?.focusTargets.map((row) => row.target.id) ?? []);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={CD_CONNECTED_WORKSPACE_EYEBROW}
        title={pageMeta.title}
        description={pageMeta.description}
        breadcrumbs={pageMeta.breadcrumbs}
        isEmpty={false}
      >
        <StrategieUndZieleWorkspaceClient
          permissionKeys={actor.permissionKeys}
          hasPlanningAccess={hasSprintManagePermission(actor)}
          orgEinheitFilterLabel={orgEinheitFilter?.label ?? null}
          strategies={strategies}
          selectedStrategyId={selectedStrategyId}
          authoring={authoring}
          canManageTargets={canManageTargets}
          targets={targets}
          focusTargetIds={focusTargetIds}
          availableMeetings={availableMeetings}
          availableDecisions={availableDecisions}
          orgUnitOptions={orgUnitOptions}
        />
      </ListPagePattern>
    </PageShell>
  );
}
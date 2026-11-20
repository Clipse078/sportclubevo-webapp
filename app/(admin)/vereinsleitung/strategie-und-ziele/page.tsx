import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  listClubStrategies,
  loadClubStrategyAuthoring,
} from "@/lib/club-development/club-strategy-service";
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
  const strategies = await listClubStrategies(actor);
  const selectedStrategyId =
    query.strategyId?.trim() ??
    strategies.find((row) => row.scopeType === "CLUB")?.id ??
    strategies[0]?.id ??
    null;

  const [authoring, { targets }, availableMeetings, availableDecisions] = await Promise.all([
    loadClubStrategyAuthoring(actor, actorUserId, selectedStrategyId),
    loadStrategyOverview(actor),
    getMeetingLinkOptions(actor),
    getMeetingDecisionLinkOptions(actor),
  ]);

  const canManageTargets = actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
  const focusTargetIds = authoring?.focusTargets.map((row) => row.target.id) ?? [];

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
        />
      </ListPagePattern>
    </PageShell>
  );
}
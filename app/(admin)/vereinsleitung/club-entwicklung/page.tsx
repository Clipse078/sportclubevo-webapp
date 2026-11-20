import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClubDevelopmentOverviewPageClient from "@/components/admin/club-development/ClubDevelopmentOverviewPageClient";
import { type ClubDevelopmentOverviewKpis } from "@/components/admin/club-development/ClubDevelopmentOverview";
import { hasSprintManagePermission } from "@/lib/club-development/sprints/queries";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import {
  filterActiveInitiatives,
  filterRelevantTargets,
  filterUpcomingMeetings,
} from "@/lib/club-development/overview-helpers";
import {
  getOverdueActions,
  getPendingApprovals,
  getStaleTargets,
  getTemplateDrafts,
  type GovernanceOverviewData,
} from "@/lib/dashboard/governance-overview";
import { getOperativeStrategicCounts } from "@/lib/dashboard/strategic-summary";
import { getInitiatives } from "@/lib/initiatives/queries";
import { getMeetings } from "@/lib/meetings/queries";
import { getTargets } from "@/lib/targets/queries";
import { getTaskManagementSummary } from "@/lib/tasks/management-service";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { listMyTasks } from "@/lib/tasks/task-service";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  connectedWorkspacePageMeta,
  CD_CONNECTED_WORKSPACE_EYEBROW,
} from "@/lib/club-development/vereinsentwicklung-workspace-page-meta";
import {
  parseOrgEinheitQuery,
  resolveVereinsentwicklungOrgEinheitFilter,
} from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function ClubEntwicklungPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.activeTenantId;
  if (!tenantId) redirect("/login");

  const query = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, tenantId);
  const orgEinheitFilter = await resolveVereinsentwicklungOrgEinheitFilter(
    actor,
    parseOrgEinheitQuery(query),
  );
  const pageMeta = connectedWorkspacePageMeta("uebersicht");
  const now = new Date();

  const [
    allTargets,
    allInitiatives,
    allMeetings,
    strategicCounts,
    governanceBundles,
    taskCtx,
  ] = await Promise.all([
    getTargets(actor),
    getInitiatives(actor),
    getMeetings(actor),
    getOperativeStrategicCounts(actor, now),
    Promise.all([
      getPendingApprovals(actor),
      getStaleTargets(actor),
      getTemplateDrafts(actor),
      getOverdueActions(actor),
    ]),
    buildTaskServiceContextForActor(session.user.id, tenantId),
  ]);

  const targets = filterRelevantTargets(allTargets);
  const initiatives = filterActiveInitiatives(allInitiatives);
  const upcomingMeetings = filterUpcomingMeetings(allMeetings, now);

  const [pendingApprovals, staleTargets, templateDrafts, overdueActions] =
    governanceBundles;

  const governance: GovernanceOverviewData = {
    pendingApprovals,
    staleTargets,
    templateDrafts,
    overdueActions,
  };

  let myOpenTaskCount: number | null = null;
  let overdueTaskCount: number | null = null;
  let assignedTasks: Awaited<ReturnType<typeof listMyTasks>> = [];

  if (taskCtx) {
    try {
      const [summary, myTasks] = await Promise.all([
        getTaskManagementSummary(taskCtx, "Europe/Zurich", now),
        listMyTasks(taskCtx, { openOnly: true, limit: 8, now }),
      ]);
      myOpenTaskCount = summary.myOpen;
      overdueTaskCount = summary.overdue;
      assignedTasks = myTasks;
    } catch {
      myOpenTaskCount = null;
      overdueTaskCount = null;
    }
  }

  const kpis: ClubDevelopmentOverviewKpis = {
    activeTargetCount: targets.length,
    activeInitiativeCount: initiatives.length,
    upcomingMeetingCount: upcomingMeetings.length,
    overdueActionCount: strategicCounts.overdueActionCount,
    myOpenTaskCount,
    overdueTaskCount,
  };

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={CD_CONNECTED_WORKSPACE_EYEBROW}
        title={pageMeta.title}
        description={pageMeta.description}
        breadcrumbs={pageMeta.breadcrumbs}
      >
        <ClubDevelopmentOverviewPageClient
          permissionKeys={actor.permissionKeys}
          hasPlanningAccess={hasSprintManagePermission(actor)}
          orgEinheitFilterLabel={orgEinheitFilter?.label ?? null}
          targets={targets}
          initiatives={initiatives}
          upcomingMeetings={upcomingMeetings}
          assignedTasks={assignedTasks}
          governance={governance}
          kpis={kpis}
        />
      </ListPagePattern>
    </PageShell>
  );
}

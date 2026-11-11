import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClubDevelopmentOverview, {
  type ClubDevelopmentOverviewKpis,
} from "@/components/admin/club-development/ClubDevelopmentOverview";
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

export default async function ClubEntwicklungPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.activeTenantId;
  if (!tenantId) redirect("/login");

  const actor = await getActorContext(session.user, tenantId);
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
        eyebrow="Verein"
        title="Vereinsentwicklung"
        description="Übersicht über Ziele, Initiativen, Sitzungen und offene Massnahmen — nur Daten, die Sie sehen dürfen."
        breadcrumbs={[
          { label: "Verein" },
          { label: "Vereinsentwicklung" },
        ]}
      >
        <ClubDevelopmentOverview
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

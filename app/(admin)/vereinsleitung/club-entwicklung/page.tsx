import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClubDevelopmentOverviewPageClient from "@/components/admin/club-development/ClubDevelopmentOverviewPageClient";
import { hasSprintManagePermission } from "@/lib/club-development/sprints/queries";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import {
  filterRelevantTargets,
  filterUpcomingMeetings,
} from "@/lib/club-development/overview-helpers";
import { getMeetings } from "@/lib/meetings/queries";
import { getTargets } from "@/lib/targets/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  connectedWorkspacePageMeta,
  CD_CONNECTED_WORKSPACE_EYEBROW,
} from "@/lib/club-development/vereinsentwicklung-workspace-page-meta";
import {
  parseOrgEinheitQuery,
  resolveVereinsentwicklungOrgEinheitFilter,
} from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";
import { loadVereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

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

  const [allTargets, allMeetings] = await Promise.all([
    getTargets(actor),
    getMeetings(actor),
  ]);

  const targets = filterRelevantTargets(allTargets);
  const upcomingMeetings = filterUpcomingMeetings(allMeetings, now);

  const dashboard = await loadVereinsentwicklungLeadershipDashboard({
    actor,
    activeTargets: targets,
    upcomingMeetings,
    orgEinheit: orgEinheitFilter,
    now,
  });

  const orgEinheitQuery: Record<string, string> = orgEinheitFilter
    ? { [CD_WORKSPACE_ORG_UNIT_QUERY]: orgEinheitFilter.id }
    : {};

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
          orgEinheitQuery={orgEinheitQuery}
          dashboard={dashboard}
        />
      </ListPagePattern>
    </PageShell>
  );
}
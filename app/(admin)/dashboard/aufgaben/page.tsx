import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import {
  getTaskManagementSummary,
  listTaskManagementItems,
  listTaskSeriesManagementRows,
} from "@/lib/tasks/management-service";
import {
  parseTaskManagementSort,
  resolveTaskManagementQuery,
} from "@/lib/tasks/management-navigation";
import { canViewAllTasks, hasTaskPermission } from "@/lib/tasks/visibility";
import AufgabenManagementWorkspace from "@/components/admin/aufgaben/AufgabenManagementWorkspace";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  view?: string;
  q?: string;
  sort?: string;
  status?: string;
  assignee?: string;
  priority?: string;
  deadline?: string;
  recurring?: string;
  context?: string;
  page?: string;
};

type Props = {
  searchParams?: Promise<PageSearchParams>;
};

export default async function AufgabenPage({ searchParams }: Props) {
  await requirePermission(PERMISSIONS.TASKS_VIEW);

  const ctx = await getTaskServiceContext();
  const tenant = await getActiveTenant();
  if (!ctx) {
    return null;
  }

  const params: PageSearchParams = searchParams ? await searchParams : {};
  const tenantWideVisibility = canViewAllTasks(ctx);
  const query = resolveTaskManagementQuery(params, tenantWideVisibility);
  const sort = parseTaskManagementSort(params.sort);
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const locale = tenant?.locale ?? "de-CH";

  const [summary, assigneeOptions] = await Promise.all([
    getTaskManagementSummary(ctx, timeZone),
    tenantWideVisibility
      ? listEligibleTaskAssignees(ctx.tenantId)
      : Promise.resolve([]),
  ]);

  let items: Awaited<ReturnType<typeof listTaskManagementItems>>["items"] = [];
  let totalCount = 0;
  let page = 1;
  let pageCount = 1;
  let seriesRows: Awaited<ReturnType<typeof listTaskSeriesManagementRows>>["rows"] = [];
  let loadError = false;

  try {
    if (query.view === "WIEDERKEHREND") {
      const seriesResult = await listTaskSeriesManagementRows(ctx, query);
      seriesRows = seriesResult.rows;
    } else {
      const listResult = await listTaskManagementItems(ctx, query, timeZone, locale);
      items = listResult.items;
      totalCount = listResult.totalCount;
      page = listResult.page;
      pageCount = listResult.pageCount;
    }
  } catch {
    loadError = true;
  }

  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <AufgabenManagementWorkspace
        tenantWideVisibility={tenantWideVisibility}
        locale={locale}
        timeZone={timeZone}
        query={query}
        sort={sort}
        summary={summary}
        items={items}
        seriesRows={seriesRows}
        totalCount={totalCount}
        page={page}
        pageCount={pageCount}
        assigneeOptions={assigneeOptions}
        canCreate={canCreate}
        canAssign={canAssign}
        canManage={canManage}
        loadError={loadError}
      />
    </div>
  );
}

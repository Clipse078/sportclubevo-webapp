import { PERMISSIONS } from "@/lib/permissions/permissions";
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
import PersonalActionsInbox from "@/components/admin/aufgaben/PersonalActionsInbox";
import AufgabenScopeToggle from "@/components/admin/aufgaben/AufgabenScopeToggle";
import { requirePersonalActionsModuleAccess } from "@/lib/personal-actions/require-module-access";
import { countPersonalActions, loadPersonalActions } from "@/lib/personal-actions";
import {
  filterPersonalActionsForInbox,
  mapPersonalActionToListItem,
  PERSONAL_ACTION_INBOX_DEFAULT_LIMIT,
} from "@/lib/personal-actions/presentation";
import {
  parseAufgabenBereich,
  parsePersonalInboxFilter,
} from "@/lib/personal-actions/aufgaben-scope";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  bereich?: string;
  filter?: string;
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
  const { session, tenantId, capabilities } = await requirePersonalActionsModuleAccess();

  const params: PageSearchParams = searchParams ? await searchParams : {};
  const bereich = parseAufgabenBereich(params.bereich);
  const inboxFilter = parsePersonalInboxFilter(params.filter);

  const tenant = await getActiveTenant();
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const locale = tenant?.locale ?? "de-CH";
  const fmtCfg = { locale, timezone: timeZone };

  const showManagement = capabilities.taskManagement;
  const effectiveBereich =
    bereich === "verwaltung" && showManagement ? "verwaltung" : "meine";

  if (effectiveBereich === "meine") {
    const [rawActions, actionCounts] = await Promise.all([
      loadPersonalActions({
        tenantId,
        userId: session.user.id,
        permissionKeys: capabilities.permissionKeys,
        limit: PERSONAL_ACTION_INBOX_DEFAULT_LIMIT,
      }),
      countPersonalActions({
        tenantId,
        userId: session.user.id,
        permissionKeys: capabilities.permissionKeys,
      }),
    ]);
    const filtered = filterPersonalActionsForInbox(rawActions, inboxFilter);
    const items = filtered.map((action) =>
      mapPersonalActionToListItem(action, fmtCfg, locale, timeZone),
    );
    const hasMixedSources =
      rawActions.some((a) => a.sourceType === "TASK") &&
      rawActions.some((a) => a.sourceType === "ATTENDANCE_RESPONSE");

    return (
      <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
        <PersonalActionsInbox
          items={items}
          locale={locale}
          timeZone={timeZone}
          showManagementScope={showManagement}
          bereich="meine"
          filter={inboxFilter}
          showSourceFilters={hasMixedSources}
          totalActionableCount={actionCounts.totalActionable}
        />
      </div>
    );
  }

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return null;
  }

  const tenantWideVisibility = canViewAllTasks(ctx);
  const query = resolveTaskManagementQuery(params, tenantWideVisibility);
  const sort = parseTaskManagementSort(params.sort);

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
      {showManagement ? (
        <div className="mb-4">
          <AufgabenScopeToggle active="verwaltung" showManagement />
        </div>
      ) : null}
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

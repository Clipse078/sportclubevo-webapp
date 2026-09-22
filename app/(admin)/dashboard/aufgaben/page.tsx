import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getPersonNameByUserId } from "@/lib/people/queries";
import { resolveAccountIdentityName } from "@/lib/people/identity";
import { resolveQuickCreateCapabilities } from "@/lib/tasks/quick-create";
import { loadTaskOrgUnitFilterOptions } from "@/lib/tasks/task-org-options";
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
import RequirementsManagementWorkspace from "@/components/admin/aufgaben/RequirementsManagementWorkspace";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { canCreateRequirement } from "@/lib/requirements/requirement-authorization";
import {
  getRequirementManagementSummary,
  listRequirementManagementItems,
} from "@/lib/requirements/management-service";
import { resolveRequirementManagementQuery } from "@/lib/requirements/management-navigation";
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
  orgUnit?: string;
  visibility?: string;
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
  const showRequirementManagement = capabilities.requirementManagement;
  const effectiveBereich =
    bereich === "anforderungen" && showRequirementManagement
      ? "anforderungen"
      : bereich === "verwaltung" && showManagement
        ? "verwaltung"
        : "meine";

  if (effectiveBereich === "anforderungen") {
    const reqCtx = await getRequirementServiceContext();
    if (!reqCtx) return null;

    const reqQuery = resolveRequirementManagementQuery(params);
    let summary: Awaited<ReturnType<typeof getRequirementManagementSummary>> = {
      active: 0,
      openRecipients: 0,
      overdue: 0,
      completed: 0,
    };
    let items: Awaited<ReturnType<typeof listRequirementManagementItems>>["items"] = [];
    let totalCount = 0;
    let page = 1;
    let pageCount = 1;
    let loadError = false;

    try {
      const [summaryResult, listResult] = await Promise.all([
        getRequirementManagementSummary(reqCtx),
        listRequirementManagementItems(reqCtx, reqQuery, new Date()),
      ]);
      summary = summaryResult;
      items = listResult.items;
      totalCount = listResult.totalCount;
      page = listResult.page;
      pageCount = listResult.pageCount;
    } catch {
      loadError = true;
    }

    const canCreate = canCreateRequirement(reqCtx);

    return (
      <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
        <RequirementsManagementWorkspace
          locale={locale}
          timeZone={timeZone}
          query={reqQuery}
          summary={summary}
          items={items}
          totalCount={totalCount}
          page={page}
          pageCount={pageCount}
          canCreate={canCreate}
          showTaskManagementScope={showManagement}
          loadError={loadError}
        />
      </div>
    );
  }

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
    const sourceTypes = new Set(rawActions.map((a) => a.sourceType));
    const hasMixedSources = sourceTypes.size > 1;

    const taskCtx = {
      tenantId,
      userId: session.user.id,
      permissionKeys: capabilities.permissionKeys,
    };
    const quickCreateCaps = resolveQuickCreateCapabilities(taskCtx);
    const linkedPerson = await getPersonNameByUserId(session.user.id);
    const identity = resolveAccountIdentityName({
      linkedPerson,
      sessionFirstName: session.user.firstName,
      sessionLastName: session.user.lastName,
      tenantName: tenant?.name,
    });

    return (
      <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
        <PersonalActionsInbox
          items={items}
          locale={locale}
          timeZone={timeZone}
          showManagementScope={showManagement}
          showRequirementScope={showRequirementManagement}
          bereich="meine"
          filter={inboxFilter}
          showSourceFilters={hasMixedSources}
          totalActionableCount={actionCounts.totalActionable}
          quickCreate={{
            canCreateSelf: quickCreateCaps.canCreateSelf,
            canAssignOthers: quickCreateCaps.canAssignOthers,
            canOpenFullCreate: hasTaskPermission(taskCtx, PERMISSIONS.TASKS_CREATE),
            currentUser: {
              userId: session.user.id,
              firstName: identity.firstName,
              lastName: identity.lastName,
            },
            timeZone,
          }}
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

  const [summary, assigneeOptions, orgUnitFilterOptions] = await Promise.all([
    getTaskManagementSummary(ctx, timeZone),
    tenantWideVisibility
      ? listEligibleTaskAssignees(ctx.tenantId)
      : Promise.resolve([]),
    loadTaskOrgUnitFilterOptions(ctx),
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
      {showManagement || showRequirementManagement ? (
        <div className="mb-4">
          <AufgabenScopeToggle
            active="verwaltung"
            showManagement={showManagement}
            showRequirements={showRequirementManagement}
          />
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
        orgUnitFilterOptions={orgUnitFilterOptions}
        canCreate={canCreate}
        canAssign={canAssign}
        canManage={canManage}
        loadError={loadError}
      />
    </div>
  );
}

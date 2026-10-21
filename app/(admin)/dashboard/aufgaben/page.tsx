import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listEligibleTaskAssignees } from "@/lib/tasks/queries";
import { getPersonNameByUserId } from "@/lib/people/queries";
import { resolvePersonUserIdentityByUserId } from "@/lib/people/person-user-identity";
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
import Link from "next/link";
import { redirect } from "next/navigation";
import PersonalActionsInbox from "@/components/admin/aufgaben/PersonalActionsInbox";
import AufgabenWorkspaceShell from "@/components/admin/aufgaben/AufgabenWorkspaceShell";
import AufgabenVerwaltungWorkspace from "@/components/admin/aufgaben/AufgabenVerwaltungWorkspace";
import AufgabenWorkspaceCreateChooser from "@/components/admin/aufgaben/AufgabenWorkspaceCreateChooser";
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
  buildLegacyAnforderungenBereichRedirectHref,
  parseAufgabenBereich,
  parsePersonalInboxFilter,
  parseVerwaltungTypeFilter,
} from "@/lib/personal-actions/aufgaben-scope";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  bereich?: string;
  type?: string;
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

  if (params.bereich === "anforderungen") {
    redirect(buildLegacyAnforderungenBereichRedirectHref(params));
  }

  const bereichRaw = parseAufgabenBereich(params.bereich);
  const inboxFilter = parsePersonalInboxFilter(params.filter);
  const verwaltungTypeFilter = parseVerwaltungTypeFilter(params.type);

  const tenant = await getActiveTenant();
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const locale = tenant?.locale ?? "de-CH";
  const fmtCfg = { locale, timezone: timeZone };

  const showMeine = capabilities.personalInbox;
  const showVerwaltung = capabilities.taskManagement || capabilities.requirementManagement;
  const showTaskVerwaltung = capabilities.taskManagement;
  const showRequirementVerwaltung = capabilities.requirementManagement;

  const effectiveBereich =
    bereichRaw === "verwaltung" && showVerwaltung
      ? "verwaltung"
      : showMeine
        ? "meine"
        : showVerwaltung
          ? "verwaltung"
          : "meine";

  const reqCtx = await getRequirementServiceContext();
  const canCreateReq = reqCtx ? canCreateRequirement(reqCtx) : false;

  const taskCtx = await getTaskServiceContext();
  const canCreateTask =
    taskCtx != null && hasTaskPermission(taskCtx, PERMISSIONS.TASKS_CREATE);

  if (effectiveBereich === "meine") {
    const linkedPerson = await getPersonNameByUserId(session.user.id);
    const linkedPersonIdentity = await resolvePersonUserIdentityByUserId(tenantId, session.user.id);
    const identity = resolveAccountIdentityName({
      linkedPerson,
      sessionFirstName: session.user.firstName,
      sessionLastName: session.user.lastName,
      tenantName: tenant?.name,
    });

    const quickCreateCaps = resolveQuickCreateCapabilities({
      tenantId,
      userId: session.user.id,
      permissionKeys: capabilities.permissionKeys,
    });

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

    const meineCreateChooser = (
      <AufgabenWorkspaceCreateChooser
        variant="meine"
        canCreateTask={canCreateTask && quickCreateCaps.canCreateSelf}
        canCreateRequirement={canCreateReq}
        timeZone={timeZone}
        meineQuickCreate={
          quickCreateCaps.canCreateSelf
            ? {
                canCreateSelf: quickCreateCaps.canCreateSelf,
                canAssignOthers: quickCreateCaps.canAssignOthers,
                canOpenFullCreate: hasTaskPermission(
                  {
                    tenantId,
                    userId: session.user.id,
                    permissionKeys: capabilities.permissionKeys,
                  },
                  PERMISSIONS.TASKS_CREATE,
                ),
                currentUser: {
                  userId: session.user.id,
                  personId: linkedPersonIdentity?.personId,
                  firstName: identity.firstName,
                  lastName: identity.lastName,
                },
              }
            : undefined
        }
      />
    );

    return (
      <AufgabenWorkspaceShell
        bereich="meine"
        showMeine={showMeine}
        showVerwaltung={showVerwaltung}
        primaryAction={meineCreateChooser}
      >
        <PersonalActionsInbox
          items={items}
          locale={locale}
          timeZone={timeZone}
          filter={inboxFilter}
          showSourceFilters={hasMixedSources}
          totalActionableCount={actionCounts.totalActionable}
        />
      </AufgabenWorkspaceShell>
    );
  }

  const tenantWideVisibility = taskCtx ? canViewAllTasks(taskCtx) : false;
  const query = taskCtx
    ? resolveTaskManagementQuery(params, tenantWideVisibility)
    : resolveTaskManagementQuery({}, tenantWideVisibility);
  const sort = parseTaskManagementSort(params.sort);
  const reqQuery = resolveRequirementManagementQuery(params);

  const needsTasks =
    showTaskVerwaltung &&
    (verwaltungTypeFilter === "all" || verwaltungTypeFilter === "tasks");
  const needsRequirements =
    showRequirementVerwaltung &&
    (verwaltungTypeFilter === "all" || verwaltungTypeFilter === "requirements");

  const [summary, assigneeOptions, orgUnitFilterOptions, reqSummary] = await Promise.all([
    needsTasks && taskCtx
      ? getTaskManagementSummary(taskCtx, timeZone)
      : Promise.resolve({ open: 0, overdue: 0, dueThisWeek: 0, myOpen: 0 }),
    needsTasks && taskCtx && tenantWideVisibility
      ? listEligibleTaskAssignees(taskCtx.tenantId)
      : Promise.resolve([]),
    needsTasks && taskCtx ? loadTaskOrgUnitFilterOptions(taskCtx) : Promise.resolve([]),
    needsRequirements && reqCtx
      ? getRequirementManagementSummary(reqCtx)
      : Promise.resolve({ active: 0, openRecipients: 0, overdue: 0, completed: 0 }),
  ]);

  let items: Awaited<ReturnType<typeof listTaskManagementItems>>["items"] = [];
  let totalCount = 0;
  let page = 1;
  let pageCount = 1;
  let seriesRows: Awaited<ReturnType<typeof listTaskSeriesManagementRows>>["rows"] = [];
  let taskLoadError = false;

  let reqItems: Awaited<ReturnType<typeof listRequirementManagementItems>>["items"] = [];
  let reqTotalCount = 0;
  let reqPage = 1;
  let reqPageCount = 1;
  let reqLoadError = false;

  try {
    if (needsTasks && taskCtx) {
      if (query.view === "WIEDERKEHREND") {
        const seriesResult = await listTaskSeriesManagementRows(taskCtx, query);
        seriesRows = seriesResult.rows;
      } else {
        const listResult = await listTaskManagementItems(taskCtx, query, timeZone, locale);
        items = listResult.items;
        totalCount = listResult.totalCount;
        page = listResult.page;
        pageCount = listResult.pageCount;
      }
    }
  } catch {
    taskLoadError = true;
  }

  try {
    if (needsRequirements && reqCtx) {
      const listResult = await listRequirementManagementItems(reqCtx, reqQuery, new Date());
      reqItems = listResult.items;
      reqTotalCount = listResult.totalCount;
      reqPage = listResult.page;
      reqPageCount = listResult.pageCount;
    }
  } catch {
    reqLoadError = true;
  }

  const canAssign =
    taskCtx != null &&
    (hasTaskPermission(taskCtx, PERMISSIONS.TASKS_ASSIGN) ||
      hasTaskPermission(taskCtx, PERMISSIONS.TASKS_MANAGE));
  const canManage = taskCtx != null && hasTaskPermission(taskCtx, PERMISSIONS.TASKS_MANAGE);

  const verwaltungCreateChooser = (
    <AufgabenWorkspaceCreateChooser
      variant="verwaltung"
      canCreateTask={canCreateTask}
      canCreateRequirement={canCreateReq}
      timeZone={timeZone}
      assigneeOptions={assigneeOptions}
      canManageTasks={canManage}
    />
  );

  return (
    <AufgabenWorkspaceShell
      bereich="verwaltung"
      showMeine={showMeine}
      showVerwaltung={showVerwaltung}
      secondaryActions={
        canManage ? (
          <Link
            href="/dashboard/aufgaben/serien/neu"
            className="fca-button-secondary inline-flex items-center text-sm"
            data-testid="aufgaben-recurring-create-header"
          >
            Wiederkehrend
          </Link>
        ) : null
      }
      primaryAction={verwaltungCreateChooser}
    >
      <AufgabenVerwaltungWorkspace
        typeFilter={verwaltungTypeFilter}
        showTasks={showTaskVerwaltung}
        showRequirements={showRequirementVerwaltung}
        locale={locale}
        timeZone={timeZone}
        taskQuery={query}
        taskSort={sort}
        taskSummary={summary}
        taskItems={items}
        taskSeriesRows={seriesRows}
        taskTotalCount={totalCount}
        taskPage={page}
        taskPageCount={pageCount}
        assigneeOptions={assigneeOptions}
        orgUnitFilterOptions={orgUnitFilterOptions}
        canCreateTask={canCreateTask}
        canAssign={canAssign}
        canManageTasks={canManage}
        tenantWideVisibility={tenantWideVisibility}
        taskLoadError={taskLoadError}
        reqQuery={reqQuery}
        reqSummary={reqSummary}
        reqItems={reqItems}
        reqTotalCount={reqTotalCount}
        reqPage={reqPage}
        reqPageCount={reqPageCount}
        canCreateRequirement={canCreateReq}
        reqLoadError={reqLoadError}
      />
    </AufgabenWorkspaceShell>
  );
}

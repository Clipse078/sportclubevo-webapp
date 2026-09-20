import {
  buildTaskManagementHref,
  buildTaskManagementResetHref,
  type TaskManagementQueryState,
} from "./management-navigation";
import { TASK_CONTEXT_LABELS } from "./management-labels";

export function buildTaskManagementFilterHrefMaps(
  basePath: string,
  query: TaskManagementQueryState,
  options?: { tenantWideVisibility?: boolean },
): {
  resetHref: string;
  statusHrefByValue: Record<string, string>;
  assigneeHrefByValue: Record<string, string>;
  priorityHrefByValue: Record<string, string>;
  deadlineHrefByValue: Record<string, string>;
  recurringHrefByValue: Record<string, string>;
  contextHrefByValue: Record<string, string>;
  viewHrefByValue: Record<string, string>;
  kpiHrefs: {
    open: string;
    overdue: string;
    dueThisWeek: string;
    my: string;
  };
} {
  const hrefOptions = {
    tenantWideVisibility: options?.tenantWideVisibility ?? true,
  };

  const statusHrefByValue: Record<string, string> = {
    ACTIVE: buildTaskManagementHref(basePath, { status: "ACTIVE", page: 1 }, query, hrefOptions),
    OPEN: buildTaskManagementHref(basePath, { status: "OPEN", page: 1 }, query, hrefOptions),
    IN_PROGRESS: buildTaskManagementHref(
      basePath,
      { status: "IN_PROGRESS", page: 1 },
      query,
      hrefOptions,
    ),
    DONE: buildTaskManagementHref(basePath, { status: "DONE", page: 1 }, query, hrefOptions),
    CANCELLED: buildTaskManagementHref(
      basePath,
      { status: "CANCELLED", page: 1 },
      query,
      hrefOptions,
    ),
  };

  const assigneeHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(
      basePath,
      { assigneeUserId: null, page: 1 },
      query,
      hrefOptions,
    ),
  };

  const priorityHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(basePath, { priority: null, page: 1 }, query, hrefOptions),
    LOW: buildTaskManagementHref(basePath, { priority: "LOW", page: 1 }, query, hrefOptions),
    NORMAL: buildTaskManagementHref(
      basePath,
      { priority: "NORMAL", page: 1 },
      query,
      hrefOptions,
    ),
    HIGH: buildTaskManagementHref(basePath, { priority: "HIGH", page: 1 }, query, hrefOptions),
    URGENT: buildTaskManagementHref(
      basePath,
      { priority: "URGENT", page: 1 },
      query,
      hrefOptions,
    ),
  };

  const deadlineHrefByValue: Record<string, string> = {
    ALL: buildTaskManagementHref(basePath, { deadline: "ALL", page: 1 }, query, hrefOptions),
    OVERDUE: buildTaskManagementHref(
      basePath,
      { deadline: "OVERDUE", page: 1 },
      query,
      hrefOptions,
    ),
    THIS_WEEK: buildTaskManagementHref(
      basePath,
      { deadline: "THIS_WEEK", page: 1 },
      query,
      hrefOptions,
    ),
    NO_DEADLINE: buildTaskManagementHref(
      basePath,
      { deadline: "NO_DEADLINE", page: 1 },
      query,
      hrefOptions,
    ),
  };

  const recurringHrefByValue: Record<string, string> = {
    ALL: buildTaskManagementHref(basePath, { recurring: "ALL", page: 1 }, query, hrefOptions),
    RECURRING: buildTaskManagementHref(
      basePath,
      { recurring: "RECURRING", page: 1 },
      query,
      hrefOptions,
    ),
    SINGLE: buildTaskManagementHref(
      basePath,
      { recurring: "SINGLE", page: 1 },
      query,
      hrefOptions,
    ),
  };

  const contextHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(basePath, { contextType: null, page: 1 }, query, hrefOptions),
  };
  for (const key of Object.keys(TASK_CONTEXT_LABELS)) {
    contextHrefByValue[key] = buildTaskManagementHref(
      basePath,
      { contextType: key, page: 1 },
      query,
      hrefOptions,
    );
  }

  const viewHrefByValue: Record<string, string> = {
    MEINE: buildTaskManagementHref(basePath, { view: "MEINE", page: 1 }, query, hrefOptions),
    ALLE: buildTaskManagementHref(basePath, { view: "ALLE", page: 1 }, query, hrefOptions),
    UEBERFAELLIG: buildTaskManagementHref(
      basePath,
      { view: "UEBERFAELLIG", page: 1 },
      query,
      hrefOptions,
    ),
    DEMNAECHST: buildTaskManagementHref(
      basePath,
      { view: "DEMNAECHST", page: 1 },
      query,
      hrefOptions,
    ),
    WIEDERKEHREND: buildTaskManagementHref(
      basePath,
      { view: "WIEDERKEHREND", page: 1 },
      query,
      hrefOptions,
    ),
    ERLEDIGT: buildTaskManagementHref(
      basePath,
      { view: "ERLEDIGT", page: 1 },
      query,
      hrefOptions,
    ),
  };

  const openListView = hrefOptions.tenantWideVisibility ? "ALLE" : "MEINE";

  return {
    resetHref: buildTaskManagementResetHref(basePath, query.view, hrefOptions),
    statusHrefByValue,
    assigneeHrefByValue,
    priorityHrefByValue,
    deadlineHrefByValue,
    recurringHrefByValue,
    contextHrefByValue,
    viewHrefByValue,
    kpiHrefs: {
      open: viewHrefByValue[openListView]!,
      overdue: viewHrefByValue.UEBERFAELLIG,
      dueThisWeek: buildTaskManagementHref(
        basePath,
        { view: openListView, deadline: "THIS_WEEK", page: 1 },
        { ...query, view: openListView, deadline: "THIS_WEEK" },
        hrefOptions,
      ),
      my: viewHrefByValue.MEINE,
    },
  };
}

export function mergeAssigneeFilterHrefs(
  maps: ReturnType<typeof buildTaskManagementFilterHrefMaps>,
  basePath: string,
  query: TaskManagementQueryState,
  assigneeOptions: { userId: string }[],
  options?: { tenantWideVisibility?: boolean },
): Record<string, string> {
  const hrefs = { ...maps.assigneeHrefByValue };
  for (const option of assigneeOptions) {
    hrefs[option.userId] = buildTaskManagementHref(
      basePath,
      { assigneeUserId: option.userId, page: 1 },
      query,
      { tenantWideVisibility: options?.tenantWideVisibility ?? true },
    );
  }
  return hrefs;
}

import {
  buildTaskManagementHref,
  buildTaskManagementResetHref,
  type TaskManagementQueryState,
} from "./management-navigation";
import { TASK_CONTEXT_LABELS } from "./management-labels";

export function buildTaskManagementFilterHrefMaps(
  basePath: string,
  query: TaskManagementQueryState,
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
  const statusHrefByValue: Record<string, string> = {
    ACTIVE: buildTaskManagementHref(basePath, { status: "ACTIVE", page: 1 }, query),
    OPEN: buildTaskManagementHref(basePath, { status: "OPEN", page: 1 }, query),
    IN_PROGRESS: buildTaskManagementHref(
      basePath,
      { status: "IN_PROGRESS", page: 1 },
      query,
    ),
    DONE: buildTaskManagementHref(basePath, { status: "DONE", page: 1 }, query),
    CANCELLED: buildTaskManagementHref(basePath, { status: "CANCELLED", page: 1 }, query),
  };

  const assigneeHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(basePath, { assigneeUserId: null, page: 1 }, query),
  };

  const priorityHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(basePath, { priority: null, page: 1 }, query),
    LOW: buildTaskManagementHref(basePath, { priority: "LOW", page: 1 }, query),
    NORMAL: buildTaskManagementHref(basePath, { priority: "NORMAL", page: 1 }, query),
    HIGH: buildTaskManagementHref(basePath, { priority: "HIGH", page: 1 }, query),
    URGENT: buildTaskManagementHref(basePath, { priority: "URGENT", page: 1 }, query),
  };

  const deadlineHrefByValue: Record<string, string> = {
    ALL: buildTaskManagementHref(basePath, { deadline: "ALL", page: 1 }, query),
    OVERDUE: buildTaskManagementHref(basePath, { deadline: "OVERDUE", page: 1 }, query),
    THIS_WEEK: buildTaskManagementHref(basePath, { deadline: "THIS_WEEK", page: 1 }, query),
    NO_DEADLINE: buildTaskManagementHref(basePath, { deadline: "NO_DEADLINE", page: 1 }, query),
  };

  const recurringHrefByValue: Record<string, string> = {
    ALL: buildTaskManagementHref(basePath, { recurring: "ALL", page: 1 }, query),
    RECURRING: buildTaskManagementHref(basePath, { recurring: "RECURRING", page: 1 }, query),
    SINGLE: buildTaskManagementHref(basePath, { recurring: "SINGLE", page: 1 }, query),
  };

  const contextHrefByValue: Record<string, string> = {
    "": buildTaskManagementHref(basePath, { contextType: null, page: 1 }, query),
  };
  for (const key of Object.keys(TASK_CONTEXT_LABELS)) {
    contextHrefByValue[key] = buildTaskManagementHref(
      basePath,
      { contextType: key, page: 1 },
      query,
    );
  }

  const viewHrefByValue: Record<string, string> = {
    MEINE: buildTaskManagementHref(basePath, { view: "MEINE", page: 1 }, query),
    ALLE: buildTaskManagementHref(basePath, { view: "ALLE", page: 1 }, query),
    UEBERFAELLIG: buildTaskManagementHref(basePath, { view: "UEBERFAELLIG", page: 1 }, query),
    DEMNAECHST: buildTaskManagementHref(basePath, { view: "DEMNAECHST", page: 1 }, query),
    WIEDERKEHREND: buildTaskManagementHref(basePath, { view: "WIEDERKEHREND", page: 1 }, query),
    ERLEDIGT: buildTaskManagementHref(basePath, { view: "ERLEDIGT", page: 1 }, query),
  };

  return {
    resetHref: buildTaskManagementResetHref(basePath, query.view),
    statusHrefByValue,
    assigneeHrefByValue,
    priorityHrefByValue,
    deadlineHrefByValue,
    recurringHrefByValue,
    contextHrefByValue,
    viewHrefByValue,
    kpiHrefs: {
      open: viewHrefByValue.ALLE,
      overdue: viewHrefByValue.UEBERFAELLIG,
      dueThisWeek: buildTaskManagementHref(
        basePath,
        { view: "ALLE", deadline: "THIS_WEEK", page: 1 },
        { ...query, view: "ALLE", deadline: "THIS_WEEK" },
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
): Record<string, string> {
  const hrefs = { ...maps.assigneeHrefByValue };
  for (const option of assigneeOptions) {
    hrefs[option.userId] = buildTaskManagementHref(
      basePath,
      { assigneeUserId: option.userId, page: 1 },
      query,
    );
  }
  return hrefs;
}

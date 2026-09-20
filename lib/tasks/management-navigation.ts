export type TaskManagementView =
  | "MEINE"
  | "ALLE"
  | "UEBERFAELLIG"
  | "DEMNAECHST"
  | "WIEDERKEHREND"
  | "ERLEDIGT";

export type TaskManagementSort =
  | "DEADLINE_ASC"
  | "PRIORITY_DESC"
  | "CREATED_DESC"
  | "UPDATED_DESC"
  | "TITLE_ASC";

export type TaskManagementStatusFilter = "ACTIVE" | "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type TaskManagementDeadlineFilter =
  | "ALL"
  | "OVERDUE"
  | "THIS_WEEK"
  | "NO_DEADLINE";

export type TaskManagementRecurringFilter = "ALL" | "RECURRING" | "SINGLE";

export type TaskManagementQueryState = {
  view: TaskManagementView;
  search: string;
  sort: TaskManagementSort;
  status: TaskManagementStatusFilter;
  assigneeUserId: string | null;
  priority: string | null;
  deadline: TaskManagementDeadlineFilter;
  recurring: TaskManagementRecurringFilter;
  contextType: string | null;
  page: number;
};

export const TASK_MANAGEMENT_VIEW_LABELS: Record<TaskManagementView, string> = {
  MEINE: "Meine",
  ALLE: "Alle",
  UEBERFAELLIG: "Überfällig",
  DEMNAECHST: "Demnächst",
  WIEDERKEHREND: "Wiederkehrend",
  ERLEDIGT: "Erledigt",
};

export const TASK_MANAGEMENT_SORT_LABELS: Record<TaskManagementSort, string> = {
  DEADLINE_ASC: "Termin (früh zuerst)",
  PRIORITY_DESC: "Priorität",
  CREATED_DESC: "Erstellt",
  UPDATED_DESC: "Aktualisiert",
  TITLE_ASC: "Titel A–Z",
};

export const TASK_MANAGEMENT_ALL_VIEWS: TaskManagementView[] = [
  "MEINE",
  "ALLE",
  "UEBERFAELLIG",
  "DEMNAECHST",
  "WIEDERKEHREND",
  "ERLEDIGT",
];

export const TENANT_WIDE_DEFAULT_VIEW: TaskManagementView = "ALLE";
export const PERSONAL_DEFAULT_VIEW: TaskManagementView = "MEINE";

const DEFAULT_SORT: TaskManagementSort = "DEADLINE_ASC";

const VALID_VIEWS = new Set<string>(Object.keys(TASK_MANAGEMENT_VIEW_LABELS));
const VALID_SORTS = new Set<string>(Object.keys(TASK_MANAGEMENT_SORT_LABELS));

export function taskManagementViewsForScope(tenantWideVisibility: boolean): TaskManagementView[] {
  if (tenantWideVisibility) {
    return TASK_MANAGEMENT_ALL_VIEWS;
  }
  return TASK_MANAGEMENT_ALL_VIEWS.filter((view) => view !== "ALLE");
}

export function parseTaskManagementView(
  raw: string | undefined,
  defaultView: TaskManagementView = TENANT_WIDE_DEFAULT_VIEW,
): TaskManagementView {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_VIEWS.has(value)) {
    return value as TaskManagementView;
  }
  return defaultView;
}

export function parseTaskManagementSort(raw: string | undefined): TaskManagementSort {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_SORTS.has(value)) {
    return value as TaskManagementSort;
  }
  return DEFAULT_SORT;
}

export function parseTaskManagementQuery(
  params: Record<string, string | undefined>,
  options?: { tenantWideVisibility?: boolean },
): TaskManagementQueryState {
  const tenantWide = options?.tenantWideVisibility ?? true;
  const defaultView = tenantWide ? TENANT_WIDE_DEFAULT_VIEW : PERSONAL_DEFAULT_VIEW;
  const pageRaw = params.page?.trim();
  const page = pageRaw ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  return {
    view: parseTaskManagementView(params.view, defaultView),
    search: params.q?.trim() ?? "",
    sort: parseTaskManagementSort(params.sort),
    status: (params.status?.trim().toUpperCase() as TaskManagementStatusFilter) || "ACTIVE",
    assigneeUserId: params.assignee?.trim() || null,
    priority: params.priority?.trim() || null,
    deadline: (params.deadline?.trim().toUpperCase() as TaskManagementDeadlineFilter) || "ALL",
    recurring: (params.recurring?.trim().toUpperCase() as TaskManagementRecurringFilter) || "ALL",
    contextType: params.context?.trim() || null,
    page,
  };
}

/**
 * Server-side scope enforcement — query parameters must never broaden visibility.
 */
export function sanitizeTaskManagementQuery(
  query: TaskManagementQueryState,
  tenantWideVisibility: boolean,
): TaskManagementQueryState {
  if (tenantWideVisibility) {
    return query;
  }

  let view = query.view;
  if (view === "ALLE") {
    view = PERSONAL_DEFAULT_VIEW;
  }

  return {
    ...query,
    view,
    assigneeUserId: null,
  };
}

export function resolveTaskManagementQuery(
  params: Record<string, string | undefined>,
  tenantWideVisibility: boolean,
): TaskManagementQueryState {
  const parsed = parseTaskManagementQuery(params, { tenantWideVisibility });
  return sanitizeTaskManagementQuery(parsed, tenantWideVisibility);
}

export function buildTaskManagementHref(
  basePath: string,
  state: Partial<TaskManagementQueryState> & { view?: TaskManagementView },
  current: TaskManagementQueryState,
  options?: { tenantWideVisibility?: boolean },
): string {
  const tenantWide = options?.tenantWideVisibility ?? true;
  const defaultView = tenantWide ? TENANT_WIDE_DEFAULT_VIEW : PERSONAL_DEFAULT_VIEW;

  const merged: TaskManagementQueryState = {
    ...current,
    ...state,
    page: state.page ?? (state.view && state.view !== current.view ? 1 : current.page),
  };

  const next = new URLSearchParams();

  if (merged.view !== defaultView) next.set("view", merged.view);
  if (merged.search) next.set("q", merged.search);
  if (merged.sort !== DEFAULT_SORT) next.set("sort", merged.sort);
  if (merged.status !== "ACTIVE") next.set("status", merged.status);
  if (tenantWide && merged.assigneeUserId) next.set("assignee", merged.assigneeUserId);
  if (merged.priority) next.set("priority", merged.priority);
  if (merged.deadline !== "ALL") next.set("deadline", merged.deadline);
  if (merged.recurring !== "ALL") next.set("recurring", merged.recurring);
  if (merged.contextType) next.set("context", merged.contextType);
  if (merged.page > 1) next.set("page", String(merged.page));

  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function hasSecondaryTaskFilters(state: TaskManagementQueryState): boolean {
  return Boolean(
    state.search ||
      state.status !== "ACTIVE" ||
      state.assigneeUserId ||
      state.priority ||
      state.deadline !== "ALL" ||
      state.recurring !== "ALL" ||
      state.contextType,
  );
}

export function buildTaskManagementResetHref(
  basePath: string,
  view: TaskManagementView,
  options?: { tenantWideVisibility?: boolean },
): string {
  const tenantWide = options?.tenantWideVisibility ?? true;
  const defaultView = tenantWide ? TENANT_WIDE_DEFAULT_VIEW : PERSONAL_DEFAULT_VIEW;
  return view === defaultView ? basePath : `${basePath}?view=${view}`;
}

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

const DEFAULT_VIEW: TaskManagementView = "ALLE";
const DEFAULT_SORT: TaskManagementSort = "DEADLINE_ASC";

const VALID_VIEWS = new Set<string>(Object.keys(TASK_MANAGEMENT_VIEW_LABELS));
const VALID_SORTS = new Set<string>(Object.keys(TASK_MANAGEMENT_SORT_LABELS));

export function parseTaskManagementView(raw: string | undefined): TaskManagementView {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_VIEWS.has(value)) {
    return value as TaskManagementView;
  }
  return DEFAULT_VIEW;
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
): TaskManagementQueryState {
  const pageRaw = params.page?.trim();
  const page = pageRaw ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  return {
    view: parseTaskManagementView(params.view),
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

export function buildTaskManagementHref(
  basePath: string,
  state: Partial<TaskManagementQueryState> & { view?: TaskManagementView },
  current: TaskManagementQueryState,
): string {
  const merged: TaskManagementQueryState = {
    ...current,
    ...state,
    page: state.page ?? (state.view && state.view !== current.view ? 1 : current.page),
  };

  const next = new URLSearchParams();

  if (merged.view !== DEFAULT_VIEW) next.set("view", merged.view);
  if (merged.search) next.set("q", merged.search);
  if (merged.sort !== DEFAULT_SORT) next.set("sort", merged.sort);
  if (merged.status !== "ACTIVE") next.set("status", merged.status);
  if (merged.assigneeUserId) next.set("assignee", merged.assigneeUserId);
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

export function buildTaskManagementResetHref(basePath: string, view: TaskManagementView): string {
  return view === DEFAULT_VIEW ? basePath : `${basePath}?view=${view}`;
}

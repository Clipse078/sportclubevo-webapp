import type { RequirementStatus } from "@prisma/client";

export type RequirementManagementSort =
  | "DEADLINE_ASC"
  | "CREATED_DESC"
  | "TITLE_ASC"
  | "PROGRESS_DESC";

export type RequirementManagementDeadlineFilter = "ALL" | "OVERDUE";

export type RequirementManagementStatusFilter = RequirementStatus | "ALL";

export type RequirementManagementQueryState = {
  search: string;
  sort: RequirementManagementSort;
  status: RequirementManagementStatusFilter;
  deadline: RequirementManagementDeadlineFilter;
  page: number;
};

export const REQUIREMENT_MANAGEMENT_PAGE_SIZE = 25;

export const REQUIREMENT_MANAGEMENT_SORT_LABELS: Record<RequirementManagementSort, string> = {
  DEADLINE_ASC: "Fälligkeit",
  CREATED_DESC: "Erstellt",
  TITLE_ASC: "Titel",
  PROGRESS_DESC: "Fortschritt",
};

const VALID_SORTS = new Set<string>(Object.keys(REQUIREMENT_MANAGEMENT_SORT_LABELS));
const VALID_STATUS = new Set<string>(["ALL", "DRAFT", "ACTIVE", "CLOSED", "CANCELLED"]);
const VALID_DEADLINE = new Set<string>(["ALL", "OVERDUE"]);

export function parseRequirementManagementSort(raw: string | undefined): RequirementManagementSort {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_SORTS.has(value)) {
    return value as RequirementManagementSort;
  }
  return "DEADLINE_ASC";
}

export function parseRequirementManagementStatus(
  raw: string | undefined,
): RequirementManagementStatusFilter {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_STATUS.has(value)) {
    return value as RequirementManagementStatusFilter;
  }
  return "ALL";
}

export function parseRequirementManagementDeadline(
  raw: string | undefined,
): RequirementManagementDeadlineFilter {
  const value = raw?.trim().toUpperCase();
  if (value && VALID_DEADLINE.has(value)) {
    return value as RequirementManagementDeadlineFilter;
  }
  return "ALL";
}

export function parseRequirementManagementPage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function resolveRequirementManagementQuery(
  params: Record<string, string | undefined>,
): RequirementManagementQueryState {
  return {
    search: params.q?.trim() ?? "",
    sort: parseRequirementManagementSort(params.sort),
    status: parseRequirementManagementStatus(params.status),
    deadline: parseRequirementManagementDeadline(params.deadline),
    page: parseRequirementManagementPage(params.page),
  };
}

export function buildRequirementManagementHref(
  basePath: string,
  query: RequirementManagementQueryState,
  patch: Partial<RequirementManagementQueryState> = {},
): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams({ bereich: "anforderungen" });
  if (merged.search) params.set("q", merged.search);
  if (merged.sort !== "DEADLINE_ASC") params.set("sort", merged.sort);
  if (merged.status !== "ALL") params.set("status", merged.status);
  if (merged.deadline !== "ALL") params.set("deadline", merged.deadline);
  if (merged.page > 1) params.set("page", String(merged.page));
  return `${basePath}?${params.toString()}`;
}

export function requirementDetailHref(requirementId: string): string {
  return `/dashboard/aufgaben/anforderungen/${requirementId}`;
}

export function requirementCreateHref(): string {
  return "/dashboard/aufgaben/anforderungen/neu";
}

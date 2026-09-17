import type { TrainingSeriesManagementSort } from "@/lib/training/management-series-view";

export type TrainingManagementPaginationFilters = {
  seriesSearch?: string;
  seriesTeam?: string;
  seriesStatus?: string;
  archived?: boolean;
};

export type TrainingManagementPaginationPageLink = {
  page: number;
  href: string;
};

export type TrainingManagementPaginationNavigation = {
  pageLinks: TrainingManagementPaginationPageLink[];
  previousHref: string | null;
  nextHref: string | null;
};

export function buildTrainingManagementPageHref(
  filters: TrainingManagementPaginationFilters,
  sort: TrainingSeriesManagementSort,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.archived) params.set("archived", "1");
  if (filters.seriesSearch?.trim()) params.set("seriesSearch", filters.seriesSearch.trim());
  if (filters.seriesTeam) params.set("seriesTeam", filters.seriesTeam);
  if (filters.seriesStatus) params.set("seriesStatus", filters.seriesStatus);
  if (sort !== "UPDATED_DESC") params.set("seriesSort", sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard/training?${qs}` : "/dashboard/training";
}

export function trainingManagementPaginationPageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
}

export function buildTrainingManagementPaginationNavigation(
  filters: TrainingManagementPaginationFilters,
  sort: TrainingSeriesManagementSort,
  page: number,
  pageCount: number,
): TrainingManagementPaginationNavigation {
  const pageNumbers = trainingManagementPaginationPageNumbers(page, pageCount);
  return {
    pageLinks: pageNumbers.map((pageNumber) => ({
      page: pageNumber,
      href: buildTrainingManagementPageHref(filters, sort, pageNumber),
    })),
    previousHref: page > 1 ? buildTrainingManagementPageHref(filters, sort, page - 1) : null,
    nextHref: page < pageCount ? buildTrainingManagementPageHref(filters, sort, page + 1) : null,
  };
}

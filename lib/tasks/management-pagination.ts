import {
  buildTaskManagementHref,
  type TaskManagementQueryState,
  type TaskManagementSort,
} from "./management-navigation";

export type TaskManagementPaginationNavigation = {
  pageLinks: { page: number; href: string }[];
  previousHref: string | null;
  nextHref: string | null;
};

const MAX_PAGE_LINKS = 5;

export function buildTaskManagementPaginationNavigation(
  basePath: string,
  query: TaskManagementQueryState,
  page: number,
  pageCount: number,
): TaskManagementPaginationNavigation {
  const windowStart = Math.max(
    1,
    Math.min(page - Math.floor(MAX_PAGE_LINKS / 2), pageCount - MAX_PAGE_LINKS + 1),
  );
  const windowEnd = Math.min(pageCount, windowStart + MAX_PAGE_LINKS - 1);

  const pageLinks: { page: number; href: string }[] = [];
  for (let p = windowStart; p <= windowEnd; p += 1) {
    pageLinks.push({
      page: p,
      href: buildTaskManagementHref(basePath, { page: p }, query),
    });
  }

  return {
    pageLinks,
    previousHref:
      page > 1 ? buildTaskManagementHref(basePath, { page: page - 1 }, query) : null,
    nextHref:
      page < pageCount ? buildTaskManagementHref(basePath, { page: page + 1 }, query) : null,
  };
}

export function computeTaskManagementRange(
  page: number,
  pageSize: number,
  totalCount: number,
): { rangeStart: number; rangeEnd: number } {
  if (totalCount === 0) return { rangeStart: 0, rangeEnd: 0 };
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  return { rangeStart, rangeEnd };
}

export type { TaskManagementSort };

type TrainingFilterParams = {
  archived?: boolean;
  seriesSearch?: string;
  seriesTeam?: string;
  seriesStatus?: string;
  seriesSort?: string;
  page?: string;
};

export function buildTrainingManagementHref(
  basePath: string,
  params: TrainingFilterParams,
): string {
  const search = new URLSearchParams();
  if (params.archived) search.set("archived", "1");
  if (params.seriesSearch?.trim()) search.set("seriesSearch", params.seriesSearch.trim());
  if (params.seriesTeam) search.set("seriesTeam", params.seriesTeam);
  if (params.seriesStatus) search.set("seriesStatus", params.seriesStatus);
  if (params.seriesSort) search.set("seriesSort", params.seriesSort);
  if (params.page) search.set("page", params.page);
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function buildTrainingFilterHrefMaps(
  basePath: string,
  base: TrainingFilterParams,
  teamIds: string[],
): {
  teamHrefByValue: Record<string, string>;
  statusHrefByValue: Record<string, string>;
  resetFiltersHref: string;
} {
  const teamHrefByValue: Record<string, string> = {
    "": buildTrainingManagementHref(basePath, { ...base, seriesTeam: undefined, page: undefined }),
  };
  for (const id of teamIds) {
    teamHrefByValue[id] = buildTrainingManagementHref(basePath, {
      ...base,
      seriesTeam: id,
      page: undefined,
    });
  }

  const statusHrefByValue: Record<string, string> = {
    "": buildTrainingManagementHref(basePath, { ...base, seriesStatus: undefined, page: undefined }),
    ALL: buildTrainingManagementHref(basePath, { ...base, seriesStatus: "ALL", page: undefined }),
    ACTIVE: buildTrainingManagementHref(basePath, { ...base, seriesStatus: "ACTIVE", page: undefined }),
    INACTIVE: buildTrainingManagementHref(basePath, { ...base, seriesStatus: "INACTIVE", page: undefined }),
    ARCHIVED: buildTrainingManagementHref(basePath, {
      ...base,
      seriesStatus: "ARCHIVED",
      archived: true,
      page: undefined,
    }),
  };

  const resetFiltersHref = buildTrainingManagementHref(basePath, {
    archived: base.archived,
    seriesSearch: undefined,
    seriesTeam: undefined,
    seriesStatus: undefined,
    page: undefined,
  });

  return { teamHrefByValue, statusHrefByValue, resetFiltersHref };
}

/**
 * SCE-TRAININGS-UX-01 — normalize legacy TrainingCenter calendar URLs.
 */

export type LegacyTrainingPageParams = {
  tab?: string;
  view?: string;
  month?: string;
  week?: string;
  day?: string;
  filter?: string;
  archived?: string;
};

export function isLegacyTrainingCalendarUrl(params: LegacyTrainingPageParams): boolean {
  const tab = params.tab?.trim().toLowerCase();
  if (tab === "kalender") return true;
  if (params.view?.trim()) return true;
  if (params.month?.trim()) return true;
  if (params.week?.trim()) return true;
  if (params.day?.trim()) return true;
  if (params.filter?.trim()) return true;
  if (tab === "serien") return true;
  return false;
}

export function buildNormalizedTrainingManagementHref(
  params: LegacyTrainingPageParams & {
    seriesSearch?: string;
    seriesTeam?: string;
    seriesStatus?: string;
    seriesSort?: string;
    page?: string;
    sessionSearch?: string;
    sessionTeam?: string;
    sessionStatus?: string;
    sessionsPage?: string;
  },
): string {
  const query = new URLSearchParams();

  if (params.archived === "1") query.set("archived", "1");
  if (params.seriesSearch?.trim()) query.set("seriesSearch", params.seriesSearch.trim());
  if (params.seriesTeam?.trim()) query.set("seriesTeam", params.seriesTeam.trim());
  if (params.seriesStatus?.trim()) query.set("seriesStatus", params.seriesStatus.trim());
  if (params.seriesSort?.trim()) query.set("seriesSort", params.seriesSort.trim());
  if (params.page?.trim()) query.set("page", params.page.trim());
  if (params.sessionSearch?.trim()) query.set("sessionSearch", params.sessionSearch.trim());
  if (params.sessionTeam?.trim()) query.set("sessionTeam", params.sessionTeam.trim());
  if (params.sessionStatus?.trim()) query.set("sessionStatus", params.sessionStatus.trim());
  if (params.sessionsPage?.trim()) query.set("sessionsPage", params.sessionsPage.trim());

  const qs = query.toString();
  return qs ? `/dashboard/training?${qs}` : "/dashboard/training";
}

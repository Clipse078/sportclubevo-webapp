import { describe, expect, it } from "vitest";
import {
  buildTrainingManagementPageHref,
  buildTrainingManagementPaginationNavigation,
  trainingManagementPaginationPageNumbers,
} from "@/lib/training/management-pagination";

describe("TRAININGS-UX-01J1 training management pagination (RSC-safe)", () => {
  const filters = {
    seriesSearch: " u17 ",
    seriesTeam: "team-season-1",
    seriesStatus: "ACTIVE",
    archived: true,
  };

  it("buildTrainingManagementPageHref preserves canonical query state and page", () => {
    expect(buildTrainingManagementPageHref(filters, "TITLE_ASC", 3)).toBe(
      "/dashboard/training?archived=1&seriesSearch=u17&seriesTeam=team-season-1&seriesStatus=ACTIVE&seriesSort=TITLE_ASC&page=3",
    );
  });

  it("omits default sort and first page from href", () => {
    expect(buildTrainingManagementPageHref(filters, "TEAM_ASC", 1)).toBe(
      "/dashboard/training?archived=1&seriesSearch=u17&seriesTeam=team-season-1&seriesStatus=ACTIVE",
    );
  });

  it("buildTrainingManagementPaginationNavigation exposes only serializable navigation data", () => {
    const navigation = buildTrainingManagementPaginationNavigation(filters, "WEEKDAY", 2, 6);

    expect(JSON.parse(JSON.stringify(navigation))).toEqual(navigation);
    expect(navigation.previousHref).toBe(
      "/dashboard/training?archived=1&seriesSearch=u17&seriesTeam=team-season-1&seriesStatus=ACTIVE&seriesSort=WEEKDAY",
    );
    expect(navigation.nextHref).toContain("page=3");
    expect(navigation.pageLinks.some((link) => link.page === 2 && link.href.includes("page=2"))).toBe(true);
    expect(navigation.pageLinks.every((link) => typeof link.href === "string")).toBe(true);
  });

  it("previous/next boundaries are null at edges", () => {
    const first = buildTrainingManagementPaginationNavigation(filters, "UPDATED_DESC", 1, 4);
    const last = buildTrainingManagementPaginationNavigation(filters, "UPDATED_DESC", 4, 4);

    expect(first.previousHref).toBeNull();
    expect(first.nextHref).toContain("page=2");
    expect(last.previousHref).toContain("page=3");
    expect(last.nextHref).toBeNull();
  });

  it("trainingManagementPaginationPageNumbers keeps compact window for large page counts", () => {
    expect(trainingManagementPaginationPageNumbers(5, 10)).toEqual([1, 4, 5, 6, 10]);
    expect(trainingManagementPaginationPageNumbers(1, 3)).toEqual([1, 2, 3]);
  });
});

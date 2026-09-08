import { describe, expect, it } from "vitest";
import {
  buildAttentionItems,
  buildCommandCenterKpis,
} from "@/lib/dashboard/command-center";
import { getDashboardQuickActionDefs } from "@/lib/dashboard/quick-actions";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("SCE-DASHBOARD-V3-01 — command center builders", () => {
  describe("buildCommandCenterKpis", () => {
    it("returns core operational KPIs without fake trend data", () => {
      const kpis = buildCommandCenterKpis({
        teamCount: 12,
        activePersonCount: 240,
        todayEventCount: 3,
        openRegistrationCount: 5,
        canSeeRegistrations: true,
      });

      expect(kpis).toHaveLength(4);
      expect(kpis.map((kpi) => kpi.label)).toEqual([
        "Teams",
        "Aktive Personen",
        "Termine heute",
        "Offene Anmeldungen",
      ]);
      expect(kpis.every((kpi) => !kpi.context?.includes("%"))).toBe(true);
    });

    it("omits registrations KPI when the actor lacks registration permissions", () => {
      const kpis = buildCommandCenterKpis({
        teamCount: 4,
        activePersonCount: 80,
        todayEventCount: 1,
        openRegistrationCount: 9,
        canSeeRegistrations: false,
      });

      expect(kpis).toHaveLength(3);
      expect(kpis.some((kpi) => kpi.key === "registrations")).toBe(false);
    });
  });

  describe("buildAttentionItems", () => {
    it("never injects filler tasks when nothing needs attention", () => {
      const items = buildAttentionItems({
        newsInReviewCount: 0,
        openRegistrationCount: 0,
        scheduledNewsCount: 0,
        overdueActionCount: 0,
        canSeeNews: true,
        canSeeRegistrations: true,
        canSeeMeetings: true,
      });

      expect(items).toEqual([]);
    });

    it("creates attention items only from real operational counts", () => {
      const items = buildAttentionItems({
        newsInReviewCount: 2,
        openRegistrationCount: 1,
        scheduledNewsCount: 0,
        overdueActionCount: 3,
        canSeeNews: true,
        canSeeRegistrations: true,
        canSeeMeetings: true,
      });

      expect(items.map((item) => item.key)).toEqual([
        "news-review",
        "registrations",
        "overdue-actions",
      ]);
      expect(items.every((item) => item.href.startsWith("/"))).toBe(true);
    });
  });
});

describe("SCE-DASHBOARD-V3-01 — quick actions", () => {
  it("filters actions by permission keys and caps the rail", () => {
    const actions = getDashboardQuickActionDefs(
      [PERMISSIONS.NEWS_MANAGE, PERMISSIONS.WOCHENPLAN_MANAGE],
      4,
    );

    expect(actions.length).toBeLessThanOrEqual(4);
    expect(actions.some((action) => action.key === "news")).toBe(true);
    expect(actions.some((action) => action.key === "planner-week")).toBe(true);
    expect(actions.some((action) => action.key === "people-access")).toBe(false);
  });
});

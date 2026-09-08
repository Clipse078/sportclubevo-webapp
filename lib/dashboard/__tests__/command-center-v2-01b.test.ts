import { describe, it, expect } from "vitest";
import {
  buildDashboardTasks,
  formatEventTypeLabel,
  FORBIDDEN_FALLBACK_TASK_TITLES,
  tenantEventWhere,
} from "@/lib/dashboard/command-center";
import { getPersonalizedGreeting, resolveDashboardFirstName } from "@/lib/dashboard/greeting";

describe("SCE-DASHBOARD-V2-01B — command center data integrity", () => {
  describe("buildDashboardTasks", () => {
    it("returns no tasks when all counts are zero", () => {
      expect(
        buildDashboardTasks({
          newsInReviewCount: 0,
          openRegistrationCount: 0,
          scheduledNewsCount: 0,
        }),
      ).toEqual([]);
    });

    it("never fabricates fallback filler tasks", () => {
      const tasks = buildDashboardTasks({
        newsInReviewCount: 0,
        openRegistrationCount: 0,
        scheduledNewsCount: 0,
      });

      const titles = tasks.map((t) => t.title);
      for (const forbidden of FORBIDDEN_FALLBACK_TASK_TITLES) {
        expect(titles).not.toContain(forbidden);
      }
      expect(titles).not.toContain("Aktuelle Inhalte validieren");
      expect(titles).not.toContain("Events für nächste Woche eintragen");
    });

    it("creates tasks only from real positive counts", () => {
      const tasks = buildDashboardTasks({
        newsInReviewCount: 2,
        openRegistrationCount: 3,
        scheduledNewsCount: 1,
      });

      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toMatchObject({
        title: "Newsartikel prüfen",
        subtitle: "2 warten auf Freigabe",
      });
      expect(tasks[1]).toMatchObject({
        title: "Anmeldungen prüfen",
        subtitle: "3 offen",
      });
      expect(tasks[2]).toMatchObject({
        title: "Geplante Veröffentlichungen",
        subtitle: "1 vorbereitet",
      });
    });

    it("does not include fake due-date labels", () => {
      const tasks = buildDashboardTasks({
        newsInReviewCount: 1,
        openRegistrationCount: 1,
        scheduledNewsCount: 1,
      });

      const serialized = JSON.stringify(tasks);
      expect(serialized).not.toContain("Morgen");
      expect(serialized).not.toContain("12.06.");
      expect(serialized).not.toContain("Heute");
      expect(serialized).not.toContain("Diese Woche");
    });
  });

  describe("formatEventTypeLabel", () => {
    it("maps known event types without inference", () => {
      expect(formatEventTypeLabel("TRAINING")).toBe("Training");
      expect(formatEventTypeLabel("MATCH")).toBe("Spiel");
      expect(formatEventTypeLabel("TOURNAMENT")).toBe("Turnier");
    });

    it("falls back to neutral Event label for unknown types", () => {
      expect(formatEventTypeLabel("OTHER")).toBe("Event");
      expect(formatEventTypeLabel("MEETING")).toBe("Event");
    });
  });

  describe("tenantEventWhere", () => {
    it("scopes queries to the active tenant", () => {
      expect(tenantEventWhere("tenant-abc", { startAt: { gte: new Date() } })).toEqual({
        tenantId: "tenant-abc",
        startAt: { gte: expect.any(Date) },
      });
    });

    it("does not broaden access when tenantId is null", () => {
      expect(tenantEventWhere(null, { startAt: { gte: new Date() } })).toEqual({
        startAt: { gte: expect.any(Date) },
      });
      expect(tenantEventWhere(null)).toEqual({});
    });
  });

  describe("canonical greeting behaviour", () => {
    it("still resolves Person first name over tenant club name", () => {
      const greeting = getPersonalizedGreeting(
        resolveDashboardFirstName({
          linkedPersonFirstName: "Michael",
          sessionFirstName: "FC Allschwil",
          tenantName: "FC Allschwil",
        }),
        new Date(2026, 0, 1, 8, 0),
      );
      expect(greeting).toBe("Guten Morgen, Michael");
    });
  });
});

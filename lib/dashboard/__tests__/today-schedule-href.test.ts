import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";
import {
  resolveTodayItemHref,
  withTodayItemHrefs,
} from "@/lib/dashboard/today-schedule-href";

function makeItem(overrides: Partial<TodayScheduleItem> = {}): TodayScheduleItem {
  return {
    key: "event-abc123",
    sortAt: new Date("2026-09-08T10:00:00.000Z"),
    timeLabel: "10:00",
    typeLabel: "Training",
    eventType: "TRAINING",
    title: "U15 Training",
    ...overrides,
  };
}

describe("SCE-DASHBOARD-V3-02A — today schedule href resolution", () => {
  describe("resolveTodayItemHref", () => {
    it("returns planner edit href for event-backed schedule items", () => {
      expect(resolveTodayItemHref(makeItem({ key: "event-evt-42" }))).toBe(
        "/dashboard/planner/edit/evt-42",
      );
    });

    it("returns undefined for non-event schedule items", () => {
      expect(resolveTodayItemHref(makeItem({ key: "meeting-board-1" }))).toBeUndefined();
    });
  });

  describe("withTodayItemHrefs", () => {
    it("adds serializable href strings before the client component boundary", () => {
      const items = [
        makeItem({ key: "event-one" }),
        makeItem({ key: "meeting-board-1", title: "Vorstand" }),
      ];

      const prepared = withTodayItemHrefs(items);

      expect(prepared).toEqual([
        {
          ...items[0],
          href: "/dashboard/planner/edit/one",
        },
        {
          ...items[1],
          href: undefined,
        },
      ]);
      expect(prepared.every((item) => typeof item.href === "string" || item.href === undefined)).toBe(
        true,
      );
    });
  });

  describe("dashboard client boundary", () => {
    it("does not expose callback props on DashboardTodaySchedule", () => {
      const source = readFileSync(
        join(process.cwd(), "components/ui/dashboard/DashboardTodaySchedule.tsx"),
        "utf8",
      );

      expect(source).not.toMatch(/resolveHref\?:/);
      expect(source).not.toMatch(/resolveHref,/);
    });

    it("resolves hrefs on the dashboard server page before rendering the client schedule", () => {
      const source = readFileSync(
        join(process.cwd(), "app/(admin)/dashboard/page.tsx"),
        "utf8",
      );

      expect(source).toContain("withTodayItemHrefs");
      expect(source).not.toMatch(/resolveHref=\{/);
    });
  });
});

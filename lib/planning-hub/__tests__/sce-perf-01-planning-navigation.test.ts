import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const PLANNING_HREFS = [
  "/dashboard/planner/week",
  "/dashboard/training",
  "/dashboard/matchcenter",
  "/dashboard/tournamentcenter",
  "/dashboard/veranstaltungen",
] as const;

describe("SCE-PERF-01 Planning navigation contract", () => {
  it("exposes the five Planning hub routes under Planung", () => {
    const permissionKeys = [
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.EVENTS_VIEW,
      PERMISSIONS.EVENTS_MANAGE,
    ];
    const sections = getVisibleNavSections(permissionKeys, "club");
    const planung = sections.flatMap((s) => s.items).find((i) => i.key === "planung");
    expect(planung).toBeDefined();

    const childHrefs = planung!.children?.map((c) => c.href) ?? [];
    for (const href of PLANNING_HREFS) {
      expect(childHrefs).toContain(href);
    }
  });

  it("Planning sidebar implementation uses next/link (client navigation)", () => {
    const sidebarSource = readFileSync(
      join(process.cwd(), "components/admin/layout/AdminSidebar.tsx"),
      "utf8",
    );
    expect(sidebarSource).toContain('import Link from "next/link"');
    expect(sidebarSource).not.toMatch(/window\.location|location\.href|router\.refresh\(/);
  });

  it("admin server timing is disabled unless SCE_PERF_TIMING or PLANNER_PERF_TIMING is set", async () => {
    const prevSce = process.env.SCE_PERF_TIMING;
    const prevPlanner = process.env.PLANNER_PERF_TIMING;
    delete process.env.SCE_PERF_TIMING;
    delete process.env.PLANNER_PERF_TIMING;

    vi.resetModules();
    const { isScePerfTimingEnabled } = await import("@/lib/planning-hub/admin-server-timing");
    expect(isScePerfTimingEnabled()).toBe(false);

    process.env.SCE_PERF_TIMING = "1";
    vi.resetModules();
    const enabled = await import("@/lib/planning-hub/admin-server-timing");
    expect(enabled.isScePerfTimingEnabled()).toBe(true);

    if (prevSce === undefined) delete process.env.SCE_PERF_TIMING;
    else process.env.SCE_PERF_TIMING = prevSce;
    if (prevPlanner === undefined) delete process.env.PLANNER_PERF_TIMING;
    else process.env.PLANNER_PERF_TIMING = prevPlanner;
  });
});

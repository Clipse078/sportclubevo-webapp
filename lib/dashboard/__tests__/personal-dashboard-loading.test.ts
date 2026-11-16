import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Personal dashboard loading UX", () => {
  it("replaces four-panel cockpit fallback with CD-reference section skeleton", () => {
    const skeleton = read(
      "components/admin/dashboard/PersonalDashboardCommandCenterLoadingSurface.tsx",
    );
    const routeLoading = read("components/sce/route-loading/SceModuleRouteLoading.tsx");

    expect(skeleton).not.toContain("DashboardCockpitGrid");
    expect(skeleton).not.toContain("DashboardCockpitCard");
    expect(skeleton).toContain("SCE_WORKSPACE_SECTION_SHELL_CLASS");
    expect(skeleton).toContain("personal-dashboard-programme-tasks-grid-loading");
    expect(routeLoading).toContain("PersonalDashboardCommandCenterLoadingSurface");
    expect(routeLoading).not.toContain("ClubDashboardCommandCenterSkeleton");
  });

  it("streams command center through per-section Suspense", () => {
    const commandCenter = read("components/admin/dashboard/ClubDashboardCommandCenter.tsx");
    expect(commandCenter).toContain("ClubDashboardAttentionSectionAsync");
    expect(commandCenter).toContain("ClubDashboardProgrammeSectionAsync");
    expect(commandCenter).toContain("ClubDashboardTasksSectionAsync");
    expect(commandCenter).toContain('mode="programme"');
    expect(commandCenter).toContain("Suspense");
  });

  it("dedupes work-section fetch between attention and tasks", () => {
    const loaders = read("lib/dashboard/personal-dashboard-section-loaders.ts");
    expect(loaders).toContain("loadPersonalDashboardWorkSectionCached");
    expect(loaders).toContain("readPersonalDashboardCoreCached");
  });
});
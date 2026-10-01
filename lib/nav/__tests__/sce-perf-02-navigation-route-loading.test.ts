import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DASHBOARD_SEGMENT_LOADING_MODULE,
  SCE_ROUTE_MODULE_LOADING,
} from "@/lib/sce/route-module-loading";
import { buildAppNavigationModelForUser } from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const dashboardSegmentLoading = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/loading.tsx"),
  "utf8",
);

const personalDashboardLoading = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/(personal-dashboard)/loading.tsx"),
  "utf8",
);

const adminLoading = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/admin/loading.tsx"),
  "utf8",
);

const websiteLoading = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/website/loading.tsx"),
  "utf8",
);

const moduleLoadingComponent = readFileSync(
  join(process.cwd(), "components/sce/route-loading/SceModuleRouteLoading.tsx"),
  "utf8",
);

const prefetchHook = readFileSync(
  join(process.cwd(), "lib/nav/use-permission-aware-route-prefetch.ts"),
  "utf8",
);

describe("SCE-PERF-02 navigation route loading", () => {
  it("uses neutral parent dashboard segment loading (no cockpit skeleton fallback)", () => {
    expect(SCE_DASHBOARD_SEGMENT_LOADING_MODULE).toBe("neutral");
    expect(dashboardSegmentLoading).toContain("SCE_DASHBOARD_SEGMENT_LOADING_MODULE");
    expect(dashboardSegmentLoading).not.toContain("ClubDashboardCommandCenterSkeleton");
  });

  it("keeps dashboard cockpit skeleton only on personal dashboard route group", () => {
    expect(personalDashboardLoading).toContain('module="dashboard"');
    expect(moduleLoadingComponent).toContain("ClubDashboardCommandCenterSkeleton");
    expect(adminLoading).toContain('module="admin"');
    expect(websiteLoading).toContain('module="publishing"');
    expect(adminLoading).not.toContain("ClubDashboardCommandCenterSkeleton");
    expect(websiteLoading).not.toContain("ClubDashboardCommandCenterSkeleton");
  });

  it("defines destination-specific loading copy for admin and publishing modules", () => {
    expect(SCE_ROUTE_MODULE_LOADING.admin.title).toMatch(/Admin/i);
    expect(SCE_ROUTE_MODULE_LOADING.publishing.title).toMatch(/Publizieren/i);
    expect(SCE_ROUTE_MODULE_LOADING.neutral.testId).toBe("sce-module-route-loading-neutral");
  });

  it("prefetch helper only walks permission-filtered navigation model", () => {
    expect(prefetchHook).toContain("buildAppNavigationModelForUser");
    expect(prefetchHook).toContain("router.prefetch");

    const clubAdminKeys = [
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
      PERMISSIONS.WEBSITE_MANAGE,
      PERMISSIONS.NEWS_MANAGE,
      PERMISSIONS.TRAININGS_VIEW,
    ] as const;

    const model = buildAppNavigationModelForUser([...clubAdminKeys], "club");
    const hrefs = model.domains.map((d) => d.defaultDestination.href);
    expect(hrefs).toContain("/dashboard/admin");
    expect(hrefs).toContain("/dashboard/website");
  });
});

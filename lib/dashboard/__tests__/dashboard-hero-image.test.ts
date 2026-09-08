import { describe, expect, it } from "vitest";
import {
  DASHBOARD_HERO_SCHEMA_FIELD,
  DASHBOARD_HERO_ZOOM_FIELD,
  DASHBOARD_HERO_POSITION_X_FIELD,
  DASHBOARD_HERO_POSITION_Y_FIELD,
  getDashboardHeroStorageKey,
  getUserDashboardHeroImageUrl,
  persistUserDashboardHeroImageUrl,
} from "@/lib/dashboard/dashboard-hero-image";

describe("SCE-DASHBOARD-V3-03 — dashboard hero image adapter", () => {
  it("documents the proposed User schema field", () => {
    expect(DASHBOARD_HERO_SCHEMA_FIELD).toBe("dashboardHeroImageUrl");
    expect(DASHBOARD_HERO_ZOOM_FIELD).toBe("dashboardHeroImageZoom");
    expect(DASHBOARD_HERO_POSITION_X_FIELD).toBe("dashboardHeroImagePositionX");
    expect(DASHBOARD_HERO_POSITION_Y_FIELD).toBe("dashboardHeroImagePositionY");
  });

  it("returns null until migration is applied", async () => {
    await expect(getUserDashboardHeroImageUrl("user-1")).resolves.toBeNull();
  });

  it("skips DB persistence until migration is approved", async () => {
    await expect(persistUserDashboardHeroImageUrl("user-1", "https://cdn.example/hero.jpg")).resolves.toEqual({
      ok: true,
      persisted: false,
      reason: "schema_migration_pending",
    });
  });

  it("uses a user-scoped blob storage namespace", () => {
    expect(getDashboardHeroStorageKey("user-abc", "webp")).toBe(
      "dashboard-hero/user-abc.webp",
    );
  });
});

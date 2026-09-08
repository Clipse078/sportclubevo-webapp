import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  DASHBOARD_HERO_SCHEMA_FIELD,
  DASHBOARD_HERO_ZOOM_FIELD,
  DASHBOARD_HERO_POSITION_X_FIELD,
  DASHBOARD_HERO_POSITION_Y_FIELD,
  clearUserDashboardHero,
  getDashboardHeroStorageKey,
  getUserDashboardHeroImageUrl,
  getUserDashboardHeroState,
  updateUserDashboardHeroImage,
  updateUserDashboardHeroTransform,
} from "@/lib/dashboard/dashboard-hero-image";
import { DEFAULT_HERO_TRANSFORM } from "@/lib/dashboard/dashboard-hero-position";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const HERO_ROW = {
  dashboardHeroImageUrl: "https://cdn.example/hero.jpg",
  dashboardHeroImageZoom: 1.25,
  dashboardHeroImagePositionX: 0.4,
  dashboardHeroImagePositionY: 0.6,
};

describe("SCE-DASHBOARD-V3-03 — dashboard hero image adapter", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
  });

  it("documents the User schema field names", () => {
    expect(DASHBOARD_HERO_SCHEMA_FIELD).toBe("dashboardHeroImageUrl");
    expect(DASHBOARD_HERO_ZOOM_FIELD).toBe("dashboardHeroImageZoom");
    expect(DASHBOARD_HERO_POSITION_X_FIELD).toBe("dashboardHeroImagePositionX");
    expect(DASHBOARD_HERO_POSITION_Y_FIELD).toBe("dashboardHeroImagePositionY");
  });

  it("returns default transform when DB fields are null", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      dashboardHeroImageUrl: null,
      dashboardHeroImageZoom: null,
      dashboardHeroImagePositionX: null,
      dashboardHeroImagePositionY: null,
    });

    await expect(getUserDashboardHeroState("user-1")).resolves.toEqual({
      imageUrl: null,
      zoom: DEFAULT_HERO_TRANSFORM.zoom,
      positionX: DEFAULT_HERO_TRANSFORM.positionX,
      positionY: DEFAULT_HERO_TRANSFORM.positionY,
    });
  });

  it("returns stored URL and transform", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(HERO_ROW)
      .mockResolvedValueOnce(HERO_ROW);

    await expect(getUserDashboardHeroState("user-1")).resolves.toEqual({
      imageUrl: HERO_ROW.dashboardHeroImageUrl,
      zoom: 1.25,
      positionX: 0.4,
      positionY: 0.6,
    });
    await expect(getUserDashboardHeroImageUrl("user-1")).resolves.toBe(HERO_ROW.dashboardHeroImageUrl);
  });

  it("normalizes invalid persisted transform values", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      dashboardHeroImageUrl: "https://cdn.example/hero.jpg",
      dashboardHeroImageZoom: Number.NaN,
      dashboardHeroImagePositionX: 2,
      dashboardHeroImagePositionY: -1,
    });

    await expect(getUserDashboardHeroState("user-1")).resolves.toEqual({
      imageUrl: "https://cdn.example/hero.jpg",
      zoom: DEFAULT_HERO_TRANSFORM.zoom,
      positionX: 1,
      positionY: 0,
    });
  });

  it("updates only hero image URL on upload", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(HERO_ROW);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...HERO_ROW,
      dashboardHeroImageUrl: "https://cdn.example/new.jpg",
    });

    const result = await updateUserDashboardHeroImage("user-1", "https://cdn.example/new.jpg");

    expect(result).toEqual({
      ok: true,
      persisted: true,
      state: {
        imageUrl: "https://cdn.example/new.jpg",
        zoom: 1.25,
        positionX: 0.4,
        positionY: 0.6,
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { dashboardHeroImageUrl: "https://cdn.example/new.jpg" },
      select: {
        dashboardHeroImageUrl: true,
        dashboardHeroImageZoom: true,
        dashboardHeroImagePositionX: true,
        dashboardHeroImagePositionY: true,
      },
    });
  });

  it("updates only hero transform fields on transform save", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValueOnce({
      ...HERO_ROW,
      dashboardHeroImageZoom: 1.5,
      dashboardHeroImagePositionX: 0.2,
      dashboardHeroImagePositionY: 0.8,
    });

    const result = await updateUserDashboardHeroTransform("user-1", {
      zoom: 3,
      positionX: -0.5,
      positionY: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.zoom).toBe(1.5);
      expect(result.state.positionX).toBe(0.2);
      expect(result.state.positionY).toBe(0.8);
    }

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        dashboardHeroImageZoom: 2.5,
        dashboardHeroImagePositionX: 0,
        dashboardHeroImagePositionY: 1,
      },
      select: {
        dashboardHeroImageUrl: true,
        dashboardHeroImageZoom: true,
        dashboardHeroImagePositionX: true,
        dashboardHeroImagePositionY: true,
      },
    });
  });

  it("clears all hero fields", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "user-1" });
    mockPrisma.user.update.mockResolvedValueOnce({
      dashboardHeroImageUrl: null,
      dashboardHeroImageZoom: null,
      dashboardHeroImagePositionX: null,
      dashboardHeroImagePositionY: null,
    });

    const result = await clearUserDashboardHero("user-1");

    expect(result).toEqual({
      ok: true,
      persisted: true,
      state: {
        imageUrl: null,
        zoom: DEFAULT_HERO_TRANSFORM.zoom,
        positionX: DEFAULT_HERO_TRANSFORM.positionX,
        positionY: DEFAULT_HERO_TRANSFORM.positionY,
      },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        dashboardHeroImageUrl: null,
        dashboardHeroImageZoom: null,
        dashboardHeroImagePositionX: null,
        dashboardHeroImagePositionY: null,
      },
      select: {
        dashboardHeroImageUrl: true,
        dashboardHeroImageZoom: true,
        dashboardHeroImagePositionX: true,
        dashboardHeroImagePositionY: true,
      },
    });
  });

  it("uses a user-scoped blob storage namespace", () => {
    expect(getDashboardHeroStorageKey("user-abc", "webp")).toBe(
      "dashboard-hero/user-abc.webp",
    );
  });
});

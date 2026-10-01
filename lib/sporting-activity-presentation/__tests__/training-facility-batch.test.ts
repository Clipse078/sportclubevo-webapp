import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSessionAllocation: { findMany: vi.fn().mockResolvedValue([]) },
    trainingAllocation: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { loadTrainingSessionFacilityHints } from "../training-facility-batch";

describe("loadTrainingSessionFacilityHints — SCE-ACTIVITY-UX-01R3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves outdoor pitch series default (venue + resource)", async () => {
    vi.mocked(prisma.trainingAllocation.findMany).mockResolvedValue([
      {
        trainingSeriesId: "series-1",
        displayOrder: 0,
        createdAt: new Date("2026-01-01"),
        facilityResource: {
          id: "res-kr2",
          code: "KR2",
          name: "KR2",
          type: "HALF_PITCH",
          facility: { id: "fac-brueel", name: "Im Brüel" },
        },
      },
    ] as never);

    const hints = await loadTrainingSessionFacilityHints("tenant-a", [
      { id: "sess-oct", trainingSeriesId: "series-1" },
    ]);

    expect(hints.get("sess-oct")).toEqual({
      facilityName: "Im Brüel",
      pitchResourceName: "KR2",
    });
  });

  it("prefers session override allocation over series default", async () => {
    vi.mocked(prisma.trainingAllocation.findMany).mockResolvedValue([
      {
        trainingSeriesId: "series-1",
        displayOrder: 0,
        createdAt: new Date("2026-01-01"),
        facilityResource: {
          id: "res-kr2",
          code: "KR2",
          name: "KR2",
          type: "HALF_PITCH",
          facility: { id: "fac-brueel", name: "Im Brüel" },
        },
      },
    ] as never);
    vi.mocked(prisma.trainingSessionAllocation.findMany).mockResolvedValue([
      {
        trainingSessionId: "sess-nov",
        displayOrder: 0,
        createdAt: new Date("2026-10-01"),
        facilityResource: {
          id: "res-h1",
          code: "H1",
          name: "Halle 1",
          type: "HALF_PITCH",
          facility: { id: "fac-halle", name: "Gartenschul Halle" },
        },
      },
    ] as never);

    const hints = await loadTrainingSessionFacilityHints("tenant-a", [
      { id: "sess-nov", trainingSeriesId: "series-1" },
    ]);

    expect(hints.get("sess-nov")).toEqual({
      facilityName: "Gartenschul Halle",
      pitchResourceName: "Halle 1",
    });
  });

  it("falls back to OTHER series allocation when no PITCH_HALL exists", async () => {
    vi.mocked(prisma.trainingAllocation.findMany).mockResolvedValue([
      {
        trainingSeriesId: "series-indoor",
        displayOrder: 0,
        createdAt: new Date("2026-01-01"),
        facilityResource: {
          id: "res-hall",
          code: "HALL",
          name: "Halle 1",
          type: "OTHER",
          facility: { id: "fac-halle", name: "Gartenschul Halle" },
        },
      },
    ] as never);

    const hints = await loadTrainingSessionFacilityHints("tenant-a", [
      { id: "sess-indoor", trainingSeriesId: "series-indoor" },
    ]);

    expect(hints.get("sess-indoor")).toEqual({
      facilityName: "Gartenschul Halle",
      pitchResourceName: "Halle 1",
    });
  });
});

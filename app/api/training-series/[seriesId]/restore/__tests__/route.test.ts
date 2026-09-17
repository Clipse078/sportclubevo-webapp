/**
 * POST /api/training-series/[seriesId]/restore
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  restoreTrainingSeries: vi.fn(),
  findFirst: vi.fn(),
  canEditPlanningRecord: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/training/training-service", () => ({
  restoreTrainingSeries: mocks.restoreTrainingSeries,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSeries: {
      findFirst: mocks.findFirst,
    },
  },
}));
vi.mock("@/lib/planning/planning-authorization-policy", () => ({
  createPlanningAuthorizationPolicy: () => ({
    canEditPlanningRecord: mocks.canEditPlanningRecord,
  }),
}));

const SERIES_ID = "series-restore-1";
const TENANT_A = "tenant-a";

function makeRequest() {
  return new Request(`http://localhost/api/training-series/${SERIES_ID}/restore`, {
    method: "POST",
  });
}

describe("POST /api/training-series/[seriesId]/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { activeTenantId: TENANT_A, id: "user-1", effectiveUserId: "user-1" },
    });
    mocks.findFirst.mockResolvedValue({
      id: SERIES_ID,
      planningStage: "APPROVED",
      teamSeason: { teamId: "team-1" },
    });
    mocks.canEditPlanningRecord.mockResolvedValue(true);
    mocks.restoreTrainingSeries.mockResolvedValue({ id: SERIES_ID, status: "INACTIVE" });
  });

  it("restores an archived series via canonical service", async () => {
    const res = await POST(makeRequest() as never, { params: Promise.resolve({ seriesId: SERIES_ID }) });
    expect(res.status).toBe(200);
    expect(mocks.restoreTrainingSeries).toHaveBeenCalledWith(TENANT_A, SERIES_ID);
  });

  it("returns 403 when user cannot edit planning record", async () => {
    mocks.canEditPlanningRecord.mockResolvedValue(false);
    const res = await POST(makeRequest() as never, { params: Promise.resolve({ seriesId: SERIES_ID }) });
    expect(res.status).toBe(403);
    expect(mocks.restoreTrainingSeries).not.toHaveBeenCalled();
  });
});

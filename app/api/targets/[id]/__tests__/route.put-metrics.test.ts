/**
 * Regression: PUT /api/targets/[id] must persist Kennzahlen (TargetForm edit flow).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireStrategicApiContext: vi.fn(),
  requireTargetAccess: vi.fn(),
  targetUpdate: vi.fn(),
  syncTargetMetricsForTarget: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/permissions/require-strategic-api-context", () => ({
  requireStrategicApiContext: mocks.requireStrategicApiContext,
}));

vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireTargetAccess: mocks.requireTargetAccess,
}));

vi.mock("@/lib/targets/target-metric-sync", () => ({
  syncTargetMetricsForTarget: mocks.syncTargetMetricsForTarget,
}));

vi.mock("@/lib/audit/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    target: {
      update: mocks.targetUpdate,
    },
  },
}));

import { PUT } from "../route";

const TARGET_ID = "target-test-ziel-1";

function makePutRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/targets/${TARGET_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/targets/[id] metrics persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStrategicApiContext.mockResolvedValue({
      ok: true,
      context: { actor: { userId: "user-1" }, tenantId: "tenant-1" },
    });
    mocks.requireTargetAccess.mockResolvedValue({
      ok: true,
      entity: { id: TARGET_ID, title: "TEST Ziel 1", reviewStage: "DRAFT" },
    });
    mocks.targetUpdate.mockResolvedValue({ id: TARGET_ID, title: "TEST Ziel 1" });
    mocks.syncTargetMetricsForTarget.mockResolvedValue(undefined);
  });

  it("syncs Kennzahlen from the PO save payload", async () => {
    const body = {
      title: "TEST Ziel 1",
      metrics: [
        {
          label: "Test Kennzahl II",
          type: "PERCENTAGE",
          direction: "INCREASE",
          targetValue: 5,
          currentValue: 7,
          sortOrder: 0,
        },
      ],
    };

    const res = await PUT(makePutRequest(body), {
      params: Promise.resolve({ id: TARGET_ID }),
    });

    expect(res.status).toBe(200);
    expect(mocks.syncTargetMetricsForTarget).toHaveBeenCalledWith(
      expect.anything(),
      TARGET_ID,
      [
        expect.objectContaining({
          label: "Test Kennzahl II",
          targetValue: 5,
          currentValue: 7,
        }),
      ],
    );
  });

  it("returns validation errors for blank Kennzahl values", async () => {
    const res = await PUT(
      makePutRequest({
        title: "TEST Ziel 1",
        metrics: [
          {
            label: "Test Kennzahl II",
            targetValue: "",
            currentValue: 7,
          },
        ],
      }),
      { params: Promise.resolve({ id: TARGET_ID }) },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Zielwert ist erforderlich");
    expect(mocks.syncTargetMetricsForTarget).not.toHaveBeenCalled();
    expect(mocks.targetUpdate).not.toHaveBeenCalled();
  });

  it("skips metric sync when metrics are omitted", async () => {
    const res = await PUT(
      makePutRequest({ title: "TEST Ziel 1" }),
      { params: Promise.resolve({ id: TARGET_ID }) },
    );

    expect(res.status).toBe(200);
    expect(mocks.syncTargetMetricsForTarget).not.toHaveBeenCalled();
  });
});
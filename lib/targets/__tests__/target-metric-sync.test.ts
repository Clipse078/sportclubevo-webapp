import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncTargetMetricsForTarget } from "@/lib/targets/target-metric-sync";
import { TargetDirection, TargetMetricType } from "@prisma/client";

const db = {
  targetMetric: {
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

describe("syncTargetMetricsForTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates existing metrics, creates new ones, and deletes removed rows", async () => {
    db.targetMetric.findMany.mockResolvedValue([{ id: "metric-a" }, { id: "metric-b" }]);
    db.targetMetric.create.mockResolvedValue({ id: "metric-c" });

    await syncTargetMetricsForTarget(db, "target-1", [
      {
        id: "metric-a",
        label: "Test Kennzahl II",
        type: TargetMetricType.PERCENTAGE,
        direction: TargetDirection.INCREASE,
        targetValue: 5,
        currentValue: 7,
        unit: null,
        notes: null,
        sortOrder: 0,
      },
      {
        label: "Neu",
        type: TargetMetricType.NUMERIC,
        direction: TargetDirection.DECREASE,
        targetValue: 0,
        currentValue: 0,
        unit: null,
        notes: null,
        sortOrder: 1,
      },
    ]);

    expect(db.targetMetric.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "metric-a" },
        data: expect.objectContaining({ targetValue: 5, currentValue: 7 }),
      }),
    );
    expect(db.targetMetric.create).toHaveBeenCalledTimes(1);
    expect(db.targetMetric.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["metric-b"] }, targetId: "target-1" },
    });
  });
});
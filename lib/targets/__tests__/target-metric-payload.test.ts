import { describe, expect, it } from "vitest";
import {
  normalizeTargetMetricsFromBody,
  parseTargetMetricNumericInput,
} from "@/lib/targets/target-metric-payload";

describe("parseTargetMetricNumericInput", () => {
  it("treats blank as null and zero as a valid number", () => {
    expect(parseTargetMetricNumericInput("")).toBeNull();
    expect(parseTargetMetricNumericInput("   ")).toBeNull();
    expect(parseTargetMetricNumericInput("0")).toBe(0);
    expect(parseTargetMetricNumericInput(0)).toBe(0);
    expect(parseTargetMetricNumericInput("5")).toBe(5);
    expect(parseTargetMetricNumericInput(7)).toBe(7);
  });
});

describe("normalizeTargetMetricsFromBody", () => {
  it("accepts PO-reported Kennzahl with current value above target", () => {
    const result = normalizeTargetMetricsFromBody([
      {
        label: "Test Kennzahl II",
        type: "PERCENTAGE",
        direction: "INCREASE",
        targetValue: 5,
        currentValue: 7,
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0]).toMatchObject({
      label: "Test Kennzahl II",
      targetValue: 5,
      currentValue: 7,
    });
  });

  it("rejects labeled metrics with blank numeric fields", () => {
    const result = normalizeTargetMetricsFromBody([
      {
        label: "Test Kennzahl II",
        type: "PERCENTAGE",
        direction: "INCREASE",
        targetValue: "",
        currentValue: 7,
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Zielwert ist erforderlich");
  });

  it("omits rows without a label", () => {
    const result = normalizeTargetMetricsFromBody([
      { label: "", targetValue: 1, currentValue: 1 },
      { label: "  ", targetValue: 2, currentValue: 2 },
    ]);
    expect(result).toEqual({ ok: true, metrics: [] });
  });
});
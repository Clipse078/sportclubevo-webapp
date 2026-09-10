import { describe, expect, it } from "vitest";
import { formatBillingDate } from "../format-billing-date";

describe("formatBillingDate", () => {
  it("formats ISO dates in de-DE", () => {
    expect(formatBillingDate("2026-09-10T12:00:00.000Z")).toMatch(/10\.09\.2026/);
  });

  it("returns em dash for missing values", () => {
    expect(formatBillingDate(null)).toBe("—");
    expect(formatBillingDate(undefined)).toBe("—");
  });
});

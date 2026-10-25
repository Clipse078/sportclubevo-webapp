import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertExpectedEventTimingNotUnscheduledPersistence,
  validateExpectedFinancialEventPersistence,
} from "@/lib/finance/forecast/expected-financial-event-persistence-validation";

const MIGRATION_NAME = "20261024200000_sce_finance_04e_02_expected_event_persistence";

describe("FIN-04E-02 schema / migration", () => {
  it("adds FinanceExpectedFinancialEvent with additive migration", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model FinanceExpectedFinancialEvent");
    expect(schema).toContain("enum FinanceExpectedFinancialEventTimingPrecision");
    expect(schema).toContain("enum FinanceExpectedFinancialEventSourceKind");
    expect(schema).toContain("expectedMonthStart");
    expect(schema).not.toContain("model FinanceUnscheduledRemainder");

    const block = schema.slice(
      schema.indexOf("model FinanceExpectedFinancialEvent"),
      schema.indexOf("enum FinanceProjectionDataSufficiency"),
    );
    expect(block).not.toMatch(/\bdirection\b/i);
    expect(block).not.toContain("UNSCHEDULED");
    expect(block).toContain("@db.Date");
    expect(block).toContain("onDelete: Restrict");
    expect(block).toContain("financeYearId");
    expect(block).toContain("financialAccountId");
    expect(block).toContain("createdByUserId");
    expect(block).toContain("updatedByUserId");

    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain('CREATE TABLE "FinanceExpectedFinancialEvent"');
    expect(sql).toContain("FinanceExpectedFinancialEvent_source_identity_unique_idx");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecast"/i);
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecastLine"/i);
  });
});

describe("FIN-04E-02 persistence validation", () => {
  const base = {
    tenantId: "tenant-a",
    financeYearId: "fy-2027",
    financialAccountId: "acc-income",
    expectedAmountMinor: 50_000,
  };

  it("accepts EXACT_DATE with exclusive month/range fields absent", () => {
    const v = validateExpectedFinancialEventPersistence({
      ...base,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2028-01-15",
    });
    expect(v.expectedDateIso).toBe("2028-01-15");
    expect(v.expectedMonthStartIso).toBeNull();
  });

  it("allows expected date outside finance year (cross-FY timing)", () => {
    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2028-01-15",
      }),
    ).not.toThrow();
  });

  it("accepts MONTH with first-of-month only", () => {
    const v = validateExpectedFinancialEventPersistence({
      ...base,
      timingPrecision: "MONTH",
      expectedMonthStartIso: "2026-06-01",
    });
    expect(v.expectedMonthStartIso).toBe("2026-06-01");
  });

  it("rejects MONTH when day is not first of month", () => {
    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        timingPrecision: "MONTH",
        expectedMonthStartIso: "2026-06-15",
      }),
    ).toThrow(/first_of_month/);
  });

  it("accepts DATE_RANGE with ordered inclusive bounds", () => {
    const v = validateExpectedFinancialEventPersistence({
      ...base,
      timingPrecision: "DATE_RANGE",
      rangeStartDateIso: "2026-07-01",
      rangeEndDateIso: "2026-07-31",
    });
    expect(v.rangeStartDateIso).toBe("2026-07-01");
  });

  it("rejects invalid timing combinations", () => {
    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        timingPrecision: "EXACT_DATE",
      }),
    ).toThrow();

    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        timingPrecision: "DATE_RANGE",
        rangeStartDateIso: "2026-08-01",
        rangeEndDateIso: "2026-07-01",
      }),
    ).toThrow(/range_start_after_end/);

    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
        expectedMonthStartIso: "2026-02-01",
      }),
    ).toThrow(/exclusive_fields/);
  });

  it("rejects negative amounts and requires safe integers", () => {
    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        expectedAmountMinor: -1,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).toThrow(/INVALID_AMOUNT/);

    expect(() =>
      validateExpectedFinancialEventPersistence({
        ...base,
        expectedAmountMinor: 1.5,
        timingPrecision: "EXACT_DATE",
        expectedDateIso: "2026-01-01",
      }),
    ).toThrow();
  });

  it("allows zero amount when explicitly provided", () => {
    const v = validateExpectedFinancialEventPersistence({
      ...base,
      expectedAmountMinor: 0,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-12-31",
    });
    expect(v.expectedAmountMinor).toBe(0);
  });

  it("supports MANUAL source and paired source reference shape", () => {
    const v = validateExpectedFinancialEventPersistence({
      ...base,
      timingPrecision: "EXACT_DATE",
      expectedDateIso: "2026-05-01",
      sourceKind: "MANUAL",
      sourceRefType: "future-seam",
      sourceRefId: "ref-1",
    });
    expect(v.sourceRefType).toBe("future-seam");
    expect(v.sourceRefId).toBe("ref-1");
  });

  it("forbids persisting UNSCHEDULED timing precision", () => {
    expect(() => assertExpectedEventTimingNotUnscheduledPersistence("UNSCHEDULED")).toThrow();
  });
});

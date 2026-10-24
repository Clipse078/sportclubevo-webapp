import { beforeEach, describe, expect, it } from "vitest";
import { parseFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import { buildManualFormalReforecastDates } from "@/lib/finance/services/finance-forecast-formal-reforecast-service";
import {
  formalizeCurrentForecast,
  previewFormalCurrentForecast,
} from "@/lib/finance/services/finance-forecast-formal-reforecast-service";
import { upsertForecastLine } from "@/lib/finance/services/finance-forecast-service";
import { mapFormalReforecastDomainError } from "@/lib/finance/forecast/formal-reforecast-outcome-mapping";
import { normalizeFormalReforecastRevisionLabel } from "@/lib/finance/forecast/formal-reforecast-label";
import { recommendFormalReforecastAsOfDate } from "@/lib/finance/forecast/formal-reforecast-date-recommendation";
import { ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  baseRevisionStore,
  makeRevisionDb,
  revisionMockCtx,
  revisionMockNonCalendarYearId,
  revisionMockTenantB,
  revisionMockYearId,
  type RevisionStore,
} from "@/lib/finance/__tests__/finance-04c-revision-mock-db";

describe("FIN-04C-03 architecture locks", () => {
  it("documents formal reforecast service facts", () => {
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.formalizationService).toBe(
      "formalizeCurrentForecast",
    );
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.manualRevisionSourceSystemOwned).toBe(
      "MANUAL_REFORECAST",
    );
    expect(ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST.formalizationPreservesFinancialAmounts).toBe(
      true,
    );
  });
});

describe("FIN-04C-03 preview", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
  });

  it("performs no writes and resolves current via pointer with totals", async () => {
    const db = makeRevisionDb(store);
    const versionCountBefore = store.financeForecastVersion.length;
    const preview = await previewFormalCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      asOfDate: "2026-09-30",
      revisionLabel: "  Q3 Review  ",
    });

    expect(store.financeForecastVersion).toHaveLength(versionCountBefore);
    expect(preview.currentForecastVersionId).toBe("fv-current");
    expect(preview.nextVersionNumber).toBe(2);
    expect(preview.lineCount).toBe(2);
    expect(preview.incomeMinor).toBe(100_00);
    expect(preview.expenseMinor).toBe(0);
    expect(preview.resultMinor).toBe(100_00);
    expect(preview.revisionLabel).toBe("Q3 Review");
    expect(preview.amountsUnchangedByFormalization).toBe(true);
    expect(preview.actualsThroughDate).toBe("2026-09-30");
  });
});

describe("FIN-04C-03 formalization", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
  });

  it("supersedes prior CURRENT, promotes snapshot, and preserves amounts", async () => {
    const db = makeRevisionDb(store);
    const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-09-30",
      actualsThroughDate: "2026-08-31",
      revisionLabel: "Q3 Review",
    });

    expect(result.previousVersionId).toBe("fv-current");
    expect(result.currentVersionNumber).toBe(2);
    expect(result.revisionSource).toBe("MANUAL_REFORECAST");
    expect(result.revisionLabel).toBe("Q3 Review");
    expect(result.incomeMinor).toBe(100_00);
    expect(result.expenseMinor).toBe(0);
    expect(result.resultMinor).toBe(100_00);

    const superseded = store.financeForecastVersion.find((v) => v.id === "fv-current")!;
    const current = store.financeForecastVersion.find((v) => v.id === result.currentVersionId)!;
    expect(superseded.status).toBe("SUPERSEDED");
    expect(current.status).toBe("CURRENT");
    expect(current.revisionLabel).toBe("Q3 Review");
    expect(current.sourceProjectionVersionId ?? null).toBeNull();
    expect(store.financeForecast[0]!.currentVersionId).toBe(result.currentVersionId);

    const lineKey = (l: { financialAccountId: string; amountMinor: number }) =>
      `${l.financialAccountId}:${l.amountMinor}`;
    const historicalLines = store.financeForecastLine
      .filter((l) => l.forecastVersionId === "fv-current")
      .map(lineKey)
      .sort();
    const currentLines = store.financeForecastLine
      .filter((l) => l.forecastVersionId === result.currentVersionId)
      .map(lineKey)
      .sort();
    expect(currentLines).toEqual(historicalLines);
  });

  it("supports repeated formalization with lineage", async () => {
    const db = makeRevisionDb(store);
    const first = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
    });
    const second = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: first.currentVersionId,
      asOfDate: "2026-07-31",
    });
    expect(second.currentVersionNumber).toBe(3);
    expect(store.financeForecastVersion.filter((v) => v.status === "CURRENT")).toHaveLength(1);
    const promoted = store.financeForecastVersion.find((v) => v.id === second.currentVersionId)!;
    expect(promoted.previousVersionId).toBe(first.currentVersionId);
  });

  it("blocks stale expected current (duplicate submit)", async () => {
    const db = makeRevisionDb(store);
    await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
    });
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx(), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-05-31",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_STALE_CURRENT" });
    expect(mapFormalReforecastDomainError(
      new FinanceDomainError("FINANCE_FORECAST_REVISION_STALE_CURRENT", "stale", 409),
    )).toBe("STALE_CURRENT");
  });
});

describe("FIN-04C-03 manual edit vs next formalization", () => {
  it("edits CURRENT in place then freezes edited values on next formalization", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    const first = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
    });
    await upsertForecastLine(db, revisionMockCtx(), {
      forecastVersionId: first.currentVersionId,
      financialAccountId: "acc-income",
      amountMinor: 150_00,
    });
    expect(store.financeForecastVersion.filter((v) => v.status === "CURRENT")).toHaveLength(1);

    const second = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: first.currentVersionId,
      asOfDate: "2026-07-31",
    });
    const frozen = store.financeForecastLine.find(
      (l) => l.forecastVersionId === first.currentVersionId && l.financialAccountId === "acc-income",
    );
    expect(frozen?.amountMinor).toBe(150_00);
    const nextCurrent = store.financeForecastLine.find(
      (l) =>
        l.forecastVersionId === second.currentVersionId && l.financialAccountId === "acc-income",
    );
    expect(nextCurrent?.amountMinor).toBe(150_00);
  });
});

describe("FIN-04C-03 zero/null and archived account line", () => {
  it("preserves zero and does not create missing lines", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-06-30",
    });
    const lines = store.financeForecastLine.filter(
      (l) => l.forecastVersionId === result.currentVersionId,
    );
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => l.financialAccountId === "acc-expense")?.amountMinor).toBe(0);
    expect(lines.some((l) => l.financialAccountId === "acc-missing")).toBe(false);
  });
});

describe("FIN-04C-03 dates and labels", () => {
  it("defaults actualsThroughDate to asOfDate when omitted", () => {
    expect(buildManualFormalReforecastDates({ asOfDate: "2026-09-30" })).toEqual({
      asOfDate: "2026-09-30",
      actualsThroughDate: "2026-09-30",
    });
  });

  it("validates non-calendar finance year boundaries", async () => {
    const store = baseRevisionStore();
    store.financeForecast[0]!.financeYearId = revisionMockNonCalendarYearId;
    const db = makeRevisionDb(store);
    const first = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockNonCalendarYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-03-15",
    });
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx(), {
        financeYearId: revisionMockNonCalendarYearId,
        expectedCurrentForecastVersionId: first.currentVersionId,
        asOfDate: "2026-07-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_INVALID_DATE" });
  });

  it("rejects actualsThroughDate after asOfDate", async () => {
    const db = makeRevisionDb(baseRevisionStore());
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx(), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-03-01",
        actualsThroughDate: "2026-04-01",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORECAST_REVISION_INVALID_DATE" });
  });

  it("keeps date-only ISO parsing timezone-safe", () => {
    expect(parseFinanceCalendarDateIso("2026-09-30").toISOString()).toBe(
      "2026-09-30T00:00:00.000Z",
    );
  });

  it("normalizes optional revision labels", () => {
    expect(normalizeFormalReforecastRevisionLabel("   ")).toBeNull();
    expect(normalizeFormalReforecastRevisionLabel("Frühjahrsreview")).toBe("Frühjahrsreview");
  });

  it("recommends today when inside finance year", () => {
    const recommended = recommendFormalReforecastAsOfDate({
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      now: new Date("2026-09-30T15:30:00.000Z"),
    });
    expect(recommended).toBe("2026-09-30");
  });
});

describe("FIN-04C-03 permissions and isolation", () => {
  it("requires manage permission to formalize", async () => {
    const db = makeRevisionDb(baseRevisionStore());
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx({ permissionKeys: new Set(["finance.forecast.view"]) }), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-04-30",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("rejects cross-tenant finance year access", async () => {
    const db = makeRevisionDb(baseRevisionStore());
    await expect(
      formalizeCurrentForecast(db, revisionMockCtx({ tenantId: revisionMockTenantB }), {
        financeYearId: revisionMockYearId,
        expectedCurrentForecastVersionId: "fv-current",
        asOfDate: "2026-04-30",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });
});

describe("FIN-04C-03 automatic forecast independence", () => {
  it("does not create projection adoption rows", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-04-30",
    });
    expect(store.financeProjectionAdoption).toHaveLength(0);
  });
});

describe("FIN-04C-03 metadata ownership", () => {
  it("places MANUAL_REFORECAST metadata on promoted CURRENT only", async () => {
    const store = baseRevisionStore();
    store.financeForecastVersion[0]!.revisionSource = null;
    const db = makeRevisionDb(store);
    const result = await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-09-30",
      revisionLabel: "Q3 Review",
    });
    const legacy = store.financeForecastVersion.find((v) => v.id === "fv-current")!;
    const current = store.financeForecastVersion.find((v) => v.id === result.currentVersionId)!;
    expect(legacy.revisionLabel ?? null).toBeNull();
    expect(current.revisionLabel).toBe("Q3 Review");
    expect(current.asOfDate?.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});

describe("FIN-04C-03 ordinary edit concurrency boundary", () => {
  it("documents that concurrent in-place edits share the same CURRENT version id", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    await upsertForecastLine(db, revisionMockCtx(), {
      forecastVersionId: "fv-current",
      financialAccountId: "acc-income",
      amountMinor: 120_00,
    });
    await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-05-31",
    });
    const promoted = store.financeForecastLine.find(
      (l) => l.forecastVersionId !== "fv-current" && l.financialAccountId === "acc-income",
    );
    expect(promoted?.amountMinor).toBe(120_00);
  });
});

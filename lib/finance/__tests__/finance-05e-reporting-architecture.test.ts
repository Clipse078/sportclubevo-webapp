import { describe, expect, it } from "vitest";
import {
  FINANCE_05E_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_MANAGEMENT_REPORTING_DETAIL_QUERY_SHAPE } from "@/lib/finance/services/finance-management-reporting-query-service";

describe("FIN-05E reporting architecture contract", () => {
  it("locks investigation workspace boundaries", () => {
    expect(SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS.drilldownDoesNotMutateSourceTruth).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS.noGenericBiBuilder).toBe(true);
    expect(SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS.noLiquidityInFin05).toBe(true);
    expect(SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS.noNPlusOneReportingDrilldown).toBe(true);
    expect(SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS.lazyDetailEvidenceLoad).toBe(true);
  });

  it("names canonical detail read model and route", () => {
    expect(FINANCE_05E_IMPLEMENTATION.managementReportingDetailReadModel).toBe(
      "FinanceManagementReportingDetailReadModel",
    );
    expect(FINANCE_05E_IMPLEMENTATION.detailQueryLoader).toBe(
      "loadFinanceManagementReportingDetailReadModel",
    );
    expect(FINANCE_05E_IMPLEMENTATION.workspaceRoute).toBe("/dashboard/finance/reports");
    expect(FINANCE_05E_IMPLEMENTATION.fin05fStatus).toBe("NOT_STARTED");
  });

  it("documents bounded detail query shape", () => {
    expect(FINANCE_MANAGEMENT_REPORTING_DETAIL_QUERY_SHAPE.lazyActualEvidenceQuery).toBe(1);
    expect(FINANCE_MANAGEMENT_REPORTING_DETAIL_QUERY_SHAPE.perEvidenceRowQueryForbidden).toBe(
      true,
    );
  });
});

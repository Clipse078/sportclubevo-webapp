/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceManagementPnlPublicationDialog } from "@/components/admin/finance/reporting/FinanceManagementPnlPublicationDialog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION } from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";
import { parseFinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/validate-finance-publication-snapshot-v1";
import type { PublicationMockStore } from "@/lib/finance/__tests__/finance-06b-publication-mock-db";

declare global {
  var __fin06bR3Store: PublicationMockStore | undefined;
}

vi.mock("@/lib/db/prisma", () => {
  const { createPublicationMockStore, makePublicationMockPrisma } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- vitest mock factory runs before ESM imports
    require("./finance-06b-publication-mock-db.ts") as typeof import("./finance-06b-publication-mock-db");
  const store = createPublicationMockStore();
  globalThis.__fin06bR3Store = store;
  return { prisma: makePublicationMockPrisma(store) };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/finance/server/finance-page-context", () => ({
  loadFinanceWorkspaceContext: vi.fn(async () => ({
    ctx: {
      tenantId: "tenant-a",
      userId: "user-club-admin",
      permissionKeys: new Set([
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.FINANCE_PUBLICATION_VIEW,
        PERMISSIONS.FINANCE_REPORTING_PUBLISH,
      ]),
    },
    showForecastNav: true,
  })),
}));

vi.mock("@/lib/finance/services/finance-management-reporting-query-service", () => ({
  loadFinanceManagementPnlReadModel: vi.fn(async () => {
    const { buildFinanceManagementPnlReadModel } =
      await import("@/lib/finance/reporting/build-finance-management-pnl-read-model");
    return buildFinanceManagementPnlReadModel({
      tenantId: "tenant-a",
      financeYearId: "fy-2026",
      financeYearName: "FY 2026",
      baseCurrency: "CHF",
      structureAvailability: "AVAILABLE",
      actualCutoffDate: null,
      groups: [
        {
          id: "g1",
          tenantId: "tenant-a",
          name: "Operations",
          parentId: null,
          sortOrder: 0,
          lifecycle: "ACTIVE",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      accounts: [
        {
          id: "acc-i",
          tenantId: "tenant-a",
          reportingGroupId: "g1",
          name: "Income",
          sortOrder: 0,
          lifecycle: "ACTIVE",
          archivedAt: null,
          canonicalSemantic: "INCOME",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "acc-e",
          tenantId: "tenant-a",
          reportingGroupId: "g1",
          name: "Expense",
          sortOrder: 1,
          lifecycle: "ACTIVE",
          archivedAt: null,
          canonicalSemantic: "EXPENSE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      approvedMeasure: {
        measure: "APPROVED_BUDGET",
        budgetVersionId: "bv1",
        approvedAt: new Date(),
        baseCurrency: "CHF",
        valuesByAccountId: new Map([
          ["acc-i", 150_000_00],
          ["acc-e", 0],
        ]),
      },
      actualMeasure: {
        measure: "ACTUAL",
        grain: "ANNUAL_FULL_YEAR",
        cutoffDate: null,
        valuesByAccountId: new Map([
          ["acc-i", 7_776_00],
          ["acc-e", 0],
        ]),
      },
      forecastMeasure: {
        measure: "CURRENT_FORECAST",
        forecastVersionId: "fv1",
        forecastId: "f1",
        valuesByAccountId: new Map([
          ["acc-i", 161_533_00],
          ["acc-e", 0],
        ]),
      },
      sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
    });
  }),
  loadFinanceManagementReportingDetailReadModel: vi.fn(),
}));

import { publishFinanceManagementPnlAction } from "@/app/(admin)/dashboard/finance/reports/publication-actions";

const financeYearId = "fy-2026";

const labels = {
  publishAction: "Veröffentlichen",
  dialogTitle: "Bericht veröffentlichen",
  dialogDescription: "Jahr {year}",
  dialogImmutability: "Immutable",
  dialogContentLabel: "Inhalt",
  dialogContentValue: "Erfolgsrechnung",
  dialogPeriodLabel: "Zeitraum",
  confirmPublish: "Veröffentlichen",
  cancel: "Abbrechen",
  publishing: "Veröffentlichen…",
  successTitle: "Veröffentlichung erstellt",
  successBody: "Version {version} ist verfügbar.",
  viewLatest: "Veröffentlichung ansehen",
  notPublishable: "Nicht bereit",
  forbidden: "Verboten",
  publishFailed: "Fehlgeschlagen",
  versionLabel: "Version {version}",
  publishedAtLabel: "Veröffentlicht",
  inspectionTitle: "Veröffentlichte Version",
  inspectionEmpty: "Leer",
  close: "Schließen",
};

function getStore(): PublicationMockStore {
  const store = globalThis.__fin06bR3Store;
  if (!store) throw new Error("publication mock store missing");
  return store;
}

describe("FIN-06B-R3 publication execution", () => {
  beforeEach(() => {
    const store = getStore();
    store.financePublication.length = 0;
    store.financePublicationVersion.length = 0;
    store.financeYear.length = 0;
    store.financeYear.push({ id: financeYearId, tenantId: "tenant-a", name: "FY 2026" });
    vi.clearAllMocks();
  });

  it("executes publish action end-to-end with persisted v1 snapshot", async () => {
    const actionResult = await publishFinanceManagementPnlAction({ financeYearId });
    expect(actionResult.ok).toBe(true);
    if (!actionResult.ok) return;

    expect(actionResult.versionNumber).toBe(1);
    const store = getStore();
    expect(store.financePublication).toHaveLength(1);
    expect(store.financePublicationVersion).toHaveLength(1);

    const versionRow = store.financePublicationVersion[0]!;
    expect(versionRow.versionNumber).toBe(1);
    const snapshot = parseFinancePublicationSnapshotPayloadV1(versionRow.snapshotPayloadJson);
    expect(snapshot.schemaVersion).toBe(FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION);
    expect(snapshot.publicationVersion).toBe(1);
  });

  it("surfaces success confirmation and version inspection in the dialog", async () => {
    const user = userEvent.setup();
    render(
      <FinanceManagementPnlPublicationDialog
        financeYearId={financeYearId}
        financeYearName="FY 2026"
        canPublish
        reportPublishable
        labels={labels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Veröffentlichen" }));
    expect(screen.getByRole("dialog", { name: "Bericht veröffentlichen" })).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "Veröffentlichen" })[1]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Veröffentlichung erstellt" })).toBeTruthy();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Version 1");

    await user.click(screen.getByRole("button", { name: "Veröffentlichung ansehen" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Veröffentlichte Version" })).toBeTruthy();
    });
    expect(screen.getByText(/FY 2026/)).toBeTruthy();
  });
});

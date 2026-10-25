/**
 * SCE-FIN-06B-R5 — guarded STAGE immutability UAT helpers (FC Allschwil FY 2026).
 */

import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { ManagementPnlTreeNode } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { SerializedManagementPnlTreeNode } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import { resolveCurrentForecastMeasure } from "@/lib/finance/reporting/current-forecast-measure-provider";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import {
  assertStageIdentityForMutation,
  evaluateStageIdentity,
  FCA_TENANT_KEY,
  type StageIdentityReport,
} from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";

export const OPERATION_ID = "sce-finance-06b-r5-immutability-uat";
export const R5_APPLY_CONFIRMATION = "SCE-FIN-06B-R5-IMMUTABILITY-APPLY";
export const MITGLIEDSBEITRAEGE_ACCOUNT_NAME = "Mitgliedsbeiträge";

/** Version 1 PO baseline (minor units). */
export const R5_V1_BASELINE = {
  mitgliedsbeitraegeForecastMinor: 212_694_00,
  totalForecastIncomeMinor: 262_694_00,
  totalForecastExpenseMinor: 101_161_00,
  forecastResultMinor: 161_533_00,
  budgetResultMinor: 150_000_00,
  actualResultMinor: 7_776_00,
  forecastVsBudgetDeltaMinor: 11_533_00,
} as const;

/** Live state expected after controlled +1'000 CHF forecast mutation. */
export const R5_LIVE_AFTER_MUTATION = {
  mitgliedsbeitraegeForecastMinor: 213_694_00,
  totalForecastIncomeMinor: 263_694_00,
  totalForecastExpenseMinor: 101_161_00,
  forecastResultMinor: 162_533_00,
  budgetResultMinor: 150_000_00,
  actualResultMinor: 7_776_00,
  forecastVsBudgetDeltaMinor: 12_533_00,
} as const;

export const R5_FORECAST_DELTA_MINOR = 100_000;

export type R5PnlCheckpointMetrics = {
  mitgliedsbeitraegeForecastMinor: number | null;
  totalForecastIncomeMinor: number | null;
  totalForecastExpenseMinor: number | null;
  forecastResultMinor: number | null;
  budgetResultMinor: number | null;
  actualResultMinor: number | null;
  forecastVsBudgetDeltaMinor: number | null;
};

export type R5PublicationVersion1Summary = {
  exists: boolean;
  publicationId: string | null;
  versionId: string | null;
  versionNumber: number | null;
  financeYearId: string | null;
  financeYearName: string | null;
  tenantName: string | null;
  snapshotSchema: string | null;
  publishedAt: string | null;
  lifecycleStatus: string | null;
  version2Exists: boolean;
  versionNumbers: number[];
};

function walkLiveNodes(
  nodes: readonly ManagementPnlTreeNode[],
  accountName: string,
): number | null {
  for (const node of nodes) {
    if (node.kind === "account" && node.name === accountName) {
      return node.currentForecast.amountMinor;
    }
    if (node.kind === "reporting_group") {
      const nested = walkLiveNodes(node.children, accountName);
      if (nested !== null) return nested;
    }
    if (node.kind === "unassigned_residual") {
      const nested = walkLiveNodes(node.accounts, accountName);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function walkSerializedNodes(
  nodes: readonly SerializedManagementPnlTreeNode[],
  accountName: string,
): number | null {
  for (const node of nodes) {
    if (node.kind === "account" && node.name === accountName) {
      return node.currentForecast.amountMinor;
    }
    if (node.kind === "reporting_group") {
      const nested = walkSerializedNodes(node.children, accountName);
      if (nested !== null) return nested;
    }
    if (node.kind === "unassigned_residual") {
      const nested = walkSerializedNodes(node.accounts, accountName);
      if (nested !== null) return nested;
    }
  }
  return null;
}

export function metricsFromLivePnl(model: FinanceManagementPnlReadModel): R5PnlCheckpointMetrics {
  return {
    mitgliedsbeitraegeForecastMinor:
      walkLiveNodes(model.incomeSection.nodes, MITGLIEDSBEITRAEGE_ACCOUNT_NAME) ??
      walkLiveNodes(model.expenseSection.nodes, MITGLIEDSBEITRAEGE_ACCOUNT_NAME),
    totalForecastIncomeMinor: model.incomeSection.sectionTotal.currentForecast.amountMinor,
    totalForecastExpenseMinor: model.expenseSection.sectionTotal.currentForecast.amountMinor,
    forecastResultMinor: model.managementResult.currentForecast.amountMinor,
    budgetResultMinor: model.managementResult.approvedBudget.amountMinor,
    actualResultMinor: model.managementResult.actual.amountMinor,
    forecastVsBudgetDeltaMinor: model.managementResult.forecastVsBudget.rawDeltaMinor,
  };
}

export function metricsFromStoredSnapshot(
  snapshot: FinancePublicationSnapshotPayloadV1,
): R5PnlCheckpointMetrics {
  const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
    snapshot,
    lifecycleStatus: "PUBLISHED",
    contentLabel: "Erfolgsrechnung",
  });
  const pnl = presentation.pnl;
  return {
    mitgliedsbeitraegeForecastMinor:
      walkSerializedNodes(pnl.incomeSection.nodes, MITGLIEDSBEITRAEGE_ACCOUNT_NAME) ??
      walkSerializedNodes(pnl.expenseSection.nodes, MITGLIEDSBEITRAEGE_ACCOUNT_NAME),
    totalForecastIncomeMinor: pnl.incomeSection.sectionTotal.currentForecast.amountMinor,
    totalForecastExpenseMinor: pnl.expenseSection.sectionTotal.currentForecast.amountMinor,
    forecastResultMinor: pnl.managementResult.currentForecast.amountMinor,
    budgetResultMinor: pnl.managementResult.approvedBudget.amountMinor,
    actualResultMinor: pnl.managementResult.actual.amountMinor,
    forecastVsBudgetDeltaMinor: pnl.interpretation.forecastVsBudgetManagementResult.rawDeltaMinor,
  };
}

export function snapshotPayloadDigest(snapshot: FinancePublicationSnapshotPayloadV1): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function deriveLiveCheckpointAfterMitgliedDelta(
  before: R5PnlCheckpointMetrics,
  deltaMinor: number = R5_FORECAST_DELTA_MINOR,
): R5PnlCheckpointMetrics {
  return {
    mitgliedsbeitraegeForecastMinor:
      before.mitgliedsbeitraegeForecastMinor === null
        ? null
        : before.mitgliedsbeitraegeForecastMinor + deltaMinor,
    totalForecastIncomeMinor:
      before.totalForecastIncomeMinor === null
        ? null
        : before.totalForecastIncomeMinor + deltaMinor,
    totalForecastExpenseMinor: before.totalForecastExpenseMinor,
    forecastResultMinor:
      before.forecastResultMinor === null ? null : before.forecastResultMinor + deltaMinor,
    budgetResultMinor: before.budgetResultMinor,
    actualResultMinor: before.actualResultMinor,
    forecastVsBudgetDeltaMinor:
      before.forecastVsBudgetDeltaMinor === null
        ? null
        : before.forecastVsBudgetDeltaMinor + deltaMinor,
  };
}

export function metricsEqual(
  a: R5PnlCheckpointMetrics,
  b: Readonly<R5PnlCheckpointMetrics>,
): boolean {
  return (
    a.mitgliedsbeitraegeForecastMinor === b.mitgliedsbeitraegeForecastMinor &&
    a.totalForecastIncomeMinor === b.totalForecastIncomeMinor &&
    a.totalForecastExpenseMinor === b.totalForecastExpenseMinor &&
    a.forecastResultMinor === b.forecastResultMinor &&
    a.budgetResultMinor === b.budgetResultMinor &&
    a.actualResultMinor === b.actualResultMinor &&
    a.forecastVsBudgetDeltaMinor === b.forecastVsBudgetDeltaMinor
  );
}

export function financeAuthContextForR5(input: {
  tenantId: string;
  userId: string;
}): {
  tenantId: string;
  userId: string;
  permissionKeys: Set<string>;
} {
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_PUBLICATION_VIEW,
      PERMISSIONS.FINANCE_REPORTING_PUBLISH,
      PERMISSIONS.FINANCE_FORECAST_VIEW,
      PERMISSIONS.FINANCE_FORECAST_MANAGE,
      PERMISSIONS.FINANCE_BUDGET_VIEW,
    ]),
  };
}

export function assertR5ApplyAuthorization(
  env: NodeJS.ProcessEnv,
  input: { confirm: string | null | undefined },
): StageIdentityReport {
  const report = assertStageIdentityForMutation(env);
  const guard = evaluateOperationalMutationGuard(
    {
      operationId: OPERATION_ID,
      databaseUrl: env.DATABASE_URL,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    },
    env,
  );
  if (!guard.allowed) {
    throw new Error(`Operational mutation guard failed: ${guard.reason}`);
  }
  if (input.confirm?.trim() !== R5_APPLY_CONFIRMATION) {
    throw new Error(
      `Apply requires --confirm ${R5_APPLY_CONFIRMATION} (got ${input.confirm ?? "none"}).`,
    );
  }
  return report;
}

export async function resolveFcaTenant(
  db: Pick<PrismaClient, "tenant">,
): Promise<{ id: string; name: string; key: string }> {
  const tenant = await db.tenant.findFirst({
    where: { key: FCA_TENANT_KEY },
    select: { id: true, name: true, key: true },
  });
  if (!tenant) {
    throw new Error(`Tenant ${FCA_TENANT_KEY} not found.`);
  }
  return tenant;
}

export async function resolveFy2026(
  db: Pick<PrismaClient, "financeYear">,
  tenantId: string,
): Promise<{ id: string; name: string }> {
  const years = await db.financeYear.findMany({
    where: { tenantId },
    orderBy: { startDate: "asc" },
  });
  const target =
    years.find((y) => y.name.trim() === "FY 2026") ??
    years.find((y) => y.name.includes("2026"));
  if (!target) {
    throw new Error("Target finance year FY 2026 not found.");
  }
  return { id: target.id, name: target.name };
}

export async function loadVersion1PublicationSummary(
  db: Pick<
    PrismaClient,
    "financePublication" | "financePublicationVersion" | "tenant" | "financeYear"
  >,
  tenantId: string,
  financeYearId: string,
): Promise<R5PublicationVersion1Summary> {
  const publications = await db.financePublication.findMany({
    where: { tenantId, financeYearId },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const year = await db.financeYear.findUnique({
    where: { id: financeYearId },
    select: { name: true },
  });

  const allVersions = publications.flatMap((p) =>
    p.versions.map((v) => ({ ...v, publicationId: p.id })),
  );
  const version1 = allVersions.find((v) => v.versionNumber === 1);
  const versionNumbers = [...new Set(allVersions.map((v) => v.versionNumber))].sort(
    (a, b) => a - b,
  );

  if (!version1) {
    return {
      exists: false,
      publicationId: null,
      versionId: null,
      versionNumber: null,
      financeYearId,
      financeYearName: year?.name ?? null,
      tenantName: tenant?.name ?? null,
      snapshotSchema: null,
      publishedAt: null,
      lifecycleStatus: null,
      version2Exists: versionNumbers.includes(2),
      versionNumbers,
    };
  }

  const payload = version1.snapshotPayloadJson as { schemaVersion?: string } | null;

  return {
    exists: true,
    publicationId: version1.publicationId,
    versionId: version1.id,
    versionNumber: 1,
    financeYearId,
    financeYearName: year?.name ?? null,
    tenantName: tenant?.name ?? null,
    snapshotSchema: payload?.schemaVersion ?? null,
    publishedAt: version1.publishedAt?.toISOString() ?? null,
    lifecycleStatus: version1.lifecycleStatus,
    version2Exists: versionNumbers.includes(2),
    versionNumbers,
  };
}

export async function readMitgliedsForecastLineMinor(
  db: Pick<
    PrismaClient,
    "financeForecast" | "financeForecastVersion" | "financeForecastLine" | "financialAccount"
  >,
  tenantId: string,
  financeYearId: string,
): Promise<{ accountId: string; forecastVersionId: string; amountMinor: number | null }> {
  const account = await db.financialAccount.findFirst({
    where: {
      tenantId,
      name: MITGLIEDSBEITRAEGE_ACCOUNT_NAME,
      lifecycle: "ACTIVE",
    },
    select: { id: true },
  });
  if (!account) {
    throw new Error(`Account ${MITGLIEDSBEITRAEGE_ACCOUNT_NAME} not found for tenant.`);
  }

  const forecast = await db.financeForecast.findFirst({
    where: { tenantId, financeYearId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { lines: true },
      },
    },
  });
  if (!forecast) {
    throw new Error("Current forecast not found for finance year.");
  }

  const measure = resolveCurrentForecastMeasure({
    forecastId: forecast.id,
    currentVersionId: forecast.currentVersionId ?? null,
    versions: forecast.versions.map((v) => ({
      id: v.id,
      status: v.status,
      forecastId: forecast.id,
      lines: v.lines.map((l) => ({
        financialAccountId: l.financialAccountId,
        amountMinor: l.amountMinor,
      })),
    })),
  });
  const amountMinor = measure?.valuesByAccountId.get(account.id) ?? null;

  return {
    accountId: account.id,
    forecastVersionId: measure?.forecastVersionId ?? forecast.currentVersionId ?? "",
    amountMinor,
  };
}

/** PO UAT baseline Management P&L (optional Mitgliedsbeiträge forecast override). */
export function buildPoBaselineManagementPnlReadModel(input?: {
  mitgliedsForecastMinor?: number;
  tenantId?: string;
  financeYearId?: string;
}): FinanceManagementPnlReadModel {
  const tenantId = input?.tenantId ?? "tenant-po-uat";
  const financeYearId = input?.financeYearId ?? "fy-2026";
  const mitgliedForecast = input?.mitgliedsForecastMinor ?? R5_V1_BASELINE.mitgliedsbeitraegeForecastMinor;
  const groups = [
    {
      id: "g-income",
      tenantId,
      name: "Einnahmen",
      parentId: null,
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "g-expense",
      tenantId,
      name: "Ausgaben",
      parentId: null,
      sortOrder: 1,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const accounts = [
    {
      id: "acc-m",
      tenantId,
      reportingGroupId: "g-income",
      name: MITGLIEDSBEITRAEGE_ACCOUNT_NAME,
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "INCOME" as const,
      nodeKind: "POSTING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-weitere",
      tenantId,
      reportingGroupId: "g-income",
      name: "Weitere Einnahmen",
      sortOrder: 1,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "INCOME" as const,
      nodeKind: "POSTING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-beispiel",
      tenantId,
      reportingGroupId: "g-income",
      name: "Beispiel X",
      sortOrder: 2,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "INCOME" as const,
      nodeKind: "POSTING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-personal",
      tenantId,
      reportingGroupId: "g-expense",
      name: "Personal",
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "EXPENSE" as const,
      nodeKind: "POSTING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-betrieb",
      tenantId,
      reportingGroupId: "g-expense",
      name: "Betrieb",
      sortOrder: 1,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "EXPENSE" as const,
      nodeKind: "POSTING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const budgetMap = new Map([
    ["acc-m", 175_000_00],
    ["acc-weitere", 25_000_00],
    ["acc-beispiel", 25_000_00],
    ["acc-personal", 50_000_00],
    ["acc-betrieb", 25_000_00],
  ]);
  const actualMap = new Map([
    ["acc-m", 103_400_00],
    ["acc-weitere", 0],
    ["acc-beispiel", 500_00],
    ["acc-personal", 74_124_00],
    ["acc-betrieb", 22_000_00],
  ]);
  const forecastMap = new Map([
    ["acc-m", mitgliedForecast],
    ["acc-weitere", 25_000_00],
    ["acc-beispiel", 25_000_00],
    ["acc-personal", 74_124_00],
    ["acc-betrieb", 27_037_00],
  ]);

  return buildFinanceManagementPnlReadModel({
    tenantId,
    financeYearId,
    financeYearName: "FY 2026",
    baseCurrency: "CHF",
    structureAvailability: "AVAILABLE",
    actualCutoffDate: null,
    groups,
    accounts,
    approvedMeasure: {
      measure: "APPROVED_BUDGET",
      budgetVersionId: "bv1",
      approvedAt: new Date(),
      baseCurrency: "CHF",
      valuesByAccountId: budgetMap,
    },
    actualMeasure: {
      measure: "ACTUAL",
      grain: "ANNUAL_FULL_YEAR",
      cutoffDate: null,
      valuesByAccountId: actualMap,
    },
    forecastMeasure: {
      measure: "CURRENT_FORECAST",
      forecastVersionId: "fv1",
      forecastId: "f1",
      valuesByAccountId: forecastMap,
    },
    sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
  });
}

export { evaluateStageIdentity };

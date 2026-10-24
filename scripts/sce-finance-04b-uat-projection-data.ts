/**
 * SCE-FIN-04B-UAT-DATA-01 — STAGE-only fictional finance actuals + real SCE projection generation.
 *
 * Inspect (default):
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-uat-projection-data.ts --inspect
 *
 * Apply:
 *   APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
 *     SCE_OPERATION_AUTHORIZATION=sce-finance-04b-uat-projection-data:stage \
 *     ./node_modules/.bin/tsx scripts/sce-finance-04b-uat-projection-data.ts \
 *     --apply --confirm SCE-FIN-04B-UAT-DATA-01-APPLY
 *
 * Cleanup (not run during package — documented for post-UAT):
 *   ... --cleanup --confirm SCE-FIN-04B-UAT-DATA-01-CLEANUP
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/db/prisma";
import { generateFinanceYearProjection } from "@/lib/finance/services/finance-projection-generation-service";
import { loadProjectionWorkspaceViewModel } from "@/lib/finance/services/finance-projection-workspace-query-service";
import { createFinanceActualEntry } from "@/lib/finance/services/finance-actual-service";
import {
  CLUB_ADMIN_EMAIL,
  DEFAULT_UAT_ACTUALS_THROUGH_DATE,
  FCA_TENANT_KEY,
  OPERATION_ID,
  UAT_DATA_MARKER,
  assertApplyAuthorization,
  assertCleanupAuthorization,
  buildUatEntryPlan,
  deriveHistoricalFinanceYearSpec,
  evaluateStageIdentity,
  financeAuthContextForUat,
  isUatManagedDescription,
  parseUatCliMode,
  readBudgetAndForecastSnapshot,
  resolveTargetAccountsByScenario,
  snapshotsEqual,
  type PlannedActualEntry,
} from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";

function parseConfirm(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--confirm") return argv[i + 1] ?? null;
    if (arg.startsWith("--confirm=")) return arg.split("=")[1] ?? null;
  }
  return null;
}

function parseCutoff(argv: string[]): string {
  for (const arg of argv) {
    if (arg.startsWith("--cutoff=")) {
      return arg.split("=")[1]?.trim() || DEFAULT_UAT_ACTUALS_THROUGH_DATE;
    }
  }
  return DEFAULT_UAT_ACTUALS_THROUGH_DATE;
}

function printJson(label: string, value: unknown): void {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(value, null, 2));
}

async function resolveTenant() {
  const tenant = await prisma.tenant.findFirst({
    where: { key: FCA_TENANT_KEY },
    select: { id: true, name: true, key: true },
  });
  if (!tenant) throw new Error(`Tenant ${FCA_TENANT_KEY} not found.`);
  return tenant;
}

async function resolveTargetFinanceYear(tenantId: string) {
  const years = await prisma.financeYear.findMany({
    where: { tenantId },
    orderBy: { startDate: "asc" },
  });
  const target =
    years.find((y) => y.name.trim() === "FY 2026") ??
    years.find((y) => y.name.includes("2026"));
  if (!target) throw new Error("Target finance year FY 2026 not found.");
  return { years, target };
}

async function ensureHistoricalYears(
  tenantId: string,
  target: { startDate: Date; endDate: Date; name: string },
  mode: "inspect" | "apply",
): Promise<Array<{ id: string; name: string; startDate: Date; endDate: Date; created: boolean }>> {
  const existing = await prisma.financeYear.findMany({
    where: { tenantId },
    orderBy: { startDate: "asc" },
  });
  const out: Array<{ id: string; name: string; startDate: Date; endDate: Date; created: boolean }> = [];
  for (const calendarYear of [2024, 2025]) {
    const spec = deriveHistoricalFinanceYearSpec(target, calendarYear);
    const found = existing.find((y) => y.name === spec.name);
    if (found) {
      out.push({ ...found, created: false });
      continue;
    }
    if (mode === "inspect") {
      out.push({
        id: `(would-create-${spec.name})`,
        name: spec.name,
        startDate: spec.startDate,
        endDate: spec.endDate,
        created: true,
      });
      continue;
    }
    const created = await prisma.financeYear.create({
      data: {
        tenantId,
        name: spec.name,
        startDate: spec.startDate,
        endDate: spec.endDate,
        status: "DRAFT",
      },
    });
    out.push({ ...created, created: true });
  }
  return out;
}

async function buildContext(actualsThroughDateIso: string) {
  const tenant = await resolveTenant();
  const { years, target } = await resolveTargetFinanceYear(tenant.id);
  const config = await prisma.financeConfiguration.findUnique({
    where: { tenantId: tenant.id },
    select: { baseCurrency: true },
  });
  const accounts = await prisma.financialAccount.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, canonicalSemantic: true, lifecycle: true },
    orderBy: { name: "asc" },
  });
  const resolvedNames = resolveTargetAccountsByScenario(accounts);
  const accountIdByName = new Map(accounts.map((a) => [a.name, a.id]));
  const historicalYears = await ensureHistoricalYears(tenant.id, target, "inspect");
  const historicalForPlan = historicalYears.map((y) => ({
    name: y.name,
    startDate: y.startDate,
    endDate: y.endDate,
  }));
  const plan = buildUatEntryPlan({
    targetFinanceYear: {
      name: target.name,
      startDate: target.startDate,
      endDate: target.endDate,
    },
    historicalYears: historicalForPlan,
    resolvedAccountNames: resolvedNames,
    actualsThroughDateIso,
  });

  const yearIdByName = new Map<string, string>();
  for (const y of years) yearIdByName.set(y.name, y.id);
  for (const y of historicalYears) yearIdByName.set(y.name, y.id);

  const targetAccountIds = Object.values(resolvedNames)
    .map((name) => accountIdByName.get(name))
    .filter((id): id is string => Boolean(id));

  return {
    tenant,
    config,
    years,
    target,
    accounts,
    resolvedNames,
    accountIdByName,
    yearIdByName,
    plan,
    targetAccountIds,
    actualsThroughDateIso,
  };
}

async function countExistingUatActuals(tenantId: string): Promise<number> {
  return prisma.financeActualEntry.count({
    where: {
      tenantId,
      description: { startsWith: `${UAT_DATA_MARKER}|` },
    },
  });
}

async function runInspect(actualsThroughDateIso: string): Promise<void> {
  const stage = evaluateStageIdentity();
  printJson("STAGE_ENVIRONMENT_IDENTITY", stage);

  const ctx = await buildContext(actualsThroughDateIso);
  const actualCountsByYear = await prisma.financeActualEntry.groupBy({
    by: ["financeYearId"],
    where: { tenantId: ctx.tenant.id },
    _count: true,
  });

  const existingUat = await countExistingUatActuals(ctx.tenant.id);

  printJson("TENANT", {
    tenantName: ctx.tenant.name,
    tenantId: ctx.tenant.id,
    baseCurrency: ctx.config?.baseCurrency ?? null,
  });

  printJson("FINANCE_YEAR_STRUCTURE", {
    targetFinanceYearName: ctx.target.name,
    targetFinanceYearId: ctx.target.id,
    targetFinanceYearStart: ctx.target.startDate.toISOString().slice(0, 10),
    targetFinanceYearEnd: ctx.target.endDate.toISOString().slice(0, 10),
    existingFinanceYears: ctx.years.map((y) => ({
      id: y.id,
      name: y.name,
      start: y.startDate.toISOString().slice(0, 10),
      end: y.endDate.toISOString().slice(0, 10),
    })),
    wouldCreateHistoricalYears: ["FY 2024", "FY 2025"].filter(
      (name) => !ctx.years.some((y) => y.name === name),
    ),
  });

  printJson("TARGET_ACCOUNTS", ctx.resolvedNames);
  printJson("EXISTING_ACTUAL_COUNTS_BY_YEAR", actualCountsByYear);
  printJson("EXISTING_UAT_MANAGED_ACTUALS", existingUat);
  printJson("PLANNED_UAT_ENTRIES", {
    total: ctx.plan.length,
    byScenario: ctx.plan.reduce<Record<string, number>>((acc, row) => {
      acc[row.scenario] = (acc[row.scenario] ?? 0) + 1;
      return acc;
    }, {}),
  });

  const missing: PlannedActualEntry[] = [];
  for (const row of ctx.plan) {
    const found = await prisma.financeActualEntry.findFirst({
      where: { tenantId: ctx.tenant.id, description: row.description },
    });
    if (!found) missing.push(row);
  }
  printJson("WOULD_CREATE", { count: missing.length, sample: missing.slice(0, 5) });
}

async function applyPlanRow(
  authCtx: ReturnType<typeof financeAuthContextForUat>,
  row: PlannedActualEntry,
  maps: {
    yearIdByName: Map<string, string>;
    accountIdByName: Map<string, string>;
    currency: string;
  },
): Promise<"created" | "skipped"> {
  const existing = await prisma.financeActualEntry.findFirst({
    where: {
      tenantId: authCtx.tenantId,
      description: row.description,
    },
  });
  if (existing) return "skipped";

  const financeYearId = maps.yearIdByName.get(row.financeYearName);
  const financialAccountId = maps.accountIdByName.get(row.accountName);
  if (!financeYearId || !financialAccountId) {
    throw new Error(`Missing year/account mapping for ${row.financeYearName} / ${row.accountName}`);
  }

  await createFinanceActualEntry(prisma, authCtx, {
    financeYearId,
    financialAccountId,
    effectiveDate: row.effectiveDateIso,
    amountMinor: row.amountMinor,
    currency: maps.currency,
    description: row.description,
    source: "MANUAL",
  });
  return "created";
}

async function runApply(actualsThroughDateIso: string, confirm: string | null): Promise<void> {
  assertApplyAuthorization(process.env, { confirm });

  const stage = evaluateStageIdentity();
  printJson("STAGE_ENVIRONMENT_IDENTITY", stage);

  const tenant = await resolveTenant();
  const admin = await prisma.user.findFirst({
    where: { email: CLUB_ADMIN_EMAIL },
    select: { id: true },
  });
  if (!admin) throw new Error(`Club admin ${CLUB_ADMIN_EMAIL} not found.`);

  const authCtx = financeAuthContextForUat({ tenantId: tenant.id, userId: admin.id });
  const { years, target } = await resolveTargetFinanceYear(tenant.id);
  const config = await prisma.financeConfiguration.findUnique({
    where: { tenantId: tenant.id },
    select: { baseCurrency: true },
  });
  const currency = config?.baseCurrency?.trim().toUpperCase();
  if (!currency) throw new Error("Finance base currency missing.");

  const accounts = await prisma.financialAccount.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, canonicalSemantic: true, lifecycle: true },
  });
  const resolvedNames = resolveTargetAccountsByScenario(accounts);
  const accountIdByName = new Map(accounts.map((a) => [a.name, a.id]));
  const targetAccountIds = Object.values(resolvedNames)
    .map((name) => accountIdByName.get(name))
    .filter((id): id is string => Boolean(id));

  const budgetForecastBefore = await readBudgetAndForecastSnapshot(
    prisma,
    tenant.id,
    target.id,
    targetAccountIds,
  );

  const historicalYears = await ensureHistoricalYears(tenant.id, target, "apply");
  const yearIdByName = new Map(years.map((y) => [y.name, y.id]));
  for (const hy of historicalYears) yearIdByName.set(hy.name, hy.id);
  yearIdByName.set(target.name, target.id);

  const plan = buildUatEntryPlan({
    targetFinanceYear: {
      name: target.name,
      startDate: target.startDate,
      endDate: target.endDate,
    },
    historicalYears: historicalYears.map((y) => ({
      name: y.name,
      startDate: y.startDate,
      endDate: y.endDate,
    })),
    resolvedAccountNames: resolvedNames,
    actualsThroughDateIso,
  });

  let createdCount = 0;
  const manifestEntries: Array<Record<string, unknown>> = [];
  for (const row of plan) {
    const outcome = await applyPlanRow(authCtx, row, {
      yearIdByName,
      accountIdByName,
      currency,
    });
    if (outcome === "created") {
      createdCount += 1;
      const persisted = await prisma.financeActualEntry.findFirst({
        where: { tenantId: tenant.id, description: row.description },
      });
      manifestEntries.push({
        id: persisted?.id,
        scenario: row.scenario,
        accountName: row.accountName,
        financeYearName: row.financeYearName,
        effectiveDate: row.effectiveDateIso,
        amountMinor: row.amountMinor,
        marker: UAT_DATA_MARKER,
        cleanupPermitted: true,
      });
    }
  }

  const budgetForecastAfter = await readBudgetAndForecastSnapshot(
    prisma,
    tenant.id,
    target.id,
    targetAccountIds,
  );

  const generation = await generateFinanceYearProjection(prisma, authCtx, {
    financeYearId: target.id,
    actualsThroughDate: actualsThroughDateIso,
    generationActorType: "SYSTEM",
  });

  const forecastMap = new Map(
    budgetForecastAfter.forecast.map((f) => {
      const acc = accounts.find((a) => a.name === f.accountName);
      return [acc?.id ?? f.accountName, f.amountMinor] as const;
    }),
  );
  const workspace = await loadProjectionWorkspaceViewModel(prisma, authCtx, {
    financeYearId: target.id,
    forecastAmountByAccountId: forecastMap,
  });
  const dashboard = workspace?.dashboard ?? null;

  const projectionVersion = await prisma.financeProjectionVersion.findFirst({
    where: { financeProjection: { tenantId: tenant.id, financeYearId: target.id } },
    orderBy: { versionNumber: "desc" },
    include: {
      lines: {
        include: { financialAccount: { select: { name: true, canonicalSemantic: true } } },
      },
    },
  });

  const accountResults = generation.accountResults.map((r) => {
    const acc = accounts.find((a) => a.id === r.financialAccountId);
    return {
      account: acc?.name ?? r.financialAccountId,
      accountType: acc?.canonicalSemantic ?? null,
      methodology: r.methodologyFamily,
      dataSufficiency: r.dataSufficiency,
      confidence: r.confidenceLevel,
      knownActualAmount: r.knownActualAmountMinor,
      estimatedRemainingAmount: r.estimatedRemainingAmountMinor,
      projectedAmount: r.projectedAmountMinor,
      lowerBound: r.lowerBoundMinor,
      upperBound: r.upperBoundMinor,
      reasonCodes: r.sufficiencyReasons,
      historicalYearsUsed: r.historicalFinanceYearIdsUsed,
      actualsThroughDate: actualsThroughDateIso,
    };
  });

  let secondCreated = 0;
  for (const row of plan) {
    const outcome = await applyPlanRow(authCtx, row, {
      yearIdByName,
      accountIdByName,
      currency,
    });
    if (outcome === "created") secondCreated += 1;
  }

  const artifactDir = resolve("/opt/cursor/artifacts");
  mkdirSync(artifactDir, { recursive: true });
  const manifestPath = resolve(artifactDir, "sce-finance-04b-uat-data-01-manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        operationId: OPERATION_ID,
        marker: UAT_DATA_MARKER,
        tenantId: tenant.id,
        financeYearId: target.id,
        actualsThroughDate: actualsThroughDateIso,
        createdFinanceYears: historicalYears.filter((y) => y.created).map((y) => ({
          id: y.id,
          name: y.name,
        })),
        createdActualEntries: manifestEntries,
        projectionVersionNumber: projectionVersion?.versionNumber ?? null,
        accountResults,
        appliedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  printJson("CREATED_FINANCE_YEARS", historicalYears.filter((y) => y.created));
  printJson("FIRST_APPLY_CREATED_COUNT", createdCount);
  printJson("SECOND_APPLY_CREATED_COUNT", secondCreated);
  printJson("IDEMPOTENCY", {
    DUPLICATE_UAT_ACTUALS: secondCreated,
    IDEMPOTENCY_PASS: secondCreated === 0,
  });
  printJson("BUDGET_UNCHANGED", snapshotsEqual(budgetForecastBefore.budget, budgetForecastAfter.budget));
  printJson("CURRENT_FORECAST_UNCHANGED", snapshotsEqual(budgetForecastBefore.forecast, budgetForecastAfter.forecast));
  printJson("PROJECTION_RESULT_BY_ACCOUNT", accountResults);
  printJson("PROJECTION_VERSION", {
    versionNumber: projectionVersion?.versionNumber,
    lineCount: projectionVersion?.lines.length,
  });
  printJson("DASHBOARD_READINESS", {
    hasWorkspace: Boolean(workspace),
    outlookRowCount: dashboard?.outlook.length ?? 0,
    incomeCompositionCount: dashboard?.incomeComposition.length ?? 0,
    expenseCompositionCount: dashboard?.expenseComposition.length ?? 0,
    divergenceAvailable: dashboard?.divergence !== null,
  });
  printJson("MANIFEST_PATH", manifestPath);
}

async function runCleanup(confirm: string | null): Promise<void> {
  assertCleanupAuthorization(process.env, { confirm });
  const tenant = await resolveTenant();
  const entries = await prisma.financeActualEntry.findMany({
    where: {
      tenantId: tenant.id,
      description: { startsWith: `${UAT_DATA_MARKER}|` },
    },
    select: { id: true, description: true, financeYearId: true },
  });
  printJson("CLEANUP_WOULD_DELETE_ACTUALS", { count: entries.length, ids: entries.map((e) => e.id) });
  for (const entry of entries) {
    if (!isUatManagedDescription(entry.description)) continue;
    await prisma.financeActualEntry.delete({ where: { id: entry.id } });
  }
  printJson("CLEANUP_DELETED", entries.length);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const mode = parseUatCliMode(argv);
  const confirm = parseConfirm(argv);
  const cutoff = parseCutoff(argv);

  if (mode === "inspect") {
    await runInspect(cutoff);
    return;
  }
  if (mode === "apply") {
    await runApply(cutoff, confirm);
    return;
  }
  if (mode === "cleanup") {
    console.log("Cleanup mode: dry-run listing only unless --confirm is provided.");
    if (confirm === "SCE-FIN-04B-UAT-DATA-01-CLEANUP") {
      await runCleanup(confirm);
    } else {
      const tenant = await resolveTenant();
      const entries = await prisma.financeActualEntry.count({
        where: {
          tenantId: tenant.id,
          description: { startsWith: `${UAT_DATA_MARKER}|` },
        },
      });
      printJson("CLEANUP_PREVIEW", {
        uatActualEntries: entries,
        requiredConfirm: "SCE-FIN-04B-UAT-DATA-01-CLEANUP",
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

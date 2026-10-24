/**
 * SCE-FIN-04B-UAT-DATA-01 — guarded STAGE-only fictional finance actuals for projection PO UAT.
 * Default mode is inspect (non-mutating). Apply requires verified shared STAGE identity.
 */

import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { enumerateFinanceYearMonths } from "@/lib/finance/actual/finance-measurement-period";
import type { FinanceYearPeriod } from "@/lib/finance/actual/finance-year-membership";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import { getEffectivePrismaRuntimeConnectionSource } from "@/lib/db/runtime-connection";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";
import { getRuntimeEnvironment } from "@/lib/env";

export const OPERATION_ID = "sce-finance-04b-uat-projection-data";
export const UAT_DATA_MARKER = "SCE_FIN_04B_UAT_DATA_01";
export const UAT_EXECUTE_CONFIRMATION = "SCE-FIN-04B-UAT-DATA-01-APPLY";
export const UAT_CLEANUP_CONFIRMATION = "SCE-FIN-04B-UAT-DATA-01-CLEANUP";
export const STAGE_CANONICAL_DATABASE_FINGERPRINT = "acd3b37682911890";
export const FCA_TENANT_KEY = "fc-allschwil";
export const CLUB_ADMIN_EMAIL = "it@fcallschwil.ch";

export type UatCliMode = "inspect" | "apply" | "cleanup";

export type UatAccountScenario =
  | "MITGLIED_HISTORICAL_PATTERN"
  | "PERSONAL_HISTORICAL_PATTERN"
  | "BETRIEB_RUN_RATE"
  | "WEITERE_INSUFFICIENT"
  | "BEISPIEL_SPARSE";

export type PlannedActualEntry = {
  scenario: UatAccountScenario;
  accountName: string;
  financeYearName: string;
  effectiveDateIso: string;
  amountMinor: number;
  description: string;
};

export type StageIdentityReport = {
  appEnv: string;
  sceDataEnvironment: string;
  databaseFingerprint: string | null;
  databaseHostSafe: string | null;
  databaseName: string | null;
  stageIdentityVerified: boolean;
  productionTouched: "NO";
};

export function parseUatCliMode(argv: readonly string[]): UatCliMode {
  if (argv.includes("--apply")) return "apply";
  if (argv.includes("--cleanup")) return "cleanup";
  if (argv.includes("--inspect") || argv.length === 0) return "inspect";
  return "inspect";
}

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

function safeDatabaseIdentity(env: NodeJS.ProcessEnv): {
  hostPrefix: string | null;
  databaseName: string | null;
} {
  const source = getEffectivePrismaRuntimeConnectionSource(env).value;
  if (!source) return { hostPrefix: null, databaseName: null };
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase();
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const hostPrefix = host.slice(0, 24);
    return { hostPrefix, databaseName: database || null };
  } catch {
    return { hostPrefix: null, databaseName: null };
  }
}

export function evaluateStageIdentity(env: NodeJS.ProcessEnv = process.env): StageIdentityReport {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  const identity = resolveRuntimeIdentity(env);
  const effectiveFp =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ?? null;
  const configuredFp = env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase() || null;
  const dataEnv = getRuntimeDataEnvironment(env);
  const { hostPrefix, databaseName } = safeDatabaseIdentity(env);

  const stageIdentityVerified =
    !runtime.isProd &&
    runtime.isStage &&
    dataEnv === "STAGE" &&
    effectiveFp === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
    configuredFp === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
    identity.databaseFingerprintMatchesConfiguredTarget &&
    (hostPrefix?.startsWith("ep-wispy-hall-aso93dy6") ?? false) &&
    databaseName === "neondb";

  return {
    appEnv: runtime.appEnv,
    sceDataEnvironment: dataEnv,
    databaseFingerprint: effectiveFp,
    databaseHostSafe: hostPrefix,
    databaseName,
    stageIdentityVerified,
    productionTouched: "NO",
  };
}

export function assertStageIdentityForMutation(env: NodeJS.ProcessEnv = process.env): StageIdentityReport {
  const report = evaluateStageIdentity(env);
  if (!report.stageIdentityVerified) {
    throw new Error(
      `Refusing mutation: shared STAGE identity not verified (APP_ENV=${report.appEnv}, SCE_DATA_ENVIRONMENT=${report.sceDataEnvironment}, fingerprint=${report.databaseFingerprint}).`,
    );
  }
  return report;
}

export function assertApplyAuthorization(
  env: NodeJS.ProcessEnv,
  input: { confirm: string | null | undefined },
): void {
  assertStageIdentityForMutation(env);
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
  if (input.confirm?.trim() !== UAT_EXECUTE_CONFIRMATION) {
    throw new Error(
      `Apply requires --confirm ${UAT_EXECUTE_CONFIRMATION} (got ${input.confirm ?? "none"}).`,
    );
  }
}

export function assertCleanupAuthorization(
  env: NodeJS.ProcessEnv,
  input: { confirm: string | null | undefined },
): void {
  assertStageIdentityForMutation(env);
  if (input.confirm?.trim() !== UAT_CLEANUP_CONFIRMATION) {
    throw new Error(
      `Cleanup requires --confirm ${UAT_CLEANUP_CONFIRMATION} (got ${input.confirm ?? "none"}).`,
    );
  }
}

export function uatDescriptionFor(input: {
  scenario: UatAccountScenario;
  accountName: string;
  effectiveDateIso: string;
  amountMinor: number;
}): string {
  return `${UAT_DATA_MARKER}|${input.scenario}|${input.accountName}|${input.effectiveDateIso}|${input.amountMinor}`;
}

export function isUatManagedDescription(description: string | null | undefined): boolean {
  return (description?.startsWith(`${UAT_DATA_MARKER}|`) ?? false);
}

export function parseUatDescription(description: string): {
  scenario: UatAccountScenario;
  accountName: string;
  effectiveDateIso: string;
  amountMinor: number;
} | null {
  if (!description.startsWith(`${UAT_DATA_MARKER}|`)) return null;
  const parts = description.split("|");
  if (parts.length !== 5) return null;
  const amountMinor = Number(parts[4]);
  if (!Number.isFinite(amountMinor)) return null;
  return {
    scenario: parts[1] as UatAccountScenario,
    accountName: parts[2]!,
    effectiveDateIso: parts[3]!,
    amountMinor,
  };
}

/** Resolve PO UAT account names including known FC Allschwil typo variant. */
export const TARGET_ACCOUNT_SPECS: Readonly<
  Record<
    UatAccountScenario,
    { resolveNames: readonly string[]; accountType: "INCOME" | "EXPENSE" }
  >
> = {
  MITGLIED_HISTORICAL_PATTERN: {
    resolveNames: ["Mitgliedsbeiträge"],
    accountType: "INCOME",
  },
  PERSONAL_HISTORICAL_PATTERN: {
    resolveNames: ["Personal"],
    accountType: "EXPENSE",
  },
  BETRIEB_RUN_RATE: {
    resolveNames: ["Betrieb"],
    accountType: "EXPENSE",
  },
  WEITERE_INSUFFICIENT: {
    resolveNames: ["Weitere Einnahmen"],
    accountType: "INCOME",
  },
  BEISPIEL_SPARSE: {
    resolveNames: ["Beispiel X", "Beispeil X"],
    accountType: "INCOME",
  },
};

/** Default UAT cutoff — aligns with PO UAT window (Oct 2026). Override with --cutoff=YYYY-MM-DD. */
export const DEFAULT_UAT_ACTUALS_THROUGH_DATE = "2026-10-24";

function parseUtcDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function formatUtcDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function midMonthDate(slice: { startDate: Date; endDate: Date }): Date {
  const start = slice.startDate.getTime();
  const end = slice.endDate.getTime();
  return new Date(Math.min(start + 5 * 86_400_000, end));
}

/**
 * Splits an annual total across finance-year-relative months using weight basis points (must sum to 10_000).
 */
export function distributeAnnualAmount(input: {
  year: FinanceYearPeriod;
  annualTotalMinor: number;
  monthWeightBasisPoints: readonly number[];
}): Array<{ effectiveDateIso: string; amountMinor: number }> {
  const months = enumerateFinanceYearMonths(input.year);
  if (months.length !== input.monthWeightBasisPoints.length) {
    throw new Error(
      `Month weight count ${input.monthWeightBasisPoints.length} does not match finance year month count ${months.length}.`,
    );
  }
  const weightSum = input.monthWeightBasisPoints.reduce((a, b) => a + b, 0);
  if (weightSum !== 10_000) {
    throw new Error(`Month weights must sum to 10000 bp (got ${weightSum}).`);
  }

  const raw = input.monthWeightBasisPoints.map((bp) =>
    Math.floor((input.annualTotalMinor * bp) / 10_000),
  );
  let assigned = raw.reduce((a, b) => a + b, 0);
  let remainder = input.annualTotalMinor - assigned;
  for (let i = raw.length - 1; remainder > 0 && i >= 0; i -= 1) {
    raw[i]! += 1;
    remainder -= 1;
    assigned += 1;
  }

  return months.map((slice, index) => ({
    effectiveDateIso: formatUtcDateOnly(midMonthDate(slice)),
    amountMinor: raw[index]!,
  }));
}

/** Membership income — seasonally weighted (Nov/Dec tail); ~40% cumulative through Sep for historical years. */
const MEMBERSHIP_WEIGHTS_FY2024 = [
  600, 550, 500, 450, 400, 400, 400, 350, 350, 800, 2600, 2600,
] as const;
const MEMBERSHIP_WEIGHTS_FY2025 = [
  550, 550, 500, 450, 400, 400, 400, 350, 350, 750, 2750, 2550,
] as const;
const MEMBERSHIP_WEIGHTS_FY2026 = [
  600, 550, 500, 480, 460, 440, 430, 410, 400, 430, 2650, 2650,
] as const;

/** Personal — relatively even expense profile with modest variation. */
const PERSONAL_WEIGHTS_EVEN = [
  850, 850, 850, 850, 850, 850, 830, 830, 830, 830, 830, 750,
] as const;

const BETRIEB_WEIGHTS_FY2026 = [
  1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 0, 0,
] as const;

export function deriveHistoricalFinanceYearSpec(targetYear: {
  name: string;
  startDate: Date;
  endDate: Date;
}, calendarYear: number): { name: string; startDate: Date; endDate: Date } {
  const prefix = targetYear.name.replace(/\d{4}/, "").trim() || "FY";
  const startYear = targetYear.startDate.getUTCFullYear();
  const delta = calendarYear - startYear;
  const start = new Date(targetYear.startDate);
  start.setUTCFullYear(start.getUTCFullYear() + delta);
  const end = new Date(targetYear.endDate);
  end.setUTCFullYear(end.getUTCFullYear() + delta);
  return {
    name: `${prefix} ${calendarYear}`.replace(/\s+/g, " ").trim(),
    startDate: start,
    endDate: end,
  };
}

export function buildUatEntryPlan(input: {
  targetFinanceYear: FinanceYearPeriod & { name: string };
  historicalYears: ReadonlyArray<FinanceYearPeriod & { name: string }>;
  resolvedAccountNames: Readonly<Record<UatAccountScenario, string>>;
  actualsThroughDateIso: string;
}): PlannedActualEntry[] {
  const plan: PlannedActualEntry[] = [];
  const cutoff = parseUtcDateOnly(input.actualsThroughDateIso);

  const pushScenario = (
    scenario: UatAccountScenario,
    year: FinanceYearPeriod & { name: string },
    distribution: Array<{ effectiveDateIso: string; amountMinor: number }>,
  ) => {
    const accountName = input.resolvedAccountNames[scenario];
    for (const row of distribution) {
      if (parseUtcDateOnly(row.effectiveDateIso).getTime() > cutoff.getTime()) continue;
      if (row.amountMinor <= 0) continue;
      plan.push({
        scenario,
        accountName,
        financeYearName: year.name,
        effectiveDateIso: row.effectiveDateIso,
        amountMinor: row.amountMinor,
        description: uatDescriptionFor({
          scenario,
          accountName,
          effectiveDateIso: row.effectiveDateIso,
          amountMinor: row.amountMinor,
        }),
      });
    }
  };

  const fy2024 = input.historicalYears.find((y) => y.name.includes("2024"));
  const fy2025 = input.historicalYears.find((y) => y.name.includes("2025"));
  if (!fy2024 || !fy2025) {
    throw new Error("Historical finance years FY 2024 and FY 2025 are required in the plan input.");
  }

  pushScenario(
    "MITGLIED_HISTORICAL_PATTERN",
    fy2024,
    distributeAnnualAmount({
      year: fy2024,
      annualTotalMinor: 205_000_00,
      monthWeightBasisPoints: MEMBERSHIP_WEIGHTS_FY2024,
    }),
  );
  pushScenario(
    "MITGLIED_HISTORICAL_PATTERN",
    fy2025,
    distributeAnnualAmount({
      year: fy2025,
      annualTotalMinor: 215_000_00,
      monthWeightBasisPoints: MEMBERSHIP_WEIGHTS_FY2025,
    }),
  );
  pushScenario(
    "MITGLIED_HISTORICAL_PATTERN",
    input.targetFinanceYear,
    distributeAnnualAmount({
      year: input.targetFinanceYear,
      annualTotalMinor: 220_000_00,
      monthWeightBasisPoints: MEMBERSHIP_WEIGHTS_FY2026,
    }),
  );

  pushScenario(
    "PERSONAL_HISTORICAL_PATTERN",
    fy2024,
    distributeAnnualAmount({
      year: fy2024,
      annualTotalMinor: 68_000_00,
      monthWeightBasisPoints: PERSONAL_WEIGHTS_EVEN,
    }),
  );
  pushScenario(
    "PERSONAL_HISTORICAL_PATTERN",
    fy2025,
    distributeAnnualAmount({
      year: fy2025,
      annualTotalMinor: 74_000_00,
      monthWeightBasisPoints: PERSONAL_WEIGHTS_EVEN,
    }),
  );
  pushScenario(
    "PERSONAL_HISTORICAL_PATTERN",
    input.targetFinanceYear,
    distributeAnnualAmount({
      year: input.targetFinanceYear,
      annualTotalMinor: 72_000_00,
      monthWeightBasisPoints: PERSONAL_WEIGHTS_EVEN,
    }),
  );

  pushScenario(
    "BETRIEB_RUN_RATE",
    input.targetFinanceYear,
    distributeAnnualAmount({
      year: input.targetFinanceYear,
      annualTotalMinor: 22_000_00,
      monthWeightBasisPoints: BETRIEB_WEIGHTS_FY2026,
    }),
  );

  const beispielYear = input.targetFinanceYear;
  plan.push({
    scenario: "BEISPIEL_SPARSE",
    accountName: input.resolvedAccountNames.BEISPIEL_SPARSE,
    financeYearName: beispielYear.name,
    effectiveDateIso: formatUtcDateOnly(midMonthDate(enumerateFinanceYearMonths(beispielYear)[2]!)),
    amountMinor: 500_00,
    description: uatDescriptionFor({
      scenario: "BEISPIEL_SPARSE",
      accountName: input.resolvedAccountNames.BEISPIEL_SPARSE,
      effectiveDateIso: formatUtcDateOnly(midMonthDate(enumerateFinanceYearMonths(beispielYear)[2]!)),
      amountMinor: 500_00,
    }),
  });

  return plan;
}

export function resolveTargetAccountsByScenario(
  accounts: ReadonlyArray<{ name: string; canonicalSemantic: string; lifecycle: string }>,
): Record<UatAccountScenario, string> {
  const active = accounts.filter((a) => a.lifecycle === "ACTIVE");
  const resolved = {} as Record<UatAccountScenario, string>;
  for (const scenario of Object.keys(TARGET_ACCOUNT_SPECS) as UatAccountScenario[]) {
    const spec = TARGET_ACCOUNT_SPECS[scenario];
    const match = active.find(
      (a) =>
        spec.resolveNames.includes(a.name) &&
        a.canonicalSemantic === spec.accountType,
    );
    if (!match) {
      throw new Error(
        `Could not resolve active account for scenario ${scenario} (candidates: ${spec.resolveNames.join(", ")}).`,
      );
    }
    resolved[scenario] = match.name;
  }
  return resolved;
}

export function financeAuthContextForUat(input: {
  tenantId: string;
  userId: string;
}): {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
} {
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_ACTUAL_MANAGE,
      PERMISSIONS.FINANCE_FORECAST_VIEW,
      PERMISSIONS.FINANCE_FORECAST_MANAGE,
      PERMISSIONS.FINANCE_ADMIN,
      PERMISSIONS.FINANCE_BUDGET_VIEW,
    ]),
  };
}

export type FinanceSnapshotLine = {
  accountName: string;
  amountMinor: number | null;
};

export async function readBudgetAndForecastSnapshot(
  db: Pick<
    PrismaClient,
    "financeBudget" | "financeBudgetVersion" | "financeBudgetLine" | "financeForecast" | "financeForecastVersion" | "financeForecastLine" | "financialAccount"
  >,
  tenantId: string,
  financeYearId: string,
  accountIds: readonly string[],
): Promise<{ budget: FinanceSnapshotLine[]; forecast: FinanceSnapshotLine[] }> {
  const accountNames = await db.financialAccount.findMany({
    where: { id: { in: [...accountIds] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(accountNames.map((a) => [a.id, a.name]));

  const budget = await db.financeBudget.findFirst({
    where: { tenantId, financeYearId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { lines: true },
      },
    },
  });
  const approvedMeasure = budget
    ? resolveApprovedBudgetMeasure({
        currentBaselineVersionId: budget.currentBaselineVersionId ?? null,
        versions: budget.versions.map((v) => ({
          id: v.id,
          status: v.status,
          baseCurrency: v.baseCurrency,
          approvedAt: v.approvedAt,
          lines: v.lines.map((l) => ({
            financialAccountId: l.financialAccountId,
            amountMinor: l.amountMinor,
          })),
        })),
      })
    : null;
  const forecast = await db.financeForecast.findFirst({
    where: { tenantId, financeYearId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { lines: true },
      },
    },
  });

  const budgetLines: FinanceSnapshotLine[] = [];
  for (const id of accountIds) {
    budgetLines.push({
      accountName: nameById.get(id) ?? id,
      amountMinor: approvedMeasure?.valuesByAccountId.get(id) ?? null,
    });
  }

  const forecastLines: FinanceSnapshotLine[] = [];
  for (const id of accountIds) {
    const line = forecast?.versions[0]?.lines.find((l) => l.financialAccountId === id);
    forecastLines.push({
      accountName: nameById.get(id) ?? id,
      amountMinor: line?.amountMinor ?? null,
    });
  }

  return { budget: budgetLines, forecast: forecastLines };
}

export function snapshotsEqual(
  before: FinanceSnapshotLine[],
  after: FinanceSnapshotLine[],
): boolean {
  if (before.length !== after.length) return false;
  for (let i = 0; i < before.length; i += 1) {
    if (before[i]!.accountName !== after[i]!.accountName) return false;
    if (before[i]!.amountMinor !== after[i]!.amountMinor) return false;
  }
  return true;
}

export function fingerprintDatabaseUrl(databaseUrl: string): string {
  const u = new URL(databaseUrl);
  const db = decodeURIComponent(u.pathname.replace(/^\//, ""));
  return createHash("sha256")
    .update(`${u.hostname.toLowerCase()}:${db}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * FIN-07D — STAGE-only seed for PO UAT threshold testing (fc-allschwil).
 * Creates DRAFT commitments only — PO performs submit during UAT.
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FIN_07D_UAT_COMMITMENT_SPECS,
  FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES,
  FIN_07D_UAT_SEED_TENANT_ID,
  FIN_07D_UAT_SEED_TENANT_KEY,
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
  buildFin07dUatAmountsForThreshold,
  resolveFin07dUatPreferredThresholdMinor,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";
import { createFinanceCommitment } from "@/lib/finance/services/finance-commitment-service";
import {
  loadFinanceCommitmentApprovalPolicyReadModel,
  saveFinanceCommitmentApprovalPolicy,
} from "@/lib/finance/services/finance-commitment-approval-policy-service";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";
import { FIN_07C_UAT_SEED_ACTOR_USER_ID } from "@/lib/finance/commitment/finance-07c-stage-uat-commitment-seed";

export const OPERATION_ID = "finance-07d-stage-uat-commitment-seed";
export const EXECUTE_CONFIRMATION = "SCE-FINANCE-07D-UAT-SEED";

export type SeedPolicyResult = {
  persistedBeforeSeed: boolean;
  policyCreatedForUat: boolean;
  enabled: boolean;
  thresholdAmountMinor: number;
  thresholdCurrency: string;
  policyId: string | null;
};

export type SeedRowResult = {
  title: string;
  created: boolean;
  commitmentId: string | null;
  financeYearId: string | null;
  amountMinor: number | null;
  currency: string | null;
  lifecycleStatus: string | null;
  approvalStatus: string | null;
  realignedFinanceYear: boolean;
};

export function buildSeedAuthContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    userId: FIN_07C_UAT_SEED_ACTOR_USER_ID,
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
      PERMISSIONS.FINANCE_COMMITMENT_SUBMIT,
      PERMISSIONS.FINANCE_COMMITMENT_POLICY_MANAGE,
    ]),
  };
}

function amountForTitle(
  title: string,
  amounts: ReturnType<typeof buildFin07dUatAmountsForThreshold>,
): number {
  if (title === FIN_07D_UAT_BELOW_THRESHOLD_TITLE) return amounts.belowMinor;
  if (title === FIN_07D_UAT_EXACT_THRESHOLD_TITLE) return amounts.exactMinor;
  if (title === FIN_07D_UAT_ABOVE_THRESHOLD_TITLE) return amounts.aboveMinor;
  throw new Error(`Unknown UAT title: ${title}`);
}

export async function seedFin07dUatCommitments(
  db: PrismaClient,
  input: { execute: boolean },
): Promise<{
  policy: SeedPolicyResult;
  rows: SeedRowResult[];
  blockingErrors: string[];
}> {
  const blockingErrors: string[] = [];
  const ctx = buildSeedAuthContext();

  const tenant = await db.tenant.findUnique({
    where: { key: FIN_07D_UAT_SEED_TENANT_KEY },
    select: { id: true },
  });
  if (!tenant || tenant.id !== FIN_07D_UAT_SEED_TENANT_ID) {
    blockingErrors.push(
      `Tenant id mismatch for ${FIN_07D_UAT_SEED_TENANT_KEY}: expected ${FIN_07D_UAT_SEED_TENANT_ID}.`,
    );
    return {
      policy: {
        persistedBeforeSeed: false,
        policyCreatedForUat: false,
        enabled: false,
        thresholdAmountMinor: 0,
        thresholdCurrency: "",
        policyId: null,
      },
      rows: [],
      blockingErrors,
    };
  }

  const policyBefore = await loadFinanceCommitmentApprovalPolicyReadModel(db, ctx);
  const baseCurrency = policyBefore.baseCurrency;
  if (!baseCurrency) {
    blockingErrors.push("Finance base currency is not configured for UAT tenant.");
    return {
      policy: {
        persistedBeforeSeed: policyBefore.persisted,
        policyCreatedForUat: false,
        enabled: policyBefore.enabled,
        thresholdAmountMinor: policyBefore.thresholdAmountMinor,
        thresholdCurrency: policyBefore.thresholdCurrency,
        policyId: policyBefore.id,
      },
      rows: [],
      blockingErrors,
    };
  }

  let policyCreatedForUat = false;
  let effectivePolicy = policyBefore;

  if (!policyBefore.persisted) {
    const preferredMinor = resolveFin07dUatPreferredThresholdMinor(baseCurrency);
    if (input.execute) {
      effectivePolicy = await saveFinanceCommitmentApprovalPolicy(db, ctx, {
        enabled: true,
        thresholdAmountMinor: preferredMinor,
      });
      policyCreatedForUat = true;
    } else {
      blockingErrors.push(
        `No persisted approval policy — re-run with --execute to create UAT policy (${preferredMinor} minor ${baseCurrency}).`,
      );
      effectivePolicy = {
        ...policyBefore,
        enabled: true,
        thresholdAmountMinor: preferredMinor,
        thresholdCurrency: baseCurrency.toUpperCase(),
      };
    }
  }

  let thresholdAmountMinor = effectivePolicy.thresholdAmountMinor;
  try {
    buildFin07dUatAmountsForThreshold(thresholdAmountMinor);
  } catch (error) {
    blockingErrors.push(
      error instanceof Error
        ? error.message
        : "Configured policy threshold is too low for below/exact/above UAT triple.",
    );
  }

  const policyResult: SeedPolicyResult = {
    persistedBeforeSeed: policyBefore.persisted,
    policyCreatedForUat,
    enabled: effectivePolicy.enabled,
    thresholdAmountMinor,
    thresholdCurrency: effectivePolicy.thresholdCurrency,
    policyId: effectivePolicy.id,
  };

  const [financeConfig, yearRows] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: FIN_07D_UAT_SEED_TENANT_ID },
      select: { currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: FIN_07D_UAT_SEED_TENANT_ID },
      orderBy: { startDate: "desc" },
      select: { id: true, startDate: true, endDate: true },
    }),
  ]);
  const targetYearId = resolveFinanceCommitmentSelectedYearId({
    requestedYearId: null,
    years: yearRows,
    currentFinanceYearId: financeConfig?.currentFinanceYearId,
  });
  const year = yearRows.find((row) => row.id === targetYearId) ?? null;
  if (!year) {
    blockingErrors.push("No finance year found for UAT tenant.");
    return { policy: policyResult, rows: [], blockingErrors };
  }

  const amounts = buildFin07dUatAmountsForThreshold(thresholdAmountMinor);
  const commitmentDate = year.startDate.toISOString().slice(0, 10);
  const currency = baseCurrency.toUpperCase();
  const rows: SeedRowResult[] = [];

  for (const spec of FIN_07D_UAT_COMMITMENT_SPECS) {
    const amountMinor = amountForTitle(spec.title, amounts);
    const existing = await db.financeCommitment.findFirst({
      where: { tenantId: FIN_07D_UAT_SEED_TENANT_ID, title: spec.title },
      select: {
        id: true,
        financeYearId: true,
        lifecycleStatus: true,
        approvalStatus: true,
        amountMinor: true,
        currency: true,
      },
    });

    if (existing) {
      if (existing.lifecycleStatus !== "DRAFT") {
        blockingErrors.push(
          `${spec.title} must remain DRAFT for PO UAT (found ${existing.lifecycleStatus}).`,
        );
      }
      if (existing.amountMinor !== amountMinor || existing.currency !== currency) {
        blockingErrors.push(
          `${spec.title} amount/currency mismatch: expected ${amountMinor} ${currency}, got ${existing.amountMinor} ${existing.currency}.`,
        );
      }
      let financeYearId = existing.financeYearId;
      let realignedFinanceYear = false;
      if (existing.financeYearId !== year.id) {
        if (input.execute) {
          await db.financeCommitment.update({
            where: { id: existing.id },
            data: { financeYearId: year.id, commitmentDate: year.startDate },
          });
          financeYearId = year.id;
          realignedFinanceYear = true;
        } else {
          blockingErrors.push(
            `${spec.title} finance year mismatch — re-run with --execute to realign.`,
          );
        }
      }
      rows.push({
        title: spec.title,
        created: false,
        commitmentId: existing.id,
        financeYearId,
        amountMinor: existing.amountMinor,
        currency: existing.currency,
        lifecycleStatus: existing.lifecycleStatus,
        approvalStatus: existing.approvalStatus,
        realignedFinanceYear,
      });
      continue;
    }

    if (!input.execute) {
      rows.push({
        title: spec.title,
        created: false,
        commitmentId: null,
        financeYearId: null,
        amountMinor,
        currency,
        lifecycleStatus: null,
        approvalStatus: null,
        realignedFinanceYear: false,
      });
      continue;
    }

    const created = await createFinanceCommitment(db, ctx, {
      financeYearId: year.id,
      title: spec.title,
      amountMinor,
      currency,
      commitmentDate,
      partyName: spec.partyName,
      description: `UAT data — ${spec.purpose}. Safe to remove after FIN-07D PO UAT.`,
    });
    rows.push({
      title: spec.title,
      created: true,
      commitmentId: created.id,
      financeYearId: year.id,
      amountMinor: created.amountMinor,
      currency: created.currency,
      lifecycleStatus: created.lifecycleStatus,
      approvalStatus: created.approvalStatus,
      realignedFinanceYear: false,
    });
  }

  const unexpectedUatTitles = await db.financeCommitment.findMany({
    where: {
      tenantId: FIN_07D_UAT_SEED_TENANT_ID,
      title: { contains: "UAT — FIN-07D" },
    },
    select: { title: true },
  });
  if (unexpectedUatTitles.length > FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.length) {
    blockingErrors.push(
      `Extra FIN-07D UAT-titled commitments detected (${unexpectedUatTitles.length}).`,
    );
  }

  return { policy: policyResult, rows, blockingErrors };
}

export function evaluateSeedExecuteAllowed(input: {
  execute: boolean;
  confirm: string | null | undefined;
  env: NodeJS.ProcessEnv;
}): { allowed: boolean; reason: string } {
  if (!input.execute) {
    return { allowed: false, reason: "dry-run" };
  }
  const env = input.env;
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  if (runtime.isProd) {
    return { allowed: false, reason: "production blocked" };
  }
  if (runtime.appEnv !== "stage") {
    return { allowed: false, reason: `APP_ENV must be stage (got ${runtime.appEnv})` };
  }
  if (getRuntimeDataEnvironment(env) !== "STAGE") {
    return { allowed: false, reason: "SCE_DATA_ENVIRONMENT must be STAGE" };
  }
  const fp =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ??
    env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase();
  if (fp !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    return { allowed: false, reason: "database fingerprint mismatch" };
  }
  if (input.confirm !== EXECUTE_CONFIRMATION) {
    return { allowed: false, reason: "confirmation phrase mismatch" };
  }
  const authz = env.SCE_OPERATION_AUTHORIZATION?.trim();
  if (authz !== expectedOperationAuthorization(env)) {
    return { allowed: false, reason: "SCE_OPERATION_AUTHORIZATION mismatch" };
  }
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
    return { allowed: false, reason: guard.reason ?? "operational guard blocked" };
  }
  return { allowed: true, reason: "ok" };
}

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

export const FIN_07D_UAT_SEED_META = {
  tenantKey: FIN_07D_UAT_SEED_TENANT_KEY,
  tenantId: FIN_07D_UAT_SEED_TENANT_ID,
  operationId: OPERATION_ID,
} as const;

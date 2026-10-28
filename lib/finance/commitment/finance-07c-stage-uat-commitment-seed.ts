/**
 * FIN-07C — STAGE-only seed for PO UAT approval inbox (fc-allschwil).
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FIN_07C_UAT_CONTROLLED_COMMITMENTS,
  FIN_07C_UAT_SEED_TENANT_ID,
  FIN_07C_UAT_SEED_TENANT_KEY,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";
import {
  createFinanceCommitment,
  submitFinanceCommitment,
} from "@/lib/finance/services/finance-commitment-service";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
} from "@/lib/server/runtime-identity";

export const OPERATION_ID = "finance-07c-stage-uat-commitment-seed";
export const EXECUTE_CONFIRMATION = "SCE-FINANCE-07C-UAT-SEED";

/** Club Admin service user for FC Allschwil STAGE (programme). */
export const FIN_07C_UAT_SEED_ACTOR_USER_ID = "cmsfzrets001bzsf3m46svf5q" as const;

export type SeedExecuteGuardName =
  | "APP_ENV_STAGE"
  | "DATA_ENVIRONMENT_STAGE"
  | "DATABASE_FINGERPRINT_STAGE"
  | "EXECUTE_FLAG_SET"
  | "EXACT_CONFIRMATION"
  | "OPERATION_AUTHORIZATION"
  | "NOT_PRODUCTION";

export type SeedRowResult = {
  title: string;
  created: boolean;
  submitted: boolean;
  realignedFinanceYear: boolean;
  commitmentId: string | null;
  financeYearId: string | null;
  lifecycleStatus: string | null;
  approvalStatus: string | null;
};

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

export function buildSeedAuthContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07C_UAT_SEED_TENANT_ID,
    userId: FIN_07C_UAT_SEED_ACTOR_USER_ID,
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
      PERMISSIONS.FINANCE_COMMITMENT_SUBMIT,
    ]),
  };
}

export async function seedFin07cUatCommitments(
  db: PrismaClient,
  input: { execute: boolean },
): Promise<{ rows: SeedRowResult[]; blockingErrors: string[] }> {
  const blockingErrors: string[] = [];
  const ctx = buildSeedAuthContext();

  const [financeConfig, yearRows] = await Promise.all([
    db.financeConfiguration.findUnique({
      where: { tenantId: FIN_07C_UAT_SEED_TENANT_ID },
      select: { currentFinanceYearId: true },
    }),
    db.financeYear.findMany({
      where: { tenantId: FIN_07C_UAT_SEED_TENANT_ID },
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
    return { rows: [], blockingErrors };
  }

  const commitmentDate = year.startDate.toISOString().slice(0, 10);
  const rows: SeedRowResult[] = [];

  for (const spec of FIN_07C_UAT_CONTROLLED_COMMITMENTS) {
    const existing = await db.financeCommitment.findFirst({
      where: { tenantId: FIN_07C_UAT_SEED_TENANT_ID, title: spec.title },
      select: {
        id: true,
        financeYearId: true,
        lifecycleStatus: true,
        approvalStatus: true,
      },
    });

    if (existing) {
      let financeYearId = existing.financeYearId;
      const lifecycleStatus = existing.lifecycleStatus;
      const approvalStatus = existing.approvalStatus;
      let realignedFinanceYear = false;

      if (existing.financeYearId !== year.id) {
        if (input.execute) {
          await db.financeCommitment.update({
            where: { id: existing.id },
            data: {
              financeYearId: year.id,
              commitmentDate: year.startDate,
            },
          });
          financeYearId = year.id;
          realignedFinanceYear = true;
        } else {
          blockingErrors.push(
            `${spec.title} is bound to finance year ${existing.financeYearId}, expected ${year.id}. Re-run with --execute to realign.`,
          );
        }
      }

      rows.push({
        title: spec.title,
        created: false,
        submitted: lifecycleStatus === "SUBMITTED",
        realignedFinanceYear,
        commitmentId: existing.id,
        financeYearId,
        lifecycleStatus,
        approvalStatus,
      });
      continue;
    }

    if (!input.execute) {
      rows.push({
        title: spec.title,
        created: false,
        submitted: false,
        realignedFinanceYear: false,
        commitmentId: null,
        financeYearId: null,
        lifecycleStatus: null,
        approvalStatus: null,
      });
      continue;
    }

    const created = await createFinanceCommitment(db, ctx, {
      financeYearId: year.id,
      title: spec.title,
      amountMinor: spec.amountMinor,
      currency: spec.currency,
      commitmentDate,
      partyName: spec.partyName,
      description: `UAT data — ${spec.purpose}. Safe to remove after FIN-07C PO UAT.`,
    });
    const submitted = await submitFinanceCommitment(db, ctx, created.id);
    rows.push({
      title: spec.title,
      created: true,
      submitted: true,
      realignedFinanceYear: false,
      commitmentId: submitted.id,
      financeYearId: year.id,
      lifecycleStatus: submitted.lifecycleStatus,
      approvalStatus: submitted.approvalStatus,
    });
  }

  return { rows, blockingErrors };
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
  const runtimeProd = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  if (runtimeProd.isProd) {
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

export const FIN_07C_UAT_SEED_META = {
  tenantKey: FIN_07C_UAT_SEED_TENANT_KEY,
  tenantId: FIN_07C_UAT_SEED_TENANT_ID,
  operationId: OPERATION_ID,
} as const;

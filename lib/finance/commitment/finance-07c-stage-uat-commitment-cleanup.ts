/**
 * FIN-07C — STAGE-only controlled removal of PO UAT finance commitments (approval inbox session).
 * Fail-closed: designated STAGE fingerprint, fc-allschwil, exact ledger IDs + titles.
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import { getRuntimeEnvironment } from "@/lib/env";
import {
  FINANCE_COMMITMENT_AUDIT_MODEL,
  FINANCE_COMMITMENT_PERSISTENCE_MODEL,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import {
  FIN_07C_UAT_CLEANUP_TENANT_ID,
  FIN_07C_UAT_CLEANUP_TENANT_KEY,
  FIN_07C_UAT_CONTROLLED_COMMITMENTS,
  FIN_07C_UAT_CONTROLLED_COMMITMENT_IDS,
  FIN_07C_UAT_CONTROLLED_COMMITMENT_TITLES,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-cleanup-ledger";
import { evaluateOperationalMutationGuard } from "@/lib/server/operational-database-guard";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";

export const OPERATION_ID = "finance-07c-stage-uat-commitment-cleanup";
export const EXECUTE_CONFIRMATION = "SCE-FINANCE-07C-UAT-CLEANUP";

export type CleanupExecuteGuardName =
  | "APP_ENV_STAGE"
  | "DATA_ENVIRONMENT_STAGE"
  | "DATABASE_FINGERPRINT_STAGE"
  | "EXECUTE_FLAG_SET"
  | "EXACT_CONFIRMATION"
  | "OPERATION_AUTHORIZATION"
  | "NOT_PRODUCTION";

export type GuardStatus = "PASS" | "FAIL" | "NOT_EVALUATED";

export type CleanupExecuteGuardResult = {
  gate: CleanupExecuteGuardName;
  status: GuardStatus;
  detail: string;
};

export type CleanupExecuteInput = {
  execute: boolean;
  confirm: string | null | undefined;
  env: NodeJS.ProcessEnv;
  databaseUrl: string | undefined;
};

export type UatCommitmentInventoryRow = {
  ledgerTitle: string;
  found: boolean;
  id: string;
  title: string | null;
  lifecycleStatus: string | null;
  approvalStatus: string | null;
  economicObligationKey: string | null;
  createdAt: Date | null;
  approvalDecisionCount: number;
  evidenceLinkIds: string[];
  expectedEventIds: string[];
  auditLogIds: string[];
};

export type CleanupInventory = {
  tenantKey: string;
  tenantId: string;
  databaseFingerprint: string | null;
  uatRows: UatCommitmentInventoryRow[];
  tenantCommitmentCount: number;
  blockingErrors: string[];
};

export type CleanupExecuteResult = {
  commitmentsRemoved: number;
  testOnlyApprovalDecisionsRemoved: number;
  testOnlyAuditRowsRemoved: number;
  testOnlyEvidenceLinksRemoved: number;
  testOnlyExpectedEventsRemoved: number;
};

export function expectedOperationAuthorization(env: NodeJS.ProcessEnv): string {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  return `${OPERATION_ID}:${runtime.appEnv}`;
}

export function evaluateCleanupExecuteGuards(
  input: CleanupExecuteInput,
): CleanupExecuteGuardResult[] {
  const env = input.env;
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  const identity = resolveRuntimeIdentity(env);
  const effectiveFingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ?? null;
  const configuredFingerprint =
    env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase() || null;
  const dataEnv = getRuntimeDataEnvironment(env);

  const notEvaluated = (
    gate: CleanupExecuteGuardName,
    detail: string,
  ): CleanupExecuteGuardResult => ({
    gate,
    status: "NOT_EVALUATED",
    detail,
  });

  if (!input.execute) {
    return [
      notEvaluated("EXECUTE_FLAG_SET", "dry-run mode"),
      notEvaluated("EXACT_CONFIRMATION", "dry-run mode"),
      notEvaluated("OPERATION_AUTHORIZATION", "dry-run mode"),
    ];
  }

  const results: CleanupExecuteGuardResult[] = [
    {
      gate: "EXECUTE_FLAG_SET",
      status: "PASS",
      detail: "--execute present",
    },
    {
      gate: "EXACT_CONFIRMATION",
      status:
        input.confirm?.trim() === EXECUTE_CONFIRMATION ? "PASS" : "FAIL",
      detail:
        input.confirm?.trim() === EXECUTE_CONFIRMATION
          ? "confirmation token matches"
          : `expected --confirm ${EXECUTE_CONFIRMATION}`,
    },
    {
      gate: "APP_ENV_STAGE",
      status: runtime.isStage ? "PASS" : "FAIL",
      detail: `APP_ENV=${runtime.appEnv}`,
    },
    {
      gate: "NOT_PRODUCTION",
      status: runtime.isProd ? "FAIL" : "PASS",
      detail: runtime.isProd ? "production deployment blocked" : "not production",
    },
    {
      gate: "DATA_ENVIRONMENT_STAGE",
      status: dataEnv === "STAGE" ? "PASS" : "FAIL",
      detail: `SCE_DATA_ENVIRONMENT=${dataEnv}`,
    },
    {
      gate: "DATABASE_FINGERPRINT_STAGE",
      status:
        effectiveFingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
        configuredFingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT &&
        identity.databaseFingerprintMatchesConfiguredTarget
          ? "PASS"
          : "FAIL",
      detail: `effective=${effectiveFingerprint ?? "null"} expected=${STAGE_CANONICAL_DATABASE_FINGERPRINT}`,
    },
  ];

  const mutationGuard = evaluateOperationalMutationGuard(
    {
      operationId: OPERATION_ID,
      databaseUrl: input.databaseUrl,
      explicitIntent: true,
      allowedRemoteEnvironments: ["stage"],
    },
    env,
  );
  results.push({
    gate: "OPERATION_AUTHORIZATION",
    status: mutationGuard.allowed ? "PASS" : "FAIL",
    detail: mutationGuard.allowed
      ? expectedOperationAuthorization(env)
      : mutationGuard.reason,
  });

  return results;
}

export function assertCleanupExecuteGuards(input: CleanupExecuteInput): void {
  const failures = evaluateCleanupExecuteGuards(input).filter((r) => r.status === "FAIL");
  if (failures.length > 0) {
    throw new Error(
      `Execute guards failed: ${failures.map((f) => `${f.gate}: ${f.detail}`).join("; ")}`,
    );
  }
}

export function assertCleanupStageIdentityReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    APP_ENV: env.APP_ENV ?? "local",
  });
  if (!runtime.isStage) {
    throw new Error(
      `STAGE identity required: APP_ENV must be "stage" (got ${runtime.appEnv}).`,
    );
  }
  if (getRuntimeDataEnvironment(env) !== "STAGE") {
    throw new Error("SCE_DATA_ENVIRONMENT must be STAGE.");
  }
  const fp = getDatabaseFingerprintFromEffectivePrismaSource(env);
  if (fp?.toLowerCase() !== STAGE_CANONICAL_DATABASE_FINGERPRINT) {
    throw new Error(
      `STAGE database fingerprint mismatch: got ${fp ?? "null"}, expected ${STAGE_CANONICAL_DATABASE_FINGERPRINT}.`,
    );
  }
}

function isSameUtcDate(date: Date, isoDate: string): boolean {
  return date.toISOString().slice(0, 10) === isoDate;
}

export async function collectUatCommitmentCleanupInventory(
  db: Pick<
    PrismaClient,
    | "tenant"
    | "financeCommitment"
    | "financeCommitmentApprovalDecision"
    | "financeEconomicEvidenceLink"
    | "financeExpectedFinancialEvent"
    | "auditLog"
  >,
): Promise<CleanupInventory> {
  const blockingErrors: string[] = [];
  const databaseFingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(process.env)?.toLowerCase() ?? null;

  const tenant = await db.tenant.findUnique({
    where: { key: FIN_07C_UAT_CLEANUP_TENANT_KEY },
    select: { id: true, key: true },
  });
  if (!tenant) {
    blockingErrors.push(`Tenant ${FIN_07C_UAT_CLEANUP_TENANT_KEY} not found.`);
  } else if (tenant.id !== FIN_07C_UAT_CLEANUP_TENANT_ID) {
    blockingErrors.push(
      `Tenant id mismatch: expected ${FIN_07C_UAT_CLEANUP_TENANT_ID}, got ${tenant.id}.`,
    );
  }

  const tenantId = tenant?.id ?? FIN_07C_UAT_CLEANUP_TENANT_ID;
  const tenantCommitmentCount = await db.financeCommitment.count({
    where: { tenantId },
  });

  const titleMatches = await db.financeCommitment.findMany({
    where: {
      tenantId,
      title: { in: [...FIN_07C_UAT_CONTROLLED_COMMITMENT_TITLES] },
    },
    select: { id: true, title: true },
  });
  if (titleMatches.length > FIN_07C_UAT_CONTROLLED_COMMITMENTS.length) {
    blockingErrors.push(
      `Refusing cleanup: found ${titleMatches.length} FIN-07C UAT-titled commitments; ledger allows ${FIN_07C_UAT_CONTROLLED_COMMITMENTS.length}.`,
    );
  }
  const allowedIds = new Set<string>(FIN_07C_UAT_CONTROLLED_COMMITMENT_IDS);
  for (const match of titleMatches) {
    if (!allowedIds.has(match.id)) {
      blockingErrors.push(
        `Unexpected FIN-07C UAT title on commitment ${match.id} ("${match.title}").`,
      );
    }
  }

  const uatRows: UatCommitmentInventoryRow[] = [];

  for (const ledger of FIN_07C_UAT_CONTROLLED_COMMITMENTS) {
    const row = await db.financeCommitment.findFirst({
      where: { id: ledger.id, tenantId },
      select: {
        id: true,
        title: true,
        lifecycleStatus: true,
        approvalStatus: true,
        economicObligationKey: true,
        createdAt: true,
      },
    });

    if (!row) {
      uatRows.push({
        ledgerTitle: ledger.title,
        found: false,
        id: ledger.id,
        title: null,
        lifecycleStatus: null,
        approvalStatus: null,
        economicObligationKey: null,
        createdAt: null,
        approvalDecisionCount: 0,
        evidenceLinkIds: [],
        expectedEventIds: [],
        auditLogIds: [],
      });
      continue;
    }

    if (row.title !== ledger.title) {
      blockingErrors.push(
        `Commitment ${ledger.id} title mismatch: ledger "${ledger.title}" vs db "${row.title}".`,
      );
    }
    if (!isSameUtcDate(row.createdAt, ledger.uatSessionDateIso)) {
      blockingErrors.push(
        `Commitment ${ledger.id} createdAt ${row.createdAt.toISOString()} is outside UAT session ${ledger.uatSessionDateIso}.`,
      );
    }

    const approvalDecisionCount = await db.financeCommitmentApprovalDecision.count({
      where: { commitmentId: row.id, tenantId },
    });

    const evidenceLinks = await db.financeEconomicEvidenceLink.findMany({
      where: {
        tenantId,
        evidenceRefType: FINANCE_COMMITMENT_PERSISTENCE_MODEL.commitment,
        evidenceRefId: row.id,
      },
      select: { id: true, evidenceKind: true, economicObligationKey: true },
    });

    for (const link of evidenceLinks) {
      if (link.evidenceKind !== "COMMITMENT") {
        blockingErrors.push(
          `Unexpected evidence kind on link ${link.id} for commitment ${row.id}.`,
        );
      }
      if (link.economicObligationKey !== row.economicObligationKey) {
        blockingErrors.push(
          `Evidence link ${link.id} obligation key mismatch for commitment ${row.id}.`,
        );
      }
    }

    const expectedEvents = await db.financeExpectedFinancialEvent.findMany({
      where: {
        tenantId,
        sourceKind: "COMMITMENT",
        sourceRefId: row.id,
      },
      select: { id: true },
    });

    const auditLogs = await db.auditLog.findMany({
      where: {
        tenantId,
        moduleKey: FINANCE_COMMITMENT_AUDIT_MODEL.moduleKey,
        entityType: FINANCE_COMMITMENT_AUDIT_MODEL.commitmentEntityType,
        entityId: row.id,
      },
      select: { id: true, action: true },
    });

    uatRows.push({
      ledgerTitle: ledger.title,
      found: true,
      id: row.id,
      title: row.title,
      lifecycleStatus: row.lifecycleStatus,
      approvalStatus: row.approvalStatus,
      economicObligationKey: row.economicObligationKey,
      createdAt: row.createdAt,
      approvalDecisionCount,
      evidenceLinkIds: evidenceLinks.map((l) => l.id),
      expectedEventIds: expectedEvents.map((e) => e.id),
      auditLogIds: auditLogs.map((a) => a.id),
    });
  }

  return {
    tenantKey: FIN_07C_UAT_CLEANUP_TENANT_KEY,
    tenantId,
    databaseFingerprint,
    uatRows,
    tenantCommitmentCount,
    blockingErrors,
  };
}

export function inventoryHasDeletableUatTargets(inventory: CleanupInventory): boolean {
  return inventory.uatRows.some((row) => row.found);
}

export async function executeUatCommitmentCleanupTransaction(
  db: PrismaClient,
  inventory: CleanupInventory,
): Promise<CleanupExecuteResult> {
  if (inventory.blockingErrors.length > 0) {
    throw new Error(inventory.blockingErrors.join(" "));
  }
  const targets = inventory.uatRows.filter((row) => row.found);
  if (targets.length === 0) {
    return {
      commitmentsRemoved: 0,
      testOnlyApprovalDecisionsRemoved: 0,
      testOnlyAuditRowsRemoved: 0,
      testOnlyEvidenceLinksRemoved: 0,
      testOnlyExpectedEventsRemoved: 0,
    };
  }

  const commitmentIds = targets.map((t) => t.id);
  const auditLogIds = targets.flatMap((t) => t.auditLogIds);
  const evidenceLinkIds = targets.flatMap((t) => t.evidenceLinkIds);
  const expectedEventIds = targets.flatMap((t) => t.expectedEventIds);
  const approvalDecisionIds: string[] = [];
  for (const target of targets) {
    if (target.approvalDecisionCount > 0) {
      const rows = await db.financeCommitmentApprovalDecision.findMany({
        where: { commitmentId: target.id, tenantId: inventory.tenantId },
        select: { id: true },
      });
      approvalDecisionIds.push(...rows.map((r) => r.id));
    }
  }

  await db.$transaction(async (tx) => {
    if (auditLogIds.length > 0) {
      await tx.auditLog.deleteMany({ where: { id: { in: auditLogIds } } });
    }
    if (approvalDecisionIds.length > 0) {
      await tx.financeCommitmentApprovalDecision.deleteMany({
        where: { id: { in: approvalDecisionIds } },
      });
    }
    if (expectedEventIds.length > 0) {
      await tx.financeExpectedFinancialEvent.deleteMany({
        where: { id: { in: expectedEventIds } },
      });
    }
    if (evidenceLinkIds.length > 0) {
      await tx.financeEconomicEvidenceLink.deleteMany({
        where: { id: { in: evidenceLinkIds } },
      });
    }
    await tx.financeCommitment.deleteMany({
      where: {
        tenantId: inventory.tenantId,
        id: { in: commitmentIds },
      },
    });

    const remainingUat = await tx.financeCommitment.count({
      where: {
        tenantId: inventory.tenantId,
        id: { in: [...FIN_07C_UAT_CONTROLLED_COMMITMENT_IDS] },
      },
    });
    if (remainingUat !== 0) {
      throw new Error(`Post-delete verification failed: ${remainingUat} ledger commitments remain.`);
    }

    const orphanLinks = await tx.financeEconomicEvidenceLink.count({
      where: {
        tenantId: inventory.tenantId,
        evidenceRefType: FINANCE_COMMITMENT_PERSISTENCE_MODEL.commitment,
        evidenceRefId: { in: commitmentIds },
      },
    });
    if (orphanLinks !== 0) {
      throw new Error(`Orphan evidence links remain: ${orphanLinks}.`);
    }

    const orphanExpected = await tx.financeExpectedFinancialEvent.count({
      where: {
        tenantId: inventory.tenantId,
        sourceKind: "COMMITMENT",
        sourceRefId: { in: commitmentIds },
      },
    });
    if (orphanExpected !== 0) {
      throw new Error(`Orphan expected financial events remain: ${orphanExpected}.`);
    }
  });

  return {
    commitmentsRemoved: commitmentIds.length,
    testOnlyApprovalDecisionsRemoved: approvalDecisionIds.length,
    testOnlyAuditRowsRemoved: auditLogIds.length,
    testOnlyEvidenceLinksRemoved: evidenceLinkIds.length,
    testOnlyExpectedEventsRemoved: expectedEventIds.length,
  };
}

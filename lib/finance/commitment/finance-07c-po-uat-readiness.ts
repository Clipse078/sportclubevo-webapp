/**
 * FIN-07C — fail-closed PO UAT readiness against the same queries as the product UI.
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FIN_07C_UAT_CONTROLLED_COMMITMENTS,
  FIN_07C_UAT_SEED_TENANT_ID,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";
import {
  loadFinanceCommitmentApprovalInboxSnapshot,
  loadFinanceCommitmentWorkspaceSnapshot,
} from "@/lib/finance/services/finance-commitment-query-service";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";

export const FIN_07C_PO_UAT_APPROVER_PERMISSIONS = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
] as const;

export type Fin07cPoUatReadinessCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type Fin07cPoUatReadinessReport = {
  ready: boolean;
  previewRuntimeCompatible: boolean;
  previewDataTargetVerified: boolean;
  uatRecordsVisibleToWorkspace: boolean;
  uatRecordsVisibleToApprovalInbox: boolean;
  tenantId: string;
  selectedFinanceYearId: string | null;
  databaseFingerprint: string | null;
  dataEnvironment: string;
  checks: Fin07cPoUatReadinessCheck[];
};

function buildApproverContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07C_UAT_SEED_TENANT_ID,
    userId: "finance-07c-po-uat-readiness",
    permissionKeys: new Set(FIN_07C_PO_UAT_APPROVER_PERMISSIONS),
  };
}

export async function verifyFin07cPoUatReadiness(
  db: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Fin07cPoUatReadinessReport> {
  const checks: Fin07cPoUatReadinessCheck[] = [];
  const identity = resolveRuntimeIdentity(env);
  const dataEnvironment = getRuntimeDataEnvironment(env);
  const fingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ?? null;

  const stageDataTarget =
    dataEnvironment === "STAGE" &&
    fingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT.toLowerCase();
  checks.push({
    id: "STAGE_DATA_TARGET",
    pass: stageDataTarget,
    detail: `dataEnvironment=${dataEnvironment} fingerprint=${fingerprint ?? "null"}`,
  });

  const previewRuntimeCompatible =
    identity.deploymentEnvironment === "PREVIEW" ||
    identity.deploymentEnvironment === "STAGE" ||
    stageDataTarget;
  checks.push({
    id: "PREVIEW_RUNTIME_COMPATIBLE",
    pass: previewRuntimeCompatible,
    detail: `deployment=${identity.deploymentEnvironment} vercel=${identity.vercelEnvironment ?? "null"}`,
  });

  const [setup, yearsRows] = await Promise.all([
    loadFinanceSetupSnapshot(db as never, buildApproverContext()),
    db.financeYear.findMany({
      where: { tenantId: FIN_07C_UAT_SEED_TENANT_ID },
      orderBy: { startDate: "desc" },
      select: { id: true },
    }),
  ]);
  const selectedFinanceYearId = resolveFinanceCommitmentSelectedYearId({
    requestedYearId: null,
    years: yearsRows,
    currentFinanceYearId: setup.configuration?.currentFinanceYearId,
  });

  const uatTitles = FIN_07C_UAT_CONTROLLED_COMMITMENTS.map((row) => row.title);
  const uatRows = await db.financeCommitment.findMany({
    where: { tenantId: FIN_07C_UAT_SEED_TENANT_ID, title: { in: uatTitles } },
    select: {
      id: true,
      title: true,
      financeYearId: true,
      lifecycleStatus: true,
      approvalStatus: true,
    },
  });

  const uatInSelectedYear = uatRows.filter(
    (row) =>
      row.financeYearId === selectedFinanceYearId &&
      row.lifecycleStatus === "SUBMITTED" &&
      row.approvalStatus === "PENDING",
  );
  checks.push({
    id: "UAT_ROWS_IN_SELECTED_YEAR",
    pass: uatInSelectedYear.length === uatTitles.length,
    detail: `selectedYear=${selectedFinanceYearId ?? "null"} matched=${uatInSelectedYear.length}/${uatTitles.length}`,
  });

  const ctx = buildApproverContext();
  const workspace = await loadFinanceCommitmentWorkspaceSnapshot(db, ctx, {});
  const inbox = await loadFinanceCommitmentApprovalInboxSnapshot(db, ctx, {});

  const workspaceTitles = new Set(workspace.items.map((item) => item.title));
  const uatVisibleInWorkspace = uatTitles.every((title) => workspaceTitles.has(title));
  checks.push({
    id: "WORKSPACE_LIST_INCLUDES_UAT",
    pass: uatVisibleInWorkspace,
    detail: `submittedPending=${workspace.summary.submittedPendingCount} listed=${workspace.items.length}`,
  });

  const inboxTitles = new Set(inbox.pendingItems.map((item) => item.title));
  const uatVisibleInInbox = uatTitles.every((title) => inboxTitles.has(title));
  checks.push({
    id: "INBOX_INCLUDES_UAT",
    pass: inbox.pendingCount >= uatTitles.length && uatVisibleInInbox,
    detail: `pendingCount=${inbox.pendingCount}`,
  });

  checks.push({
    id: "DISCOVERY_PENDING_COUNT",
    pass: workspace.summary.submittedPendingCount >= uatTitles.length,
    detail: `submittedPendingCount=${workspace.summary.submittedPendingCount}`,
  });

  const previewDataTargetVerified = stageDataTarget;
  const uatRecordsVisibleToWorkspace =
    uatInSelectedYear.length === uatTitles.length && uatVisibleInWorkspace;
  const uatRecordsVisibleToApprovalInbox =
    inbox.pendingCount >= uatTitles.length && uatVisibleInInbox;

  const ready =
    previewRuntimeCompatible &&
    previewDataTargetVerified &&
    uatRecordsVisibleToWorkspace &&
    uatRecordsVisibleToApprovalInbox &&
    checks.every((check) => check.pass);

  return {
    ready,
    previewRuntimeCompatible,
    previewDataTargetVerified,
    uatRecordsVisibleToWorkspace,
    uatRecordsVisibleToApprovalInbox,
    tenantId: FIN_07C_UAT_SEED_TENANT_ID,
    selectedFinanceYearId,
    databaseFingerprint: fingerprint,
    dataEnvironment,
    checks,
  };
}

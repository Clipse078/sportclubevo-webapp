/**
 * FIN-07D — fail-closed PO UAT post-submit verification (read-only).
 * Proves functional submit-time behaviour after Product Owner submits the three UAT records.
 */

import type { PrismaClient } from "@prisma/client";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  evaluateFinanceCommitmentApprovalRequirement,
  normalizeFinanceCommitmentApprovalPolicySnapshot,
  resolveSubmitApprovalStatus,
} from "@/lib/finance/commitment/finance-commitment-approval-policy-evaluation";
import {
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES,
  FIN_07D_UAT_SEED_TENANT_ID,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";
import {
  getFinanceCommitmentDetail,
  loadFinanceCommitmentApprovalInboxSnapshot,
  loadFinanceCommitmentWorkspaceSnapshot,
} from "@/lib/finance/services/finance-commitment-query-service";
import { loadFinanceCommitmentApprovalPolicyReadModel } from "@/lib/finance/services/finance-commitment-approval-policy-service";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";

export const FIN_07D_PO_UAT_APPROVER_PERMISSIONS = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
] as const;

export const FIN_07D_PO_UAT_MANAGE_PERMISSIONS = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
] as const;

export type Fin07dPoUatPostSubmitFlag = {
  key: string;
  value: "YES" | "NO";
  detail: string;
};

export type Fin07dPoUatPostSubmitReport = {
  pass: boolean;
  awaitingPoSubmit: boolean;
  flags: Fin07dPoUatPostSubmitFlag[];
  tenantId: string;
  selectedFinanceYearId: string | null;
  selectedFinanceYearName: string | null;
  databaseFingerprint: string | null;
  dataEnvironment: string;
  productionTouched: "NO" | "YES";
  pendingApprovalUatCount: number;
};

function buildApproverContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    userId: "finance-07d-po-uat-post-submit",
    permissionKeys: new Set(FIN_07D_PO_UAT_APPROVER_PERMISSIONS),
  };
}

function buildManageContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    userId: "finance-07d-po-uat-post-submit",
    permissionKeys: new Set(FIN_07D_PO_UAT_MANAGE_PERMISSIONS),
  };
}

function flag(key: string, pass: boolean, detail: string): Fin07dPoUatPostSubmitFlag {
  return { key, value: pass ? "YES" : "NO", detail };
}

type UatCommitmentRow = {
  id: string;
  title: string;
  tenantId: string;
  financeYearId: string;
  lifecycleStatus: string;
  approvalStatus: string | null;
  amountMinor: number;
  currency: string;
  approvalPolicyEnabledSnapshot: boolean | null;
  approvalThresholdMinorSnapshot: number | null;
  approvalPolicyCurrencySnapshot: string | null;
  submittedAt: Date | null;
};

function snapshotPolicyFromRow(row: UatCommitmentRow) {
  const currencySnapshot = row.approvalPolicyCurrencySnapshot?.trim();
  const hasSnapshot =
    row.approvalPolicyEnabledSnapshot != null &&
    row.approvalThresholdMinorSnapshot != null &&
    Boolean(currencySnapshot);
  return normalizeFinanceCommitmentApprovalPolicySnapshot(
    hasSnapshot
      ? {
          enabled: row.approvalPolicyEnabledSnapshot!,
          thresholdAmountMinor: row.approvalThresholdMinorSnapshot!,
          thresholdCurrency: currencySnapshot!,
        }
      : null,
    row.currency,
  );
}

function expectedApprovalFromSnapshot(row: UatCommitmentRow): "PENDING" | "NOT_REQUIRED" {
  const evaluation = evaluateFinanceCommitmentApprovalRequirement({
    policy: snapshotPolicyFromRow(row),
    amountMinor: row.amountMinor,
    currency: row.currency,
  });
  return resolveSubmitApprovalStatus(evaluation);
}

export async function verifyFin07dPoUatPostSubmit(
  db: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Fin07dPoUatPostSubmitReport> {
  const flags: Fin07dPoUatPostSubmitFlag[] = [];
  const identity = resolveRuntimeIdentity(env);
  const dataEnvironment = getRuntimeDataEnvironment(env);
  const fingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(env)?.toLowerCase() ?? null;

  const stageDataTarget =
    dataEnvironment === "STAGE" &&
    fingerprint === STAGE_CANONICAL_DATABASE_FINGERPRINT.toLowerCase();
  flags.push(
    flag(
      "STAGE_DATA_TARGET",
      stageDataTarget,
      `dataEnvironment=${dataEnvironment} fingerprint=${fingerprint ?? "null"}`,
    ),
  );

  const productionTouched =
    dataEnvironment === "PRODUCTION" || identity.deploymentEnvironment === "PRODUCTION"
      ? "YES"
      : "NO";
  flags.push({
    key: "PRODUCTION_TOUCHED",
    value: productionTouched,
    detail: productionTouched === "NO" ? "STAGE-only UAT path" : "production data environment detected",
  });

  const tenant = await db.tenant.findUnique({
    where: { id: FIN_07D_UAT_SEED_TENANT_ID },
    select: { id: true, key: true },
  });
  flags.push(
    flag(
      "UAT_RECORDS_TENANT_SCOPED",
      tenant?.key === "fc-allschwil" && tenant.id === FIN_07D_UAT_SEED_TENANT_ID,
      `tenant=${tenant?.key ?? "null"} id=${tenant?.id ?? "null"}`,
    ),
  );

  const manageCtx = buildManageContext();
  const approverCtx = buildApproverContext();

  const [setup, yearsRows, livePolicy] = await Promise.all([
    loadFinanceSetupSnapshot(db as never, manageCtx),
    db.financeYear.findMany({
      where: { tenantId: FIN_07D_UAT_SEED_TENANT_ID },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, startDate: true },
    }),
    loadFinanceCommitmentApprovalPolicyReadModel(db, manageCtx),
  ]);

  const selectedFinanceYearId = resolveFinanceCommitmentSelectedYearId({
    requestedYearId: null,
    years: yearsRows,
    currentFinanceYearId: setup.configuration?.currentFinanceYearId,
  });
  const selectedYear = yearsRows.find((y) => y.id === selectedFinanceYearId) ?? null;
  const selectedFinanceYearName = selectedYear?.name ?? null;

  flags.push(
    flag(
      "UAT_FINANCE_YEAR_2026_CONTEXT",
      Boolean(selectedFinanceYearName?.includes("2026")),
      `selectedYear=${selectedFinanceYearName ?? "null"} id=${selectedFinanceYearId ?? "null"}`,
    ),
  );

  const uatRows = (await db.financeCommitment.findMany({
    where: {
      tenantId: FIN_07D_UAT_SEED_TENANT_ID,
      title: { in: [...FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES] },
    },
    select: {
      id: true,
      title: true,
      tenantId: true,
      financeYearId: true,
      lifecycleStatus: true,
      approvalStatus: true,
      amountMinor: true,
      currency: true,
      approvalPolicyEnabledSnapshot: true,
      approvalThresholdMinorSnapshot: true,
      approvalPolicyCurrencySnapshot: true,
      submittedAt: true,
    },
  })) as UatCommitmentRow[];

  const byTitle = new Map(uatRows.map((row) => [row.title, row]));
  const below = byTitle.get(FIN_07D_UAT_BELOW_THRESHOLD_TITLE);
  const exact = byTitle.get(FIN_07D_UAT_EXACT_THRESHOLD_TITLE);
  const above = byTitle.get(FIN_07D_UAT_ABOVE_THRESHOLD_TITLE);

  const allPresent =
    uatRows.length === FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.length &&
    below &&
    exact &&
    above;
  flags.push(
    flag(
      "UAT_TRIPLE_PRESENT",
      Boolean(allPresent),
      `found=${uatRows.length}/3`,
    ),
  );

  const awaitingPoSubmit = Boolean(
    below?.lifecycleStatus === "DRAFT" ||
      exact?.lifecycleStatus === "DRAFT" ||
      above?.lifecycleStatus === "DRAFT",
  );
  flags.push(
    flag(
      "PO_SUBMIT_COMPLETE",
      !awaitingPoSubmit && Boolean(allPresent),
      awaitingPoSubmit ? "one or more UAT records still DRAFT" : "all three submitted",
    ),
  );

  const inbox = await loadFinanceCommitmentApprovalInboxSnapshot(db, approverCtx, {});
  const workspace = await loadFinanceCommitmentWorkspaceSnapshot(db, manageCtx, {});
  const inboxIds = new Set(inbox.pendingItems.map((item) => item.id));
  const inboxTitles = new Set(inbox.pendingItems.map((item) => item.title));

  function assertUatRow(
    prefix: string,
    row: UatCommitmentRow | undefined,
    expectedApproval: "PENDING" | "NOT_REQUIRED",
    expectedInInbox: boolean,
  ) {
    const lifecycleOk = row?.lifecycleStatus === "SUBMITTED";
    flags.push(
      flag(`${prefix}_LIFECYCLE`, lifecycleOk, row?.lifecycleStatus ?? "missing"),
    );
    flags.push(
      flag(
        `${prefix}_APPROVAL`,
        row?.approvalStatus === expectedApproval,
        row?.approvalStatus ?? "missing",
      ),
    );
    const inInbox = row ? inboxIds.has(row.id) : false;
    flags.push(
      flag(
        `${prefix}_IN_APPROVAL_INBOX`,
        row ? inInbox === expectedInInbox : false,
        row ? (inInbox ? "YES" : "NO") : "missing",
      ),
    );
  }

  assertUatRow("FIN_07D_BELOW", below, "NOT_REQUIRED", false);
  assertUatRow("FIN_07D_EXACT", exact, "PENDING", true);
  assertUatRow("FIN_07D_ABOVE", above, "PENDING", true);

  const pendingUatCount = uatRows.filter((row) => row.approvalStatus === "PENDING").length;
  flags.push(
    flag(
      "PENDING_APPROVAL_UAT_COUNT",
      pendingUatCount === 2,
      String(pendingUatCount),
    ),
  );

  const uatPendingInInbox = [exact, above].filter(
    (row) => row && inboxTitles.has(row.title),
  ).length;
  flags.push(
    flag(
      "INBOX_DERIVED_FROM_PENDING_STATUS",
      uatPendingInInbox === 2 && !inboxTitles.has(FIN_07D_UAT_BELOW_THRESHOLD_TITLE),
      `uatPendingInInbox=${uatPendingInInbox} inboxPendingTotal=${inbox.pendingCount}`,
    ),
  );

  flags.push(
    flag(
      "WORKSPACE_ZUR_PRUEFUNG_COUNT",
      workspace.summary.submittedPendingCount >= 2,
      `submittedPendingCount=${workspace.summary.submittedPendingCount}`,
    ),
  );

  const yearAligned =
    Boolean(allPresent) &&
    uatRows.every(
      (row) =>
        row.financeYearId === selectedFinanceYearId && row.tenantId === FIN_07D_UAT_SEED_TENANT_ID,
    );
  flags.push(
    flag(
      "ALL_UAT_RECORDS_FINANCE_YEAR_MATCH_WORKSPACE",
      yearAligned,
      `selectedYear=${selectedFinanceYearId ?? "null"}`,
    ),
  );

  for (const row of uatRows) {
    if (row.lifecycleStatus !== "SUBMITTED") continue;
    const snapshotComplete =
      row.approvalPolicyEnabledSnapshot != null &&
      row.approvalThresholdMinorSnapshot != null &&
      Boolean(row.approvalPolicyCurrencySnapshot?.trim()) &&
      row.submittedAt != null;
    flags.push(
      flag(
        `SNAPSHOT_PRESENT_${row.title}`,
        snapshotComplete,
        `enabled=${row.approvalPolicyEnabledSnapshot} threshold=${row.approvalThresholdMinorSnapshot}`,
      ),
    );

    const fromSnapshot = expectedApprovalFromSnapshot(row);
    flags.push(
      flag(
        `SNAPSHOT_POLICY_MATCHES_STATUS_${row.title}`,
        row.approvalStatus === fromSnapshot,
        `stored=${row.approvalStatus} snapshotEval=${fromSnapshot}`,
      ),
    );

    const detail = await getFinanceCommitmentDetail(db, manageCtx, row.id);
    const explainOk =
      detail.approvalExplanation != null &&
      detail.approvalExplanation.isDraftPreview === false &&
      detail.approvalExplanation.approvalRequired === (row.approvalStatus === "PENDING");
    flags.push(
      flag(
        `DETAIL_EXPLANATION_FROM_SNAPSHOT_${row.title}`,
        explainOk,
        detail.approvalExplanation?.kind ?? "null",
      ),
    );
  }

  if (exact && above && exact.lifecycleStatus === "SUBMITTED" && above.lifecycleStatus === "SUBMITTED") {
    const sameThreshold =
      exact.approvalThresholdMinorSnapshot === above.approvalThresholdMinorSnapshot &&
      exact.approvalPolicyCurrencySnapshot === above.approvalPolicyCurrencySnapshot;
    flags.push(
      flag(
        "EXACT_AND_ABOVE_SAME_SNAPSHOTTED_THRESHOLD",
        sameThreshold,
        `exact=${exact.approvalThresholdMinorSnapshot} above=${above.approvalThresholdMinorSnapshot}`,
      ),
    );
  }

  if (below && below.lifecycleStatus === "SUBMITTED") {
    const belowDetail = await getFinanceCommitmentDetail(db, manageCtx, below.id);
    flags.push(
      flag(
        "BELOW_RECORDS_NOT_REQUIRED_FROM_SNAPSHOT",
        expectedApprovalFromSnapshot(below) === "NOT_REQUIRED" &&
          belowDetail.approvalExplanation?.kind === "NOT_REQUIRED_BELOW_THRESHOLD",
        belowDetail.approvalExplanation?.kind ?? "missing",
      ),
    );
  }

  if (exact && exact.lifecycleStatus === "SUBMITTED") {
    const exactDetail = await getFinanceCommitmentDetail(db, manageCtx, exact.id);
    flags.push(
      flag(
        "EXACT_INCLUSIVE_THRESHOLD_EXPLAINED",
        exactDetail.approvalExplanation?.kind === "REQUIRED_AT_OR_ABOVE_THRESHOLD",
        exactDetail.approvalExplanation?.kind ?? "missing",
      ),
    );
  }

  // Historical immutability: stored status must follow submit-time snapshot, not live tenant policy.
  for (const row of uatRows) {
    if (row.lifecycleStatus !== "SUBMITTED") continue;
    const liveEval = evaluateFinanceCommitmentApprovalRequirement({
      policy: {
        enabled: livePolicy.enabled,
        thresholdAmountMinor: livePolicy.thresholdAmountMinor,
        thresholdCurrency: livePolicy.thresholdCurrency,
      },
      amountMinor: row.amountMinor,
      currency: row.currency,
    });
    const liveStatus = resolveSubmitApprovalStatus(liveEval);
    const snapshotStatus = expectedApprovalFromSnapshot(row);
    flags.push(
      flag(
        `HISTORICAL_STATUS_IMMUTABLE_${row.title}`,
        row.approvalStatus === snapshotStatus,
        liveStatus !== row.approvalStatus
          ? `stored=${row.approvalStatus} liveWouldBe=${liveStatus} (snapshot governs)`
          : `stored=${row.approvalStatus} matches snapshot and live`,
      ),
    );
  }

  const pass =
    stageDataTarget &&
    productionTouched === "NO" &&
    !awaitingPoSubmit &&
    flags.every((f) =>
      f.key === "PRODUCTION_TOUCHED" ? f.value === "NO" : f.value === "YES",
    );

  return {
    pass,
    awaitingPoSubmit,
    flags,
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    selectedFinanceYearId,
    selectedFinanceYearName,
    databaseFingerprint: fingerprint,
    dataEnvironment,
    productionTouched,
    pendingApprovalUatCount: pendingUatCount,
  };
}

export function summarizeFin07dPostSubmitFlags(
  flags: Fin07dPoUatPostSubmitFlag[],
): Record<string, "YES" | "NO"> {
  const out: Record<string, "YES" | "NO"> = {};
  for (const row of flags) {
    out[row.key] = row.value;
  }
  return out;
}

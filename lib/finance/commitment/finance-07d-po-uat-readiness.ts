/**
 * FIN-07D — fail-closed PO UAT readiness (policy + DRAFT threshold fixtures).
 */

import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
  FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES,
  FIN_07D_UAT_SEED_TENANT_ID,
  buildFin07dUatAmountsForThreshold,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";
import { loadFinanceCommitmentWorkspaceSnapshot } from "@/lib/finance/services/finance-commitment-query-service";
import { loadFinanceCommitmentApprovalPolicyReadModel } from "@/lib/finance/services/finance-commitment-approval-policy-service";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";
import { FINANCE_07D_IMPLEMENTATION } from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import {
  getDatabaseFingerprintFromEffectivePrismaSource,
  getRuntimeDataEnvironment,
  resolveRuntimeIdentity,
} from "@/lib/server/runtime-identity";

export type Fin07dPoUatReadinessFlag = {
  key: string;
  value: "YES" | "NO";
  detail: string;
};

export type Fin07dPoUatReadinessReport = {
  ready: boolean;
  flags: Fin07dPoUatReadinessFlag[];
  tenantId: string;
  selectedFinanceYearId: string | null;
  thresholdAmountMinor: number | null;
  thresholdCurrency: string | null;
  databaseFingerprint: string | null;
  dataEnvironment: string;
  productionTouched: "NO" | "YES";
};

const MANAGE_CTX_PERMISSIONS = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_VIEW,
  PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
  PERMISSIONS.FINANCE_COMMITMENT_POLICY_MANAGE,
] as const;

function buildManageContext(): FinanceAuthContext {
  return {
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    userId: "finance-07d-po-uat-readiness",
    permissionKeys: new Set(MANAGE_CTX_PERMISSIONS),
  };
}

function flag(key: string, pass: boolean, detail: string): Fin07dPoUatReadinessFlag {
  return { key, value: pass ? "YES" : "NO", detail };
}

function verifySetupPolicyDiscovery(): { pass: boolean; detail: string } {
  const repoRoot = process.cwd();
  const settingsPage = readFileSync(
    join(repoRoot, "app/(admin)/dashboard/finance/settings/page.tsx"),
    "utf8",
  );
  const settingsPanel = readFileSync(
    join(repoRoot, "components/admin/finance/FinanceSettingsPanel.tsx"),
    "utf8",
  );
  const section = readFileSync(
    join(repoRoot, FINANCE_07D_IMPLEMENTATION.settingsSection),
    "utf8",
  );
  const deMessages = readFileSync(join(repoRoot, "messages/de.json"), "utf8");
  const wired =
    settingsPage.includes("loadFinanceCommitmentApprovalPolicyReadModel") &&
    settingsPage.includes("commitmentApprovalPolicy") &&
    settingsPanel.includes("FinanceCommitmentApprovalPolicySettingsSection") &&
    section.includes('data-finance-surface="settings-commitment-approval-policy"') &&
    deMessages.includes("Freigaben · Verpflichtungen");
  return {
    pass: wired,
    detail: wired
      ? "Finance → Einrichtung → Freigaben · Verpflichtungen wired in settings workspace"
      : "Policy configuration surface wiring incomplete",
  };
}

export async function verifyFin07dPoUatReadiness(
  db: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Fin07dPoUatReadinessReport> {
  const flags: Fin07dPoUatReadinessFlag[] = [];
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

  const ctx = buildManageContext();
  const [setup, policyModel, yearsRows] = await Promise.all([
    loadFinanceSetupSnapshot(db as never, ctx),
    loadFinanceCommitmentApprovalPolicyReadModel(db, ctx),
    db.financeYear.findMany({
      where: { tenantId: FIN_07D_UAT_SEED_TENANT_ID },
      orderBy: { startDate: "desc" },
      select: { id: true },
    }),
  ]);

  const selectedFinanceYearId = resolveFinanceCommitmentSelectedYearId({
    requestedYearId: null,
    years: yearsRows,
    currentFinanceYearId: setup.configuration?.currentFinanceYearId,
  });

  const policyConfigured =
    policyModel.persisted && policyModel.enabled && policyModel.thresholdAmountMinor >= 100;
  flags.push(
    flag(
      "FIN_07D_POLICY_CONFIGURED",
      policyConfigured,
      `persisted=${policyModel.persisted} enabled=${policyModel.enabled} thresholdMinor=${policyModel.thresholdAmountMinor}`,
    ),
  );
  flags.push(
    flag(
      "FIN_07D_THRESHOLD_RESOLVED",
      Number.isInteger(policyModel.thresholdAmountMinor) && policyModel.thresholdAmountMinor >= 100,
      String(policyModel.thresholdAmountMinor),
    ),
  );
  flags.push(
    flag(
      "FIN_07D_CURRENCY_RESOLVED",
      Boolean(policyModel.thresholdCurrency && setup.configuration?.baseCurrency),
      `thresholdCurrency=${policyModel.thresholdCurrency} base=${setup.configuration?.baseCurrency ?? "null"}`,
    ),
  );

  const discovery = verifySetupPolicyDiscovery();
  flags.push(flag("POLICY_CONFIGURATION_DISCOVERABLE", discovery.pass, discovery.detail));

  let amounts: ReturnType<typeof buildFin07dUatAmountsForThreshold> | null = null;
  try {
    amounts = buildFin07dUatAmountsForThreshold(policyModel.thresholdAmountMinor);
  } catch {
    amounts = null;
  }

  const uatRows = await db.financeCommitment.findMany({
    where: {
      tenantId: FIN_07D_UAT_SEED_TENANT_ID,
      title: { in: [...FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES] },
    },
    select: {
      title: true,
      financeYearId: true,
      lifecycleStatus: true,
      amountMinor: true,
      currency: true,
    },
  });

  const byTitle = new Map(uatRows.map((row) => [row.title, row]));
  const below = byTitle.get(FIN_07D_UAT_BELOW_THRESHOLD_TITLE);
  const exact = byTitle.get(FIN_07D_UAT_EXACT_THRESHOLD_TITLE);
  const above = byTitle.get(FIN_07D_UAT_ABOVE_THRESHOLD_TITLE);

  flags.push(
    flag("UAT_BELOW_THRESHOLD_PRESENT", Boolean(below), below?.title ?? "missing"),
  );
  flags.push(flag("UAT_EXACT_THRESHOLD_PRESENT", Boolean(exact), exact?.title ?? "missing"));
  flags.push(flag("UAT_ABOVE_THRESHOLD_PRESENT", Boolean(above), above?.title ?? "missing"));

  const allDraft = uatRows.every((row) => row.lifecycleStatus === "DRAFT");
  flags.push(
    flag(
      "ALL_UAT_RECORDS_LIFECYCLE",
      uatRows.length === FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.length && allDraft,
      uatRows.map((r) => `${r.title}:${r.lifecycleStatus}`).join("; ") || "none",
    ),
  );

  const yearMatch = uatRows.every((row) => row.financeYearId === selectedFinanceYearId);
  flags.push(
    flag(
      "ALL_UAT_RECORDS_FINANCE_YEAR_MATCH_WORKSPACE",
      yearMatch && uatRows.length === FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.length,
      `selectedYear=${selectedFinanceYearId ?? "null"}`,
    ),
  );

  if (amounts && policyModel.thresholdCurrency) {
    const amountOk =
      below?.amountMinor === amounts.belowMinor &&
      exact?.amountMinor === amounts.exactMinor &&
      above?.amountMinor === amounts.aboveMinor &&
      below?.currency === policyModel.thresholdCurrency;
    flags.push(
      flag(
        "UAT_AMOUNTS_MATCH_THRESHOLD_TRIPLE",
        Boolean(amountOk),
        amounts
          ? `below=${amounts.belowMinor} exact=${amounts.exactMinor} above=${amounts.aboveMinor}`
          : "threshold invalid",
      ),
    );
  }

  const workspace = await loadFinanceCommitmentWorkspaceSnapshot(db, ctx, {});
  const workspaceTitles = new Set(workspace.items.map((item) => item.title));
  const visible = FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.every((title) =>
    workspaceTitles.has(title),
  );
  flags.push(
    flag(
      "UAT_RECORDS_VISIBLE_IN_COMMITMENT_WORKSPACE",
      visible && uatRows.length === FIN_07D_UAT_CONTROLLED_COMMITMENT_TITLES.length,
      `listed=${workspace.items.length}`,
    ),
  );

  const ready =
    stageDataTarget &&
    productionTouched === "NO" &&
    flags.every((f) => (f.key === "PRODUCTION_TOUCHED" ? f.value === "NO" : f.value === "YES"));

  return {
    ready,
    flags,
    tenantId: FIN_07D_UAT_SEED_TENANT_ID,
    selectedFinanceYearId,
    thresholdAmountMinor: policyModel.thresholdAmountMinor,
    thresholdCurrency: policyModel.thresholdCurrency,
    databaseFingerprint: fingerprint,
    dataEnvironment,
    productionTouched,
  };
}

export function summarizeFin07dReadinessFlags(
  flags: Fin07dPoUatReadinessFlag[],
): Record<string, "YES" | "NO"> {
  const out: Record<string, "YES" | "NO"> = {};
  for (const row of flags) {
    out[row.key] = row.value;
  }
  return out;
}

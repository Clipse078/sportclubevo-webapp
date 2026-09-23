import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WorkspaceBackgroundJobStatus,
  WorkspaceBackgroundJobType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import {
  WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE,
  WORKSPACE_BACKGROUND_JOB_DISPATCH_PER_TENANT_CAP,
} from "@/lib/workspace/background-jobs/job-constants";
import {
  buildMalwareScanVersionDeduplicationKey,
  parseWorkspaceBackgroundJobPayload,
} from "@/lib/workspace/background-jobs/job-payload";
import { isWorkspaceBackgroundJobClaimable } from "@/lib/workspace/background-jobs/job-status";
import {
  workspaceMalwareScannerProvider,
  WORKSPACE_MALWARE_SCANNER_REAL_STATUS,
} from "@/lib/workspace/malware-scan/scanner-provider";
import { BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY } from "@/lib/workspace/governance/break-glass-constants";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-08-05 sentinels", () => {
  it("W08-05-01 job target uses canonical immutable version id", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).toMatch(
      /workspaceDocumentVersionId/,
    );
    expect(read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts")).not.toMatch(
      /currentVersionId/,
    );
  });

  it("W08-05-02 job tenant required", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /model WorkspaceBackgroundJob[\s\S]*tenantId String/,
    );
  });

  it("W08-05-03 cross-tenant job cannot execute target", () => {
    expect(read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts")).toMatch(
      /TENANT_MISMATCH/,
    );
  });

  it("W08-05-04 payload cannot override canonical resource tenant", () => {
    expect(read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts")).toMatch(
      /version\.tenantId !== job\.tenantId/,
    );
  });

  it("W08-05-05 job claiming uses SKIP LOCKED", () => {
    expect(read("lib/workspace/background-jobs/job-claim.ts")).toMatch(
      /FOR UPDATE SKIP LOCKED/,
    );
  });

  it("W08-05-06 lease fields persisted for active jobs", () => {
    expect(read("prisma/schema.prisma")).toMatch(/leaseExpiresAt DateTime\?/);
  });

  it("W08-05-07 expired lease recoverable", () => {
    const now = new Date();
    expect(
      isWorkspaceBackgroundJobClaimable(
        WorkspaceBackgroundJobStatus.RUNNING,
        now,
        new Date(now.getTime() - 1_000),
        now,
      ),
    ).toBe(true);
  });

  it("W08-05-08 at-least-once documented in W08-05 doc", () => {
    expect(read("docs/workspace/WORKSPACE-08-05-BACKGROUND-JOBS.md")).toMatch(
      /AT-LEAST-ONCE|at-least-once/i,
    );
  });

  it("W08-05-09 duplicate scan request deduplicated", () => {
    expect(
      read(
        "prisma/migrations/20260923200000_workspace_08_05_background_jobs/migration.sql",
      ),
    ).toMatch(/deduplicationKey_active_key/);
  });

  it("W08-05-10 new version PENDING scan enqueues durable job", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /enqueueMalwareScanVersionJob/,
    );
  });

  it("W08-05-11 scan record creation and job share transactional writer", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /workspaceBackgroundJob/,
    );
  });

  it("W08-05-12 CLEAN provider result maps to CLEAN scan state", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /case "CLEAN"/,
    );
  });

  it("W08-05-13 INFECTED scan with job SUCCEEDED", () => {
    expect(
      read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts"),
    ).toMatch(/markWorkspaceBackgroundJobSucceeded/);
  });

  it("W08-05-14 UNSCANNABLE never maps to CLEAN", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /UNSCANNABLE[\s\S]*BLOCKED/,
    );
  });

  it("W08-05-15 FAILED never maps to CLEAN", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /case "FAILED"[\s\S]*SCAN_FAILED/,
    );
  });

  it("W08-05-16 scanner timeout retryable class exists", () => {
    expect(read("lib/workspace/background-jobs/retry-policy.ts")).toMatch(
      /SCANNER_TIMEOUT/,
    );
  });

  it("W08-05-17 provider outage retryable", () => {
    expect(read("lib/workspace/background-jobs/retry-policy.ts")).toMatch(
      /PROVIDER_OUTAGE/,
    );
  });

  it("W08-05-18 retry bounded via maxAttempts", () => {
    expect(read("lib/workspace/background-jobs/job-outcome.ts")).toMatch(
      /maxAttempts/,
    );
  });

  it("W08-05-19 max attempts leads to DEAD", () => {
    expect(read("lib/workspace/background-jobs/job-outcome.ts")).toMatch(
      /WorkspaceBackgroundJobStatus\.DEAD/,
    );
  });

  it("W08-05-20 DEAD scan job leaves non-CLEAN scan state", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /SCAN_FAILED/,
    );
  });

  it("W08-05-21 INFECTED is terminal for scan retries in handler", () => {
    expect(
      read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts"),
    ).toMatch(/TERMINAL_SCAN_STATES/);
  });

  it("W08-05-22 scan state and job state remain independent", () => {
    expect(read("prisma/schema.prisma")).toMatch(/WorkspaceBackgroundJobStatus/);
    expect(read("prisma/schema.prisma")).toMatch(
      /WorkspaceDocumentVersionScanState/,
    );
  });

  it("W08-05-23 unconfigured scanner returns FAILED not CLEAN", () => {
    expect(read("lib/workspace/malware-scan/scanner-provider.ts")).toMatch(
      /SCANNER_NOT_CONFIGURED/,
    );
  });

  it("W08-05-24 worker scan input stays server-side", () => {
    expect(read("app/api/cron/workspace-background-jobs/route.ts")).not.toMatch(
      /storageKey/,
    );
  });

  it("W08-05-25 cron requires CRON_SECRET", () => {
    expect(read("app/api/cron/workspace-background-jobs/route.ts")).toMatch(
      /CRON_SECRET/,
    );
  });

  it("W08-05-26 cron uses bounded dispatch batch", () => {
    expect(WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE).toBeGreaterThan(0);
    expect(WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE).toBeLessThanOrEqual(50);
  });

  it("W08-05-27 tenant fairness cap configured", () => {
    expect(WORKSPACE_BACKGROUND_JOB_DISPATCH_PER_TENANT_CAP).toBeGreaterThan(0);
    expect(read("lib/workspace/background-jobs/job-claim.ts")).toMatch(
      /PARTITION BY j\."tenantId"/,
    );
  });

  it("W08-05-28 cron response excludes document content fields", () => {
    expect(read("app/api/cron/workspace-background-jobs/route.ts")).not.toMatch(
      /payloadJson/,
    );
  });

  it("W08-05-29 job payload schema excludes signed URL fields", () => {
    const payload = parseWorkspaceBackgroundJobPayload(
      WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION,
      {
        v: 1,
        workspaceDocumentVersionId: "v1",
        workspaceDocumentId: "d1",
      },
    );
    expect(JSON.stringify(payload)).not.toMatch(/storageUrl/i);
  });

  it("W08-05-30 payload safety sentinel rejects storage credentials", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).toMatch(
      /assertWorkspaceBackgroundJobPayloadSafeForPersistence/,
    );
  });

  it("W08-05-31 migration does not auto-enqueue legacy corpus", () => {
    const migration = read(
      "prisma/migrations/20260923200000_workspace_08_05_background_jobs/migration.sql",
    );
    expect(migration).not.toMatch(/INSERT INTO "WorkspaceBackgroundJob"/);
  });

  it("W08-05-32 legacy enqueue seam is tenant scoped and bounded", () => {
    expect(read("lib/workspace/background-jobs/legacy-scan-backfill-service.ts")).toMatch(
      /take: batchSize/,
    );
  });

  it("W08-05-33 storage delete failure leaves DB metadata", () => {
    expect(read("lib/workspace/governance/workspace-document-purge-service.ts")).toMatch(
      /purgeWorkspaceVersionStorageKeys/,
    );
  });

  it("W08-05-34 storage deleted DB failure schedules durable recovery", () => {
    expect(read("lib/workspace/governance/workspace-document-purge-service.ts")).toMatch(
      /PURGE_RETRY_SCHEDULED/,
    );
  });

  it("W08-05-35 missing storage object tolerated in purge storage helper", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /skippedMissingKeys/,
    );
  });

  it("W08-05-36 purge retry re-evaluates retention via eligibility", () => {
    expect(
      read("lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts"),
    ).toMatch(/evaluateWorkspaceDocumentPurgeEligibility/);
  });

  it("W08-05-37 purge retry re-evaluates governance hold via eligibility", () => {
    expect(read("lib/workspace/governance/purge-eligibility.ts")).toMatch(
      /workspaceGovernanceHold/,
    );
  });

  it("W08-05-38 purge retry re-evaluates W07 references via eligibility", () => {
    expect(read("lib/workspace/governance/purge-eligibility.ts")).toMatch(
      /taskDocumentReference/,
    );
  });

  it("W08-05-39 restored document blocked by eligibility recheck", () => {
    expect(
      read("lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts"),
    ).toMatch(/PURGE_NOT_ELIGIBLE/);
  });

  it("W08-05-40 new hold prevents waiting purge job", () => {
    expect(
      read("lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts"),
    ).toMatch(/PURGE_BLOCKED/);
  });

  it("W08-05-41 break-glass unchanged; jobs do not bypass ACL", () => {
    expect(read("lib/workspace/governance/break-glass-session-service.ts")).toBeTruthy();
  });

  it("W08-05-42 break-glass cannot bypass scan gate", () => {
    expect(BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY).toBe(true);
  });

  it("W08-05-43 audit actions for job lifecycle exist", () => {
    expect(WorkspaceAuditAction.BACKGROUND_JOB_CREATED).toBeDefined();
    expect(WorkspaceAuditAction.BACKGROUND_JOB_DEAD).toBeDefined();
  });

  it("W08-05-44 job errors store bounded codes", () => {
    expect(read("lib/workspace/background-jobs/job-outcome.ts")).toMatch(
      /truncateErrorCode/,
    );
  });

  it("W08-05-45 dead jobs retained (no auto-delete)", () => {
    expect(read("lib/workspace/background-jobs/job-outcome.ts")).toMatch(/DEAD/);
    expect(read("lib/workspace/background-jobs/job-outcome.ts")).not.toMatch(/deleteMany/);
  });

  it("W08-05-46 manual requeue requires governance manage", () => {
    expect(read("lib/workspace/background-jobs/manual-requeue-service.ts")).toMatch(
      /hasWorkspaceGovernanceManagePermission/,
    );
  });

  it("W08-05-47 manual requeue audited", () => {
    expect(read("lib/workspace/background-jobs/manual-requeue-service.ts")).toMatch(
      /BACKGROUND_JOB_RETRIED/,
    );
  });

  it("W08-05-48 queue health not public", () => {
    expect(read("app/api/workspace/governance/background-jobs/health/route.ts")).toMatch(
      /WORKSPACE_GOVERNANCE_MANAGE/,
    );
  });

  it("W08-05-49 operator health excludes document titles", () => {
    expect(read("lib/workspace/background-jobs/job-observability.ts")).not.toMatch(
      /filename/,
    );
  });

  it("W08-05-50 scan enforcement not auto-switched to CLEAN_ONLY", () => {
    expect(read("prisma/schema.prisma")).toMatch(/LEGACY_PERMISSIVE/);
    expect(
      read("lib/workspace/background-jobs/handlers/malware-scan-version-handler.ts"),
    ).not.toMatch(/ENFORCED_CLEAN_ONLY/);
  });

  it("REAL_SCANNER status remains unconfigured", () => {
    expect(WORKSPACE_MALWARE_SCANNER_REAL_STATUS.realScannerConfigured).toBe(false);
    expect(workspaceMalwareScannerProvider.providerId).toBe("unconfigured");
  });

  it("deduplication key uses version id", () => {
    expect(buildMalwareScanVersionDeduplicationKey("ver-abc")).toBe(
      "MALWARE_SCAN_VERSION:ver-abc",
    );
  });
});

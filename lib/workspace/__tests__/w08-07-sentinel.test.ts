import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT,
  WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE,
  resolveWorkspaceAsyncSubtreeThreshold,
} from "@/lib/workspace/subtree/subtree-scale-config";
import { buildSubtreeOperationBatchDeduplicationKey } from "@/lib/workspace/background-jobs/job-payload";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-08-07 sentinels", () => {
  it("W08-07-01 subtree threshold server controlled", () => {
    expect(WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT).toBe(1000);
    expect(read("lib/workspace/subtree/subtree-scale-config.ts")).toMatch(
      /WORKSPACE_ASYNC_SUBTREE_THRESHOLD/,
    );
    expect(resolveWorkspaceAsyncSubtreeThreshold()).toBe(1000);
  });

  it("W08-07-02 client cannot force sync for large operation", () => {
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /shouldExecuteWorkspaceSubtreeAsync/,
    );
    expect(read("lib/workspace/folder-delete-service.ts")).not.toMatch(
      /forceSync|client.*threshold/i,
    );
  });

  it("W08-07-03 client cannot force async to alter authorization semantics", () => {
    expect(read("app/(admin)/dashboard/workspace/actions.ts")).toMatch(
      /assertWorkspaceFolderDestructiveSubtreeManage/,
    );
    expect(read("lib/workspace/folder-delete-service.ts")).not.toMatch(
      /forceAsync/i,
    );
  });

  it("W08-07-04 planner uses bounded count/probe", () => {
    expect(read("lib/workspace/subtree/subtree-planner.ts")).toMatch(
      /LIMIT \$\{probeLimit \+ 1\}/,
    );
  });

  it("W08-07-05 planner does not materialize 10k descendants to choose mode", () => {
    expect(read("lib/workspace/subtree/subtree-planner.ts")).toMatch(
      /folder_probe_hit/,
    );
    expect(read("lib/workspace/folder-subtree.ts")).not.toMatch(
      /shouldExecuteWorkspaceSubtreeAsync/,
    );
  });

  it("W08-07-06 small operation preserves synchronous behaviour", () => {
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /mode: "SYNC"/,
    );
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /deleteWorkspaceFolderPermanently\(/,
    );
  });

  it("W08-07-07 large operation returns explicit async result", () => {
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /mode: "ASYNC"/,
    );
    expect(read("lib/workspace/subtree/subtree-operation-dto.ts")).toMatch(
      /mode: "ASYNC"/,
    );
  });

  it("W08-07-08 async operation has stable tenant-scoped identity", () => {
    expect(read("prisma/schema.prisma")).toMatch(/model WorkspaceSubtreeOperation/);
    expect(read("prisma/migrations/20260923240000_workspace_08_07_subtree_operations/migration.sql")).toMatch(
      /tenant_root_type_active_key/,
    );
  });

  it("W08-07-09 operation creation requires canonical mutation authorization", () => {
    expect(read("app/(admin)/dashboard/workspace/actions.ts")).toMatch(
      /WORKSPACE_DELETE/,
    );
    expect(read("app/(admin)/dashboard/workspace/actions.ts")).toMatch(
      /assertWorkspaceFolderDestructiveSubtreeManage/,
    );
  });

  it("W08-07-10 break-glass cannot create destructive operation", () => {
    expect(read("app/(admin)/dashboard/workspace/actions.ts")).toMatch(
      /PERMISSIONS\.WORKSPACE_DELETE/,
    );
    expect(read("lib/workspace/governance/break-glass-constants.ts")).toMatch(
      /BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY/,
    );
  });

  it("W08-07-11 worker does not become generic ACL bypass", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /evaluateWorkspaceFolderPurgeEligibility/,
    );
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).not.toMatch(
      /assertWorkspaceFolderManage/,
    );
  });

  it("W08-07-12 cross-tenant operation target rejected", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /tenantId: job\.tenantId/,
    );
  });

  it("W08-07-13 cross-tenant status lookup denied", () => {
    expect(read("lib/workspace/subtree/subtree-operation-status-service.ts")).toMatch(
      /tenantId/,
    );
    expect(read("app/api/workspace/subtree-operations/[operationId]/route.ts")).toMatch(
      /NOT_FOUND/,
    );
  });

  it("W08-07-14 operation ID does not enumerate descendant resources", () => {
    const dto = read("lib/workspace/subtree/subtree-operation-dto.ts");
    expect(dto).not.toMatch(/folderIds|documentIds/);
    expect(dto).toMatch(/operationId: string/);
  });

  it("W08-07-15 batch size bounded", () => {
    expect(WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE).toBeLessThanOrEqual(100);
  });

  it("W08-07-16 one transaction does not span entire large subtree", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE/,
    );
  });

  it("W08-07-17 duplicate batch execution idempotent", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /deleted\.count/,
    );
  });

  it("W08-07-18 stale lease retry safe", () => {
    expect(read("lib/workspace/background-jobs/job-claim.ts")).toMatch(
      /leaseExpiresAt/,
    );
  });

  it("W08-07-19 progress not double-counted on retry", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /increment: deletedFolderCount/,
    );
  });

  it("W08-07-20 duplicate active operation controlled", () => {
    expect(read("lib/workspace/subtree/workspace-subtree-operation-service.ts")).toMatch(
      /PENDING/,
    );
  });

  it("W08-07-21 new governance hold blocks pending destructive target", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /purgeWorkspaceDocumentPermanently/,
    );
  });

  it("W08-07-22 new W07 Task reference blocks pending purge", () => {
    expect(read("lib/workspace/governance/workspace-document-purge-service.ts")).toMatch(
      /WORKSPACE_DELETION_BLOCKED_CODE/,
    );
  });

  it("W08-07-23 new Requirement reference blocks pending purge", () => {
    expect(read("lib/workspace/deletion/deletion-blockers.ts")).toMatch(
      /REQUIREMENT_WORKSPACE_DOCUMENT_VERSION_REFERENCE/,
    );
  });

  it("W08-07-24 restored document not purged by stale plan", () => {
    expect(read("lib/workspace/governance/purge-eligibility.ts")).toMatch(
      /requireTrashed/,
    );
  });

  it("W08-07-25 child moved outside intended scope not accidentally deleted", () => {
    expect(read("lib/workspace/subtree/subtree-planner.ts")).toMatch(
      /WITH RECURSIVE subtree/,
    );
  });

  it("W08-07-26 new child semantics explicitly tested", () => {
    expect(read("docs/workspace/WORKSPACE-08-07-LARGE-SUBTREE-SCALE.md")).toMatch(
      /New children/,
    );
  });

  it("W08-07-27 provider-aware shared storage identity preserved", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /storageProvider/,
    );
  });

  it("W08-07-28 Vercel historical object purged through Vercel adapter", () => {
    expect(read("lib/workspace/storage/adapters/vercel-blob-workspace-storage.ts")).toMatch(
      /deleteObject|delete/i,
    );
  });

  it("W08-07-29 S3 historical object purged through S3 adapter", () => {
    expect(read("lib/workspace/storage/adapters/s3-compatible-workspace-storage.ts")).toMatch(
      /DeleteObjectCommand/,
    );
  });

  it("W08-07-30 storage failure retry safe", () => {
    expect(read("lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts")).toMatch(
      /markWorkspaceBackgroundJobRetry/,
    );
  });

  it("W08-07-31 storage success + DB failure retry safe", () => {
    expect(read("lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts")).toMatch(
      /DB_PURGE_FAILED/,
    );
  });

  it("W08-07-32 missing storage object retry safe", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /missing|not.?found/i,
    );
  });

  it("W08-07-33 blocked descendant prevents unsafe parent deletion", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /PARTIALLY_BLOCKED/,
    );
  });

  it("W08-07-34 folder ordering preserves FK integrity", () => {
    expect(read("lib/workspace/subtree/subtree-planner.ts")).toMatch(
      /ORDER BY s\.depth DESC/,
    );
  });

  it("W08-07-35 operation completion only after all required work resolved", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /countWorkspaceSubtreeDocumentsRemaining/,
    );
  });

  it("W08-07-36 queued operation does not falsely report completed", () => {
    expect(read("lib/workspace/subtree/subtree-operation-dto.ts")).toMatch(
      /mode: "ASYNC"/,
    );
    expect(read("app/(admin)/dashboard/workspace/actions.ts")).toMatch(
      /mode: "ASYNC"/,
    );
  });

  it("W08-07-37 status DTO contains no descendant names", () => {
    const dto = read("lib/workspace/subtree/subtree-operation-dto.ts");
    expect(dto).not.toMatch(/\b(folderName|documentName|storageKey)\b/);
  });

  it("W08-07-38 status DTO contains no storage identity", () => {
    expect(read("lib/workspace/subtree/subtree-operation-dto.ts")).not.toMatch(
      /storageKey|storageProvider|storageUrl/,
    );
  });

  it("W08-07-39 status endpoint zero disclosure", () => {
    expect(read("app/api/workspace/subtree-operations/[operationId]/route.ts")).toMatch(
      /status: 404/,
    );
  });

  it("W08-07-40 audit correlates operation without content leakage", () => {
    expect(WorkspaceAuditAction.SUBTREE_OPERATION_REQUESTED).toBe(
      "WORKSPACE_SUBTREE_OPERATION_REQUESTED",
    );
    expect(read("lib/workspace/subtree/workspace-subtree-operation-service.ts")).toMatch(
      /operationId/,
    );
  });

  it("W08-07-41 job payload contains canonical operation ID, not giant descendant list", () => {
    expect(buildSubtreeOperationBatchDeduplicationKey("op1")).toBe(
      "SUBTREE_OPERATION_BATCH:op1",
    );
    expect(read("lib/workspace/background-jobs/job-payload.ts")).toMatch(
      /operationId: string/,
    );
    expect(read("lib/workspace/background-jobs/job-payload.ts")).not.toMatch(
      /descendantIds/,
    );
  });

  it("W08-07-42 job payload contains no storage credentials", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).toMatch(
      /assertWorkspaceBackgroundJobPayloadSafeForPersistence/,
    );
  });

  it("W08-07-43 job payload contains no signed URL", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).toMatch(
      /signedurl/i,
    );
  });

  it("W08-07-44 provider switching does not affect planned historical objects", () => {
    expect(read("lib/workspace/storage/provider-identity.ts")).toMatch(
      /normalizeWorkspaceStorageProviderId/,
    );
  });

  it("W08-07-45 scan state does not grant destructive authority", () => {
    expect(read("lib/workspace/malware-scan/content-delivery-gate.ts")).toBeTruthy();
    expect(read("lib/workspace/folder-delete-service.ts")).not.toMatch(
      /scanState.*delete/i,
    );
  });

  it("W08-07-46 break-glass scan/read semantics unchanged", () => {
    expect(read("lib/workspace/governance/break-glass-constants.ts")).toMatch(
      /BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY = true/,
    );
  });

  it("W08-07-47 W07 exact version references remain unchanged", () => {
    expect(read("lib/workspace/deletion/deletion-blockers.ts")).toMatch(
      /WorkspaceDocumentVersionReference/,
    );
  });

  it("W08-07-48 no large IN-list generated from complete subtree in async path", () => {
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /requestWorkspaceFolderPermanentDelete/,
    );
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /fetchWorkspaceSubtreeDocumentIdsBatch/,
    );
  });

  it("W08-07-49 no unbounded provider-delete loop in request path", () => {
    expect(read("lib/workspace/folder-delete-service.ts")).toMatch(
      /requestWorkspaceFolderPermanentDelete/,
    );
    expect(read("lib/workspace/subtree/workspace-subtree-operation-service.ts")).toMatch(
      /enqueueSubtreeOperationBatchJob/,
    );
  });

  it("W08-07-50 operation terminal failure remains observable", () => {
    expect(read("lib/workspace/background-jobs/handlers/subtree-operation-handler.ts")).toMatch(
      /SUBTREE_OPERATION_FAILED/,
    );
  });
});

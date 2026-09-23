/**
 * WORKSPACE-08-08 — cross-package release acceptance (integration boundaries).
 *
 * Static sentinels always run in CI. Disposable-DB proof runs when both
 * TEST_DATABASE_URL and W08_08_FIXTURE_MANIFEST are set (see release doc).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Pool } from "pg";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { hasWorkspaceAuditViewPermission } from "@/lib/workspace/audit/workspace-audit-read-service";
import { isWorkspaceContentAccessAllowedByScanStatus } from "@/lib/workspace/storage/content-security-status";
import { getConfiguredWorkspaceUploadStorageProviderId } from "@/lib/workspace/storage/workspace-storage-config";
import { WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT } from "@/lib/workspace/subtree/subtree-scale-config";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";

const ROOT = process.cwd();

const W08_MIGRATION_MANIFEST: Record<string, string> = {
  W08_01: "20260923120000_workspace_08_01_durable_audit_foundation",
  W08_02: "20260923140000_workspace_08_02_break_glass_governance",
  W08_03: "20260923160000_workspace_08_03_retention_governance_hold",
  W08_04: "20260923180000_workspace_08_04_malware_scan_quarantine",
  W08_05: "20260923200000_workspace_08_05_background_jobs",
  W08_06: "20260923220000_workspace_08_06_storage_provider_identity",
  W08_07: "20260923240000_workspace_08_07_subtree_operations",
};

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function sha256Migration(folder: string): string {
  const path = join(ROOT, "prisma/migrations", folder, "migration.sql");
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readSrc(glob: string): string {
  return read(glob);
}

describe("WORKSPACE-08-08 release acceptance", () => {
  it("W08-08-01 canonical W08 migration manifest checksums are pinned", () => {
    const checksums = Object.fromEntries(
      Object.entries(W08_MIGRATION_MANIFEST).map(([key, folder]) => [
        key,
        sha256Migration(folder),
      ]),
    );

    expect(checksums.W08_01).toBe(
      "76decca4c6369bac32b478c42b58e840374b7a59db7f766dd860a4519c94b988",
    );
    expect(checksums.W08_02).toBe(
      "babafb5673201aa8909646a4b14f0e5befdf107ac4b944c882a1b878e545a0b8",
    );
    expect(checksums.W08_03).toBe(
      "94e6c4d1fa284a15561d714deb1f2b903d8be991ac1e9367d13220e4dc2b8f8e",
    );
    expect(checksums.W08_04).toBe(
      "1846eded939d7ee29d069f35128d605ed038b53493ce3548ab742fc9349e361f",
    );
    expect(checksums.W08_05).toBe(
      "e84a535e88e030cf6c2952c8f032ac1a0d9a7a35a7727e2af3d242ed2e44b874",
    );
    expect(checksums.W08_06).toBe(
      "c5b2f56b5742c5f8273ead5d9ffb6de61a38292bc343b74f543c9d4a2c98c768",
    );
    expect(checksums.W08_07).toBe(
      "59ea60ac5752fc5aefa8fe81fdcdd2859afcdb7fd0fa5d675ea9fba5eace540b",
    );

    const timestamps = Object.values(W08_MIGRATION_MANIFEST).map((f) => f.slice(0, 14));
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it("W08-08-02 audit + break-glass permissions remain independent at release boundary", () => {
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_MANAGE])).toBe(false);
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_BREAK_GLASS])).toBe(
      false,
    );
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_AUDIT_VIEW])).toBe(
      true,
    );
    const breakGlassAuth = readSrc(
      "lib/workspace/governance/workspace-governance-read-authorization.ts",
    );
    expect(breakGlassAuth).not.toMatch(/\|\|\s*breakGlass/i);
    expect(breakGlassAuth).not.toMatch(/normalAccess\s*\|\|/i);
  });

  it("W08-08-03 malware gate keeps NOT_SCANNED distinct from blocked delivery", () => {
    expect(isWorkspaceContentAccessAllowedByScanStatus("NOT_SCANNED")).toBe(true);
    expect(isWorkspaceContentAccessAllowedByScanStatus("CLEAN")).toBe(true);
    expect(isWorkspaceContentAccessAllowedByScanStatus("INFECTED")).toBe(false);
    expect(isWorkspaceContentAccessAllowedByScanStatus("BLOCKED")).toBe(false);
    const gate = readSrc("lib/workspace/malware-scan/content-delivery-gate.ts");
    expect(gate).toMatch(/scan/i);
  });

  it("W08-08-04 storage portability keeps @vercel/blob out of domain services", () => {
    for (const path of [
      "lib/workspace/document-service.ts",
      "lib/workspace/document-download-service.ts",
      "lib/workspace/governance/workspace-document-purge-service.ts",
      "lib/workspace/background-jobs/handlers/document-purge-finalize-handler.ts",
    ]) {
      expect(readSrc(path)).not.toMatch(/@vercel\/blob/);
    }
    expect(getConfiguredWorkspaceUploadStorageProviderId()).toBeTruthy();
  });

  it("W08-08-05 subtree threshold remains server-controlled default", () => {
    expect(WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT).toBe(1000);
    const planner = readSrc("lib/workspace/subtree/subtree-planner.ts");
    expect(planner).not.toMatch(/input\.forceAsync/i);
  });

  it("W08-08-06 runtime boundary — no function-valued tree props on workspace page", () => {
    const page = readSrc("app/(admin)/dashboard/workspace/page.tsx");
    const panel = readSrc("components/admin/workspace/WorkspaceFolderTreePanel.tsx");
    expect(page).not.toMatch(/createSubfolderSlot\s*=/);
    expect(panel).not.toMatch(/createSubfolderSlot\s*[:?]/);
    expect(page).toMatch(/canManage/);
  });

  it("W08-08-07 security search — no client storage credential injection in workspace API routes", () => {
    const routes = [
      "app/api/workspace/documents/route.ts",
      "app/api/workspace/documents/[documentId]/versions/route.ts",
    ];
    for (const route of routes) {
      const src = readSrc(route);
      expect(src).not.toMatch(/req\.json\(\)[\s\S]*storageProvider/);
      expect(src).not.toMatch(/searchParams\.get\(["']storageKey/);
    }
  });
});

const manifestPath = process.env.W08_08_FIXTURE_MANIFEST?.trim();
const fixtureManifestExists = manifestPath ? existsSync(manifestPath) : false;

describe.skipIf(!process.env.TEST_DATABASE_URL || !fixtureManifestExists)(
  "WORKSPACE-08-08 disposable DB post-upgrade invariants",
  () => {
    it("W08-08-DB-01 seeded upgrade preserves tenants, ids, refs, and legacy storage", async () => {
      const connectionString = assertSafeTestDatabase();
      const manifest = JSON.parse(readFileSync(manifestPath!, "utf8")) as {
        tenantAId: string;
        tenantBId: string;
        activeDocumentId: string;
        exactVersionId: string;
        taskId: string;
        requirementId: string;
        rootFolderId: string;
        legacyVercelStorageUrl: string;
      };

      const pool = new Pool({ connectionString });
      try {
        const tenants = await pool.query(
          `SELECT id FROM "Tenant" WHERE id = ANY($1::text[])`,
          [[manifest.tenantAId, manifest.tenantBId]],
        );
        expect(tenants.rowCount).toBe(2);

        const doc = await pool.query(
          `SELECT "currentVersionId" FROM "WorkspaceDocument" WHERE id = $1`,
          [manifest.activeDocumentId],
        );
        expect(doc.rows[0]?.currentVersionId).toBe(manifest.exactVersionId);

        const version = await pool.query(
          `SELECT "storageProvider", "storageUrl" FROM "WorkspaceDocumentVersion" WHERE id = $1`,
          [manifest.exactVersionId],
        );
        expect(version.rows[0]?.storageProvider).toBe("vercel-blob");
        expect(version.rows[0]?.storageUrl).toBe(manifest.legacyVercelStorageUrl);

        const taskRef = await pool.query(
          `SELECT "workspaceDocumentVersionId" FROM "TaskDocumentReference" WHERE "taskId" = $1`,
          [manifest.taskId],
        );
        expect(taskRef.rows[0]?.workspaceDocumentVersionId).toBe(manifest.exactVersionId);

        const reqRef = await pool.query(
          `SELECT "workspaceDocumentVersionId" FROM "RequirementWorkspaceDocumentVersionReference" WHERE "requirementId" = $1`,
          [manifest.requirementId],
        );
        expect(reqRef.rows[0]?.workspaceDocumentVersionId).toBe(manifest.exactVersionId);

        const crossTenant = await pool.query(
          `SELECT COUNT(*)::int AS c FROM "WorkspaceFolder" WHERE "tenantId" = $1 AND id = $2`,
          [manifest.tenantBId, manifest.rootFolderId],
        );
        expect(crossTenant.rows[0]?.c).toBe(0);

        const scans = await pool.query(
          `SELECT COUNT(*)::int AS c FROM "WorkspaceDocumentVersionScan" WHERE "tenantId" = $1`,
          [manifest.tenantAId],
        );
        expect(scans.rows[0]?.c).toBeGreaterThan(0);
      } finally {
        await pool.end();
      }
    });
  },
);

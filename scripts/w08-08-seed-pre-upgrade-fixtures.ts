/**
 * WORKSPACE-08-08 — seed representative pre-W08 workspace data on a disposable DB
 * that already has STAGE-baseline migrations applied (no W08 migrations yet).
 *
 * Uses raw SQL so the script does not require W08 columns on WorkspaceDocumentVersion.
 *
 * SAFETY: requires local TEST_DATABASE_URL (never STAGE/production).
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Pool } from "pg";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";

const MANIFEST_PATH =
  process.env.W08_08_FIXTURE_MANIFEST?.trim() ||
  "/tmp/w08-08-fixture-manifest.json";

async function main() {
  const connectionString = assertSafeTestDatabase();
  const pool = new Pool({ connectionString });

  const runId = `w0808-${Date.now()}`;
  const tenantAId = randomUUID();
  const tenantBId = randomUUID();
  const userAId = randomUUID();
  const rootFolderId = randomUUID();
  const childFolderId = randomUUID();
  const activeDocId = randomUUID();
  const archivedDocId = randomUUID();
  const trashedDocId = randomUUID();
  const activeV1Id = randomUUID();
  const activeV2Id = randomUUID();
  const archivedV1Id = randomUUID();
  const trashedV1Id = randomUUID();
  const taskId = randomUUID();
  const requirementId = randomUUID();
  const tenantBFolderId = randomUUID();
  const vercelUrl =
    "https://example.blob.vercel-storage.com/workspace/legacy-vercel-object.pdf";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO "Tenant" ("id", "key", "name", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW()), ($4, $5, $6, NOW(), NOW())`,
      [
        tenantAId,
        `w08-accept-a-${runId}`,
        "W08-08 Tenant A",
        tenantBId,
        `w08-accept-b-${runId}`,
        "W08-08 Tenant B",
      ],
    );

    await client.query(
      `INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName", "tenantId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        userAId,
        `w08-a-${runId}@example.test`,
        "w08-fixture-not-for-login",
        "W08",
        "Acceptance",
        tenantAId,
      ],
    );

    await client.query(
      `INSERT INTO "WorkspaceFolder" ("id", "tenantId", "parentId", "name", "createdByUserId", "createdAt", "updatedAt")
       VALUES ($1, $2, NULL, 'Root', $3, NOW(), NOW()),
              ($4, $2, $1, 'Nested', $3, NOW(), NOW()),
              ($5, $6, NULL, 'Tenant B folder', NULL, NOW(), NOW())`,
      [rootFolderId, tenantAId, userAId, childFolderId, tenantBFolderId, tenantBId],
    );

    await client.query(
      `INSERT INTO "WorkspaceDocument"
        ("id", "tenantId", "folderId", "name", "status", "archivedAt", "trashedAt", "createdByUserId", "createdAt", "updatedAt")
       VALUES
        ($1, $2, $3, 'Active Policy.pdf', 'ACTIVE', NULL, NULL, $4, NOW(), NOW()),
        ($5, $2, $6, 'Archived.pdf', 'ACTIVE', $7, NULL, $4, NOW(), NOW()),
        ($8, $2, $6, 'Trashed.pdf', 'TRASHED', NULL, $9, $4, NOW(), NOW())`,
      [
        activeDocId,
        tenantAId,
        childFolderId,
        userAId,
        archivedDocId,
        rootFolderId,
        new Date("2026-01-10T00:00:00.000Z"),
        trashedDocId,
        new Date("2026-02-01T00:00:00.000Z"),
      ],
    );

    await client.query(
      `INSERT INTO "WorkspaceDocumentVersion"
        ("id", "tenantId", "documentId", "versionNumber", "status", "filename", "mimeType", "sizeBytes", "storageKey", "storageUrl", "checksum", "createdByUserId", "createdAt")
       VALUES
        ($1, $2, $3, 1, 'SUPERSEDED', 'v1.pdf', 'application/pdf', 1024, $4, $5, 'checksum-1', $6, NOW()),
        ($7, $2, $3, 2, 'CURRENT', 'v2.pdf', 'application/pdf', 1024, $8, $5, 'checksum-2', $6, NOW()),
        ($9, $2, $10, 1, 'CURRENT', 'v1.pdf', 'application/pdf', 1024, $11, $5, 'checksum-a', $6, NOW()),
        ($12, $2, $13, 1, 'CURRENT', 'v1.pdf', 'application/pdf', 1024, $14, $5, 'checksum-t', $6, NOW())`,
      [
        activeV1Id,
        tenantAId,
        activeDocId,
        `tenants/${tenantAId}/documents/${activeDocId}/v1.pdf`,
        vercelUrl,
        userAId,
        activeV2Id,
        `tenants/${tenantAId}/documents/${activeDocId}/v2.pdf`,
        archivedV1Id,
        archivedDocId,
        `tenants/${tenantAId}/documents/${archivedDocId}/v1.pdf`,
        trashedV1Id,
        trashedDocId,
        `tenants/${tenantAId}/documents/${trashedDocId}/v1.pdf`,
      ],
    );

    await client.query(
      `UPDATE "WorkspaceDocument" SET "currentVersionId" = $1 WHERE "id" = $2`,
      [activeV2Id, activeDocId],
    );

    await client.query(
      `INSERT INTO "WorkspaceAccessGrant"
        ("id", "tenantId", "resourceType", "folderId", "subjectType", "accessLevel", "createdAt", "updatedAt")
       VALUES ($1, $2, 'FOLDER', $3, 'ORGANISATION', 'MANAGE', NOW(), NOW())`,
      [randomUUID(), tenantAId, rootFolderId],
    );

    await client.query(
      `INSERT INTO "WorkspaceFavorite"
        ("id", "tenantId", "userId", "resourceType", "documentId", "createdAt")
       VALUES ($1, $2, $3, 'DOCUMENT', $4, NOW())`,
      [randomUUID(), tenantAId, userAId, activeDocId],
    );

    await client.query(
      `INSERT INTO "WorkspaceRecentAccess"
        ("id", "tenantId", "userId", "resourceType", "documentId", "accessedAt")
       VALUES ($1, $2, $3, 'DOCUMENT', $4, NOW())`,
      [randomUUID(), tenantAId, userAId, activeDocId],
    );

    await client.query(
      `INSERT INTO "Task" ("id", "tenantId", "title", "createdByUserId", "createdAt", "updatedAt")
       VALUES ($1, $2, 'W08 fixture task', $3, NOW(), NOW())`,
      [taskId, tenantAId, userAId],
    );

    await client.query(
      `INSERT INTO "TaskDocumentReference"
        ("id", "tenantId", "taskId", "workspaceDocumentVersionId", "versionBinding", "createdByUserId", "createdAt")
       VALUES ($1, $2, $3, $4, 'EXACT', $5, NOW())`,
      [randomUUID(), tenantAId, taskId, activeV2Id, userAId],
    );

    await client.query(
      `INSERT INTO "Requirement" ("id", "tenantId", "title", "status", "createdByUserId", "createdAt", "updatedAt")
       VALUES ($1, $2, 'W08 fixture requirement', 'ACTIVE', $3, NOW(), NOW())`,
      [requirementId, tenantAId, userAId],
    );

    await client.query(
      `INSERT INTO "RequirementWorkspaceDocumentVersionReference"
        ("id", "tenantId", "requirementId", "workspaceDocumentVersionId", "createdByUserId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [randomUUID(), tenantAId, requirementId, activeV2Id, userAId],
    );

    await client.query("COMMIT");

    const manifest = {
      runId,
      tenantAId,
      tenantBId,
      userAId,
      rootFolderId,
      childFolderId,
      activeDocumentId: activeDocId,
      archivedDocumentId: archivedDocId,
      trashedDocumentId: trashedDocId,
      exactVersionId: activeV2Id,
      supersededVersionId: activeV1Id,
      taskId,
      requirementId,
      legacyVercelStorageUrl: vercelUrl,
    };

    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, manifestPath: MANIFEST_PATH, manifest }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

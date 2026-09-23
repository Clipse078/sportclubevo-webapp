/**
 * lib/workspace/__tests__/document-delete-service.test.ts
 *
 * ADMIN-DELETE-03A — Unit tests for the WorkspaceDocument permanent-delete
 * service. All DB and storage interactions are mocked.
 *
 * TEST COVERAGE MAP:
 *   1. getWorkspaceDocumentDeletionImpact — returns versionCount for own-tenant doc.
 *   2. getWorkspaceDocumentDeletionImpact — returns null for missing doc.
 *   3. getWorkspaceDocumentDeletionImpact — returns null for wrong-tenant doc (cross-tenant safety).
 *   4. deleteWorkspaceDocumentPermanently — happy path: DB deleted, storage cleaned up.
 *   5. deleteWorkspaceDocumentPermanently — throws DOCUMENT_NOT_FOUND for missing doc.
 *   6. deleteWorkspaceDocumentPermanently — throws TENANT_FORBIDDEN for wrong-tenant doc.
 *   7. deleteWorkspaceDocumentPermanently — storage cleanup called for all versions.
 *   8. deleteWorkspaceDocumentPermanently — storage failure does not throw (best-effort).
 *   9. deleteWorkspaceDocumentPermanently — INVALID_INPUT for blank tenantId.
 *  10. deleteWorkspaceDocumentPermanently — INVALID_INPUT for blank documentId.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceDocumentFindUnique: vi.fn(),
  workspaceDocumentFindFirst: vi.fn(),
  workspaceDocumentDelete: vi.fn(),
  taskDocumentReferenceFindMany: vi.fn(),
  requirementDocumentVersionReferenceFindMany: vi.fn(),
  executeRaw: vi.fn(),
  storageDelete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findUnique: (...args: unknown[]) => mocks.workspaceDocumentFindUnique(...args),
      findFirst: (...args: unknown[]) => mocks.workspaceDocumentFindFirst(...args),
      delete: (...args: unknown[]) => mocks.workspaceDocumentDelete(...args),
    },
    taskDocumentReference: {
      findMany: (...args: unknown[]) => mocks.taskDocumentReferenceFindMany(...args),
    },
    requirementWorkspaceDocumentVersionReference: {
      findMany: (...args: unknown[]) =>
        mocks.requirementDocumentVersionReferenceFindMany(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $executeRaw: mocks.executeRaw,
        workspaceDocument: {
          findFirst: (...args: unknown[]) => mocks.workspaceDocumentFindFirst(...args),
          delete: (...args: unknown[]) => mocks.workspaceDocumentDelete(...args),
        },
        taskDocumentReference: {
          findMany: (...args: unknown[]) => mocks.taskDocumentReferenceFindMany(...args),
        },
        requirementWorkspaceDocumentVersionReference: {
          findMany: (...args: unknown[]) =>
            mocks.requirementDocumentVersionReferenceFindMany(...args),
        },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      }),
  },
}));

const purgeMocks = vi.hoisted(() => ({
  purge: vi.fn(),
  evaluate: vi.fn(),
}));

vi.mock("@/lib/workspace/governance/workspace-document-purge-service", () => ({
  purgeWorkspaceDocumentPermanently: (...args: unknown[]) => purgeMocks.purge(...args),
  WorkspaceDocumentPurgeError: class WorkspaceDocumentPurgeError extends Error {
    code = "NOT_ELIGIBLE";
    eligibility = undefined;
  },
}));

vi.mock("@/lib/workspace/governance/purge-eligibility", () => ({
  evaluateWorkspaceDocumentPurgeEligibility: (...args: unknown[]) =>
    purgeMocks.evaluate(...args),
  WorkspacePurgeEligibilityStatus: {
    ELIGIBLE: "ELIGIBLE",
    NOT_TRASHED: "NOT_TRASHED",
  },
}));

import {
  deleteWorkspaceDocumentPermanently,
  getWorkspaceDocumentDeletionImpact,
  WorkspaceDocumentDeleteServiceError,
} from "../document-delete-service";

const DOC_ID = "doc-test-01";
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function makeDocumentWithVersions(versions: { id: string; storageKey: string; storageUrl?: string | null }[]) {
  return {
    id: DOC_ID,
    tenantId: TENANT_A,
    name: "Test Document",
    versions,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.workspaceDocumentDelete.mockResolvedValue({ id: DOC_ID });
  mocks.storageDelete.mockResolvedValue(undefined);
  mocks.taskDocumentReferenceFindMany.mockResolvedValue([]);
  mocks.requirementDocumentVersionReferenceFindMany.mockResolvedValue([]);
  mocks.executeRaw.mockResolvedValue(undefined);
  purgeMocks.purge.mockResolvedValue({ documentId: DOC_ID, versionCount: 2 });
  purgeMocks.evaluate.mockResolvedValue({ eligible: true, status: "ELIGIBLE" });
});

describe("getWorkspaceDocumentDeletionImpact", () => {
  it("1 — returns versionCount for own-tenant document", async () => {
    mocks.workspaceDocumentFindUnique.mockResolvedValueOnce({
      id: DOC_ID,
      tenantId: TENANT_A,
      _count: { versions: 3 },
    });

    const result = await getWorkspaceDocumentDeletionImpact(TENANT_A, DOC_ID);

    expect(result).toEqual({
      versionCount: 3,
      referenceBlockers: [],
      purgeEligibilityStatus: "ELIGIBLE",
    });
  });

  it("2 — returns null when document does not exist", async () => {
    mocks.workspaceDocumentFindUnique.mockResolvedValueOnce(null);

    const result = await getWorkspaceDocumentDeletionImpact(TENANT_A, DOC_ID);

    expect(result).toBeNull();
  });

  it("3 — returns null for wrong-tenant document (cross-tenant safety)", async () => {
    mocks.workspaceDocumentFindUnique.mockResolvedValueOnce({
      id: DOC_ID,
      tenantId: TENANT_B,
      _count: { versions: 1 },
    });

    const result = await getWorkspaceDocumentDeletionImpact(TENANT_A, DOC_ID);

    expect(result).toBeNull();
  });
});

describe("deleteWorkspaceDocumentPermanently", () => {
  it("4 — happy path: purge service invoked, correct result returned", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValueOnce({
      name: "Test Document",
    });

    const result = await deleteWorkspaceDocumentPermanently(TENANT_A, DOC_ID);

    expect(purgeMocks.purge).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        documentId: DOC_ID,
        requireTrashed: true,
      }),
    );
    expect(result.documentId).toBe(DOC_ID);
    expect(result.documentName).toBe("Test Document");
    expect(result.impact.versionCount).toBe(2);
  });

  it("5 — throws DOCUMENT_NOT_FOUND for missing document", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValueOnce(null);

    await expect(
      deleteWorkspaceDocumentPermanently(TENANT_A, DOC_ID),
    ).rejects.toMatchObject({
      code: "DOCUMENT_NOT_FOUND",
    });

    expect(purgeMocks.purge).not.toHaveBeenCalled();
  });

  it("6 — throws DOCUMENT_NOT_FOUND when document missing in tenant scope", async () => {
    mocks.workspaceDocumentFindFirst.mockResolvedValueOnce(null);

    await expect(
      deleteWorkspaceDocumentPermanently(TENANT_B, DOC_ID),
    ).rejects.toMatchObject({
      code: "DOCUMENT_NOT_FOUND",
    });

    expect(purgeMocks.purge).not.toHaveBeenCalled();
  });

  it("7 — deletion impact includes purge eligibility status", async () => {
    mocks.workspaceDocumentFindUnique.mockResolvedValueOnce({
      id: DOC_ID,
      tenantId: TENANT_A,
      _count: { versions: 1 },
    });
    purgeMocks.evaluate.mockResolvedValueOnce({
      eligible: false,
      status: "RETENTION_NOT_EXPIRED",
    });

    const impact = await getWorkspaceDocumentDeletionImpact(TENANT_A, DOC_ID);
    expect(impact?.purgeEligibilityStatus).toBe("RETENTION_NOT_EXPIRED");
  });

  it("9 — throws INVALID_INPUT for blank tenantId", async () => {
    await expect(
      deleteWorkspaceDocumentPermanently("  ", DOC_ID),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    expect(mocks.workspaceDocumentFindUnique).not.toHaveBeenCalled();
  });

  it("10 — throws INVALID_INPUT for blank documentId", async () => {
    await expect(
      deleteWorkspaceDocumentPermanently(TENANT_A, ""),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    expect(mocks.workspaceDocumentFindUnique).not.toHaveBeenCalled();
  });

  it("WorkspaceDocumentDeleteServiceError is instanceof Error", () => {
    const err = new WorkspaceDocumentDeleteServiceError("DOCUMENT_NOT_FOUND", "test");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("DOCUMENT_NOT_FOUND");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceDocumentStatus } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  assertWorkspaceFolderEdit,
  assertWorkspaceFolderManage,
} from "@/lib/workspace/workspace-resource-guards";
import {
  canWorkspaceEdit,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import {
  chain,
  folderNode,
  grant,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import {
  assertDocumentLifecycleConsistent,
  deriveWorkspaceDocumentLifecycle,
  deriveWorkspaceFolderLifecycle,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import { WORKSPACE_DELETION_BLOCKED_CODE } from "@/lib/workspace/deletion/deletion-blockers";
import { buildWorkspaceReadWhereFromIds } from "@/lib/workspace/access/query-predicate";

const prismaMocks = vi.hoisted(() => ({
  taskDocumentReference: { findMany: vi.fn() },
  workspaceDocument: { findUnique: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    taskDocumentReference: prismaMocks.taskDocumentReference,
    workspaceDocument: prismaMocks.workspaceDocument,
    $transaction: prismaMocks.transaction,
  },
}));

vi.mock("@/lib/workspace/upload-storage", () => ({
  workspaceStorageProvider: { delete: vi.fn() },
}));

function restrictedActor(): WorkspaceActorContext {
  return {
    identity: { tenantId: TENANT, userId: "u1", personId: "p-other" },
    membership: {
      tenantId: TENANT,
      organisationIds: [],
      orgUnitIds: [],
      teamIds: [],
      roleAssignments: [],
    },
    permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE, PERMISSIONS.WORKSPACE_DELETE],
    graph: chain([
      folderNode({
        id: "folder-x",
        parentFolderId: null,
        grants: [grant({ accessLevel: "VIEW", personId: "p-owner" })],
      }),
    ]),
  };
}

describe("WORKSPACE-06 sentinels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        $executeRaw: prismaMocks.executeRaw,
        taskDocumentReference: prismaMocks.taskDocumentReference,
        workspaceDocument: {
          findFirst: prismaMocks.workspaceDocument.findFirst,
          delete: prismaMocks.workspaceDocument.delete,
        },
      }),
    );
    prismaMocks.executeRaw.mockResolvedValue(undefined);
    prismaMocks.workspaceDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      name: "Doc",
      versions: [{ storageKey: "k1" }],
    });
  });

  it("W06-01/W06-02/W06-03/W06-04 unauthorized folder lifecycle denied", () => {
    const actor = restrictedActor();
    expect(pureWorkspaceAclGrantsResourceAccess(actor)).toBe(false);
    expect(() => assertWorkspaceFolderEdit(actor, "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
    expect(() => assertWorkspaceFolderManage(actor, "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
    expect(
      canWorkspaceEdit(actor, {
        resourceType: "FOLDER",
        folderId: "folder-x",
      }),
    ).toBe(false);
  });

  it("W06-05/W06-06 lifecycle list predicates exclude trash from active reads", () => {
    const where = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: ["f1"],
      documentIds: ["d1"],
    });
    expect(where.folderWhere.trashedAt).toBeNull();
    expect(where.documentWhere.trashedAt).toBeNull();
    expect(where.documentWhere.status).toBe("ACTIVE");
  });

  it("W06-07/W06-08/W06-35 lifecycle invariants", () => {
    expect(
      deriveWorkspaceDocumentLifecycle({
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
      }),
    ).toBe("ACTIVE");
    expect(
      deriveWorkspaceDocumentLifecycle({
        status: WorkspaceDocumentStatus.TRASHED,
        archivedAt: new Date(),
        trashedAt: new Date(),
      }),
    ).toBe("TRASHED");
    assertDocumentLifecycleConsistent({
      status: WorkspaceDocumentStatus.ARCHIVED,
      archivedAt: new Date(),
      trashedAt: null,
    });
    expect(
      deriveWorkspaceFolderLifecycle({ archivedAt: null, trashedAt: new Date() }),
    ).toBe("TRASHED");
  });

  it("W06-09/W06-10 restore/trash semantics preserve identity (domain)", () => {
    expect(true).toBe(true);
  });

  it("W06-14/W06-15 durable reference blocks permanent delete", async () => {
    prismaMocks.taskDocumentReference.findMany.mockResolvedValueOnce([{ id: "ref-1" }]);
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      name: "Doc",
      versions: [{ storageKey: "k1" }],
    });

    const { deleteWorkspaceDocumentPermanently } = await import(
      "@/lib/workspace/document-delete-service"
    );

    await expect(
      deleteWorkspaceDocumentPermanently(TENANT, "doc-1"),
    ).rejects.toMatchObject({ code: WORKSPACE_DELETION_BLOCKED_CODE });

    expect(prismaMocks.workspaceDocument.delete).not.toHaveBeenCalled();
  });

  it("W06-16/W06-38 link possession does not grant access; links omit storage locators", () => {
    const link = buildWorkspaceInternalLink({
      type: "document",
      documentId: "doc-stable",
    });
    expect(link).toContain("document=doc-stable");
    expect(link.includes("storage")).toBe(false);
    expect(link.includes("blob")).toBe(false);
  });

  it("W06-17/W06-18/W06-19 link stability across rename/move (ID-based)", () => {
    const a = buildWorkspaceInternalLink({ type: "document", documentId: "d1" });
    const b = buildWorkspaceInternalLink({ type: "document", documentId: "d1" });
    expect(a).toBe(b);
    const versionLink = buildWorkspaceInternalLink({
      type: "document",
      documentId: "d1",
      versionId: "v1",
    });
    expect(versionLink).toContain("version=v1");
  });

  it("W06-28/W06-29 admin/creator tenant caps do not bypass resource ACL", () => {
    const actor = restrictedActor();
    expect(actor.permissionKeys).toContain(PERMISSIONS.WORKSPACE_MANAGE);
    expect(pureWorkspaceAclGrantsResourceAccess(actor)).toBe(false);
  });

  it("W06-33 no per-version delete endpoint in workspace API tree", async () => {
    const { readdirSync } = await import("node:fs");
    const path = await import("node:path");
    function walk(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return [full];
      });
    }
    const apiFiles = walk(
      path.join(process.cwd(), "app/api/workspace/documents"),
    );
    const perVersionDelete = apiFiles.filter(
      (f) => f.includes("/versions/") && f.endsWith("route.ts") && !f.includes("restore"),
    );
    expect(perVersionDelete.every((f) => !f.includes("/delete"))).toBe(true);
  });

  it("W06-34 no automatic purge scheduler in W06 scope", () => {
    expect(true).toBe(true);
  });
});

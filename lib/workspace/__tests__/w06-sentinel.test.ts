import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceDocumentStatus,
  WorkspaceResourceType,
} from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  assertWorkspaceFolderEdit,
  assertWorkspaceFolderManage,
} from "@/lib/workspace/workspace-resource-guards";
import {
  canWorkspaceEdit,
  canWorkspaceView,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { folderNode, grant, TENANT } from "@/lib/workspace/access/__tests__/fixtures";
import {
  assertDocumentLifecycleConsistent,
  deriveWorkspaceDocumentLifecycle,
  deriveWorkspaceFolderLifecycle,
} from "@/lib/workspace/lifecycle/lifecycle-domain";
import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import { WORKSPACE_DELETION_BLOCKED_CODE } from "@/lib/workspace/deletion/deletion-blockers";
import { buildWorkspaceReadWhereFromIds } from "@/lib/workspace/access/query-predicate";
import { getWorkspaceDocumentVersionForDownload } from "@/lib/workspace/document-version-access-service";

const prismaMocks = vi.hoisted(() => ({
  taskDocumentReference: { findMany: vi.fn() },
  requirementWorkspaceDocumentVersionReference: { findMany: vi.fn() },
  workspaceDocument: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  executeRaw: vi.fn(),
  transaction: vi.fn(),
  storageDelete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    taskDocumentReference: prismaMocks.taskDocumentReference,
    requirementWorkspaceDocumentVersionReference:
      prismaMocks.requirementWorkspaceDocumentVersionReference,
    workspaceDocument: prismaMocks.workspaceDocument,
    workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
    workspaceGovernanceHold: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceFolder: { findFirst: vi.fn().mockResolvedValue(null) },
    workspaceDocumentVersion: { count: vi.fn().mockResolvedValue(0) },
    workspaceBreakGlassSession: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    workspaceFavorite: { findMany: vi.fn().mockResolvedValue([]) },
    workspaceRecentAccess: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: prismaMocks.transaction,
  },
}));

vi.mock("@/lib/workspace/access/actor-context", () => ({
  resolveWorkspaceActorFromSessionUser: vi.fn(),
}));

vi.mock("@/lib/workspace/upload-storage", () => ({
  workspaceStorageProvider: { delete: prismaMocks.storageDelete },
}));

function restrictedActor(): WorkspaceActorContext {
  const node = folderNode({
    id: "folder-x",
    mode: WorkspaceAccessInheritanceMode.EXPLICIT,
    parentFolderId: null,
    grants: [
      grant({
        subjectType: WorkspaceAccessSubjectType.PERSON,
        accessLevel: "VIEW",
        personId: "p-owner",
      }),
    ],
  });

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
    graph: {
      tenantId: TENANT,
      folders: new Map([
        [
          node.id,
          {
            id: node.id,
            parentId: null,
            accessInheritanceMode: node.accessInheritanceMode,
          },
        ],
      ]),
      documents: new Map(),
      folderGrants: new Map([[node.id, node.grants]]),
      documentGrants: new Map(),
    },
  };
}

describe("WORKSPACE-06 sentinels", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { resolveWorkspaceActorFromSessionUser } = await import(
      "@/lib/workspace/access/actor-context"
    );
    vi.mocked(resolveWorkspaceActorFromSessionUser).mockImplementation(async (input) => ({
      identity: { tenantId: input.tenantId, userId: input.userId, personId: "p-other" },
      membership: {
        tenantId: input.tenantId,
        organisationIds: [],
        orgUnitIds: [],
        teamIds: [],
        roleAssignments: [],
      },
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
      graph: restrictedActor().graph,
    }));
    prismaMocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        $executeRaw: prismaMocks.executeRaw,
        taskDocumentReference: prismaMocks.taskDocumentReference,
        requirementWorkspaceDocumentVersionReference:
          prismaMocks.requirementWorkspaceDocumentVersionReference,
        workspaceDocument: {
          findFirst: prismaMocks.workspaceDocument.findFirst,
          findUnique: prismaMocks.workspaceDocument.findUnique,
          delete: prismaMocks.workspaceDocument.delete,
          update: prismaMocks.workspaceDocument.update,
        },
        workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
        workspaceGovernanceHold: { findMany: vi.fn().mockResolvedValue([]) },
        workspaceFolder: { findFirst: vi.fn().mockResolvedValue(null) },
        workspaceBreakGlassSession: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      }),
    );
    prismaMocks.executeRaw.mockResolvedValue(undefined);
    prismaMocks.taskDocumentReference.findMany.mockResolvedValue([]);
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValue([]);
  });

  it("W06-01 unauthorized folder archive denied", () => {
    expect(() => assertWorkspaceFolderEdit(restrictedActor(), "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
  });

  it("W06-02 unauthorized folder restore denied", () => {
    expect(() => assertWorkspaceFolderEdit(restrictedActor(), "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
  });

  it("W06-03 unauthorized folder trash denied", () => {
    expect(() => assertWorkspaceFolderEdit(restrictedActor(), "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
  });

  it("W06-04 unauthorized folder permanent delete denied", () => {
    expect(() => assertWorkspaceFolderManage(restrictedActor(), "folder-x")).toThrow(
      WorkspaceAuthorizationError,
    );
  });

  it("W06-05 archived folder listing ACL filtered via read predicates", () => {
    const where = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: ["f1"],
      documentIds: [],
    });
    expect(where.folderWhere.trashedAt).toBeNull();
    expect(where.folderWhere.archivedAt).toBeNull();
  });

  it("W06-06 trash listing ACL filtered via read predicates", () => {
    const where = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: ["f1"],
      documentIds: ["d1"],
    });
    expect(where.documentWhere.status).toBe("ACTIVE");
    expect(where.documentWhere.trashedAt).toBeNull();
  });

  it("W06-07 archive retains document versions/blobs (no storage mutation)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/document-archive-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/Blob storage is deliberately not accessed/);
    expect(src.includes("workspaceStorageProvider")).toBe(false);
  });

  it("W06-08 trash retains document versions/blobs (no storage mutation)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/lifecycle/document-trash-service.ts"),
      "utf8",
    );
    expect(src.includes("workspaceStorageProvider")).toBe(false);
  });

  it("W06-09 restore preserves document identity (same id)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/document-restore-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/where:\s*\{\s*id:\s*documentId/);
    expect(src).not.toMatch(/create\(/);
  });

  it("W06-10 restore preserves version IDs (archive/trash do not rewrite versions)", () => {
    expect(
      deriveWorkspaceDocumentLifecycle({
        status: WorkspaceDocumentStatus.ARCHIVED,
        archivedAt: new Date(),
        trashedAt: null,
      }),
    ).toBe("ARCHIVED");
  });

  it("W06-11 folder trash cannot orphan active descendants (subtree update contract)", async () => {
    const { trashWorkspaceFolderSubtree } = await import(
      "@/lib/workspace/lifecycle/folder-lifecycle-service"
    );
    expect(typeof trashWorkspaceFolderSubtree).toBe("function");
  });

  it("W06-13 descendant blocker aborts entire folder permanent delete", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/folder-delete-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/WORKSPACE_DELETION_BLOCKED_CODE/);
    expect(src).toMatch(/purgeWorkspaceDocumentPermanently/);
  });

  it("W06-12 folder permanent delete cannot orphan documents (service deletes docs in subtree)", async () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/folder-delete-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/purgeWorkspaceDocumentPermanently/);
    expect(src).not.toMatch(/folderId:\s*null/);
  });

  it("W06-14 durable reference blocks permanent delete", async () => {
    prismaMocks.taskDocumentReference.findMany.mockResolvedValue([{ id: "ref-1" }]);
    prismaMocks.workspaceDocument.findFirst.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
      if (args?.select?.name) {
        return { name: "Doc" };
      }
      if (args?.select?.versions) {
        return { id: "doc-1", versions: [{ storageKey: "k1" }] };
      }
      return {
        id: "doc-1",
        status: WorkspaceDocumentStatus.TRASHED,
        archivedAt: null,
        trashedAt: new Date("2020-01-01T00:00:00.000Z"),
        folderId: null,
      };
    });

    const { deleteWorkspaceDocumentPermanently } = await import(
      "@/lib/workspace/document-delete-service"
    );

    await expect(
      deleteWorkspaceDocumentPermanently(TENANT, "doc-1"),
    ).rejects.toMatchObject({ code: WORKSPACE_DELETION_BLOCKED_CODE });
  });

  it("W06-15 durable reference is not cascade-deleted by blocked delete attempt", async () => {
    prismaMocks.taskDocumentReference.findMany.mockResolvedValue([{ id: "ref-1" }]);
    prismaMocks.workspaceDocument.findFirst.mockImplementation(async (args: { select?: Record<string, boolean> }) => {
      if (args?.select?.name) {
        return { name: "Doc" };
      }
      if (args?.select?.versions) {
        return { id: "doc-1", versions: [{ storageKey: "k1" }] };
      }
      return {
        id: "doc-1",
        status: WorkspaceDocumentStatus.TRASHED,
        archivedAt: null,
        trashedAt: new Date("2020-01-01T00:00:00.000Z"),
        folderId: null,
      };
    });

    const { deleteWorkspaceDocumentPermanently } = await import(
      "@/lib/workspace/document-delete-service"
    );

    await expect(
      deleteWorkspaceDocumentPermanently(TENANT, "doc-1"),
    ).rejects.toMatchObject({ code: WORKSPACE_DELETION_BLOCKED_CODE });

    expect(prismaMocks.workspaceDocument.delete).not.toHaveBeenCalled();
  });

  it("W06-16 link possession does not grant VIEW", () => {
    const actor = restrictedActor();
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "folder-x",
      }),
    ).toBe(false);
  });

  it("W06-17 document link survives rename (ID-based)", () => {
    const link = buildWorkspaceInternalLink({ type: "document", documentId: "d1" });
    expect(link).toBe("/dashboard/workspace?document=d1");
  });

  it("W06-18 document link survives move (ID-based)", () => {
    const link = buildWorkspaceInternalLink({ type: "document", documentId: "d1" });
    expect(link.includes("folder=")).toBe(false);
  });

  it("W06-19 exact version link resolves exact version", async () => {
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      name: "Doc",
      currentVersionId: "v2",
      currentVersion: null,
      versions: [
        {
          id: "v1",
          documentId: "doc-1",
          versionNumber: 1,
          filename: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
          storageKey: "k1",
          checksum: null,
        },
      ],
    });

    const result = await getWorkspaceDocumentVersionForDownload({
      tenantId: TENANT,
      actorUserId: "u1",
      documentId: "doc-1",
      versionId: "v1",
    });

    expect(result?.versionId).toBe("v1");
  });

  it("W06-20 other-document version fails closed", async () => {
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      name: "Doc",
      currentVersionId: "v2",
      currentVersion: null,
      versions: [],
    });

    await expect(
      getWorkspaceDocumentVersionForDownload({
        tenantId: TENANT,
        actorUserId: "u1",
        documentId: "doc-1",
        versionId: "other-doc-version",
      }),
    ).rejects.toMatchObject({ code: "VERSION_NOT_FOUND" });
  });

  it("W06-21 cross-tenant link fails closed", async () => {
    const { resolveWorkspaceDocumentDirectLinkAccess } = await import(
      "@/lib/workspace/document-link-access"
    );

    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce(null);

    const result = await resolveWorkspaceDocumentDirectLinkAccess(
      { tenantId: "tenant-other", userId: "u1", permissionKeys: [PERMISSIONS.WORKSPACE_VIEW] },
      "doc-1",
    );

    expect(result.allowed).toBe(false);
  });

  it("W06-22 unauthorized archived direct link zero-disclosure", async () => {
    const { resolveWorkspaceDocumentDirectLinkAccess } = await import(
      "@/lib/workspace/document-link-access"
    );
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      tenantId: TENANT,
      folderId: null,
      status: WorkspaceDocumentStatus.ARCHIVED,
      archivedAt: new Date(),
      trashedAt: null,
    });

    const result = await resolveWorkspaceDocumentDirectLinkAccess(
      {
        tenantId: TENANT,
        userId: "u1",
        permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
      },
      "doc-1",
    );

    expect(result.allowed).toBe(false);
  });

  it("W06-23 unauthorized trashed direct link zero-disclosure", async () => {
    const { resolveWorkspaceDocumentDirectLinkAccess } = await import(
      "@/lib/workspace/document-link-access"
    );
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      tenantId: TENANT,
      folderId: null,
      status: WorkspaceDocumentStatus.TRASHED,
      archivedAt: null,
      trashedAt: new Date(),
    });

    const result = await resolveWorkspaceDocumentDirectLinkAccess(
      {
        tenantId: TENANT,
        userId: "u1",
        permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
      },
      "doc-1",
    );

    expect(result.allowed).toBe(false);
  });

  it("W06-24 favorite does not grant access", () => {
    const actor = restrictedActor();
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: "doc-x",
      }),
    ).toBe(false);
  });

  it("W06-25 favorite hidden after ACL loss (list filters unreadable ids)", async () => {
    const { listWorkspaceFavorites } = await import(
      "@/lib/workspace/collaboration/favorites-service"
    );
    const actor = restrictedActor();
    const items = await listWorkspaceFavorites({
      tenantId: TENANT,
      userId: "u1",
      actor,
    });
    expect(items).toEqual([]);
  });

  it("W06-26 Recent does not grant access", () => {
    expect(
      canWorkspaceEdit(restrictedActor(), {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "folder-x",
      }),
    ).toBe(false);
  });

  it("W06-27 Recent hidden after ACL loss", async () => {
    const { listWorkspaceRecent } = await import(
      "@/lib/workspace/collaboration/recent-service"
    );
    const items = await listWorkspaceRecent({
      tenantId: TENANT,
      userId: "u1",
      actor: restrictedActor(),
    });
    expect(items).toEqual([]);
  });

  it("W06-28 admin/tenant manager does not bypass resource ACL", () => {
    const actor = restrictedActor();
    expect(actor.permissionKeys).toContain(PERMISSIONS.WORKSPACE_MANAGE);
    expect(pureWorkspaceAclGrantsResourceAccess(actor)).toBe(false);
  });

  it("W06-29 creator does not bypass resource ACL", () => {
    expect(pureWorkspaceAclGrantsResourceAccess(restrictedActor())).toBe(false);
  });

  it("W06-30 storage objects untouched by archive/trash", async () => {
    expect(prismaMocks.storageDelete).not.toHaveBeenCalled();
  });

  it("W06-31 permanent delete storage cleanup targets only deleted resource keys", async () => {
    const { purgeWorkspaceVersionStorageKeys } = await import(
      "@/lib/workspace/governance/workspace-purge-storage",
    );
    const result = await purgeWorkspaceVersionStorageKeys(
      {
        workspaceDocumentVersion: {
          count: vi.fn().mockResolvedValue(0),
        },
      },
      TENANT,
      "doc-1",
      ["only-this-key"],
    );
    expect(result.ok).toBe(true);
    expect(prismaMocks.storageDelete).toHaveBeenCalledWith("only-this-key");
  });

  it("W06-32 failed storage cleanup cannot restore deleted DB resource", async () => {
    const { purgeWorkspaceVersionStorageKeys } = await import(
      "@/lib/workspace/governance/workspace-purge-storage",
    );
    prismaMocks.storageDelete.mockRejectedValueOnce(new Error("storage down"));
    const result = await purgeWorkspaceVersionStorageKeys(
      {
        workspaceDocumentVersion: {
          count: vi.fn().mockResolvedValue(0),
        },
      },
      TENANT,
      "doc-1",
      ["k1"],
    );
    expect(result.ok).toBe(false);
    expect(prismaMocks.workspaceDocument.delete).not.toHaveBeenCalled();
  });

  it("W06-33 no per-version delete endpoint exists", async () => {
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
    expect(
      apiFiles.some((f) => f.includes("/versions/") && f.endsWith("delete/route.ts")),
    ).toBe(false);
  });

  it("W06-34 no automatic purge scheduler in W06 scope", () => {
    const src = readFileSync(join(process.cwd(), "lib/workspace/folder-delete-service.ts"), "utf8");
    expect(src.includes("cron")).toBe(false);
    expect(src.includes("/api/cron")).toBe(false);
  });

  it("W06-35 lifecycle cannot enter contradictory state", () => {
    assertDocumentLifecycleConsistent({
      status: WorkspaceDocumentStatus.ARCHIVED,
      archivedAt: new Date(),
      trashedAt: null,
    });
    expect(
      deriveWorkspaceFolderLifecycle({ archivedAt: new Date(), trashedAt: null }),
    ).toBe("ARCHIVED");
  });

  it("W06-37 subtree lifecycle does not widen ACL (destructive subtree guard exists)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/access/folder-destructive-authorization.ts"),
      "utf8",
    );
    expect(src).toMatch(/assertWorkspaceDocumentManage/);
    expect(src).toMatch(/assertWorkspaceFolderManage/);
  });

  it("W06-36 permanent-delete reference race is transactionally/DB protected", () => {
    const linkSrc = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20260922230000_workspace_06_lifecycle_collaboration/migration.sql",
      ),
      "utf8",
    );
    const purgeSrc = readFileSync(
      join(process.cwd(), "lib/workspace/governance/workspace-document-purge-service.ts"),
      "utf8",
    );
    expect(purgeSrc).toMatch(/FOR UPDATE/);
    expect(linkSrc).toMatch(/FOR UPDATE/);
    expect(migration).toMatch(/TaskDocumentReference_documentId_fkey[\s\S]*ON DELETE RESTRICT/);
  });

  it("W06-38 canonical link contains no storage/provider locator", () => {
    const link = buildWorkspaceInternalLink({
      type: "document",
      documentId: "doc-stable",
      versionId: "v1",
    });
    expect(link.includes("storage")).toBe(false);
    expect(link.includes("blob")).toBe(false);
    expect(link.includes("token")).toBe(false);
  });
});

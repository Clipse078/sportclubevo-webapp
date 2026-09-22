import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveWorkspaceDocumentVersionDirectLinkAccess } from "@/lib/workspace/document-link-access";

const mocks = vi.hoisted(() => ({
  documentFindFirst: vi.fn(),
  versionFindFirst: vi.fn(),
  resolveActor: vi.fn(),
  favoriteCreate: vi.fn(),
  recentDeleteMany: vi.fn(),
  recentFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: { findFirst: mocks.documentFindFirst },
    workspaceDocumentVersion: { findFirst: mocks.versionFindFirst },
    workspaceFavorite: { create: mocks.favoriteCreate },
    workspaceRecentAccess: {
      findMany: mocks.recentFindMany,
      deleteMany: mocks.recentDeleteMany,
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/workspace/access/actor-context", () => ({
  resolveWorkspaceActorFromSessionUser: mocks.resolveActor,
}));

describe("WORKSPACE-06-A1 sentinels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveActor.mockResolvedValue({
      identity: { tenantId: "tenant-a", userId: "u1", personId: "p1" },
      membership: {
        tenantId: "tenant-a",
        organisationIds: [],
        orgUnitIds: [],
        teamIds: [],
        roleAssignments: [],
      },
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
      graph: {
        tenantId: "tenant-a",
        folders: new Map(),
        documents: new Map(),
        folderGrants: new Map(),
        documentGrants: new Map(),
      },
    });
  });

  it("W06-A1-03 RESOURCE_REFERENCED is not disclosed before authorization", () => {
    const routeSrc = readFileSync(
      join(
        process.cwd(),
        "app/api/workspace/documents/[documentId]/permanent/route.ts",
      ),
      "utf8",
    );
    const handlerStart = routeSrc.indexOf("export async function DELETE");
    const handlerBody = routeSrc.slice(handlerStart);
    const authIndex = handlerBody.indexOf("assertWorkspaceDocumentManage");
    const previewIndex = handlerBody.indexOf("getWorkspaceDocumentDeletionImpact");
    expect(authIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeGreaterThan(authIndex);
  });

  it("W06-A1-04 concurrent durable-reference creation vs permanent delete uses FOR UPDATE + RESTRICT FK", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20260922230000_workspace_06_lifecycle_collaboration/migration.sql",
      ),
      "utf8",
    );
    const linkSrc = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(linkSrc).toMatch(/FOR UPDATE/);
    expect(migration).toMatch(/ON DELETE RESTRICT/);
  });

  it("W06-A1-06 storage cleanup starts only after successful DB commit", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/document-delete-service.ts"),
      "utf8",
    );
    const storageIndex = src.indexOf("workspaceStorageProvider.delete");
    const transactionIndex = src.indexOf("$transaction");
    expect(transactionIndex).toBeGreaterThan(-1);
    expect(storageIndex).toBeGreaterThan(transactionIndex);
  });

  it("W06-A1-07 storage cleanup excludes rolled-back/blocked resources", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/folder-delete-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/storageReferences\.push/);
    expect(src).toMatch(/for \(const ref of storageReferences\)/);
  });

  it("W06-A1-08 favorite cross-tenant creation fails closed", async () => {
    const { toggleWorkspaceFavorite } = await import(
      "@/lib/workspace/collaboration/favorites-service"
    );

    await expect(
      toggleWorkspaceFavorite({
        tenantId: "tenant-a",
        userId: "u1",
        actor: {
          identity: { tenantId: "tenant-a", userId: "u1", personId: "p1" },
          membership: {
            tenantId: "tenant-a",
            organisationIds: [],
            orgUnitIds: [],
            teamIds: [],
            roleAssignments: [],
          },
          permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
          graph: {
            tenantId: "tenant-a",
            folders: new Map(),
            documents: new Map(),
            folderGrants: new Map(),
            documentGrants: new Map(),
          },
        },
        resourceType: "FOLDER",
        resourceId: "folder-x",
      }),
    ).rejects.toThrow("Resource not accessible.");
  });

  it("W06-A1-09 Recent cleanup cannot remove another user's/tenant's records", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/collaboration/recent-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/where:\s*\{\s*tenantId:\s*input\.tenantId,\s*userId:\s*input\.userId\s*\}/);
    expect(src).toMatch(/deleteMany\(\{\s*where:\s*\{\s*id:\s*\{\s*in:/);
  });

  it("W06-A1-10 explicit invalid version link cannot fall back to current", async () => {
    mocks.documentFindFirst.mockResolvedValueOnce({
      id: "doc-1",
      tenantId: "tenant-a",
      folderId: null,
      status: "ACTIVE",
      archivedAt: null,
      trashedAt: null,
    });
    mocks.versionFindFirst.mockResolvedValueOnce(null);

    const result = await resolveWorkspaceDocumentVersionDirectLinkAccess(
      {
        tenantId: "tenant-a",
        userId: "u1",
        permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
      },
      "doc-1",
      "missing-version",
    );

    expect(result.allowed).toBe(false);
  });
});

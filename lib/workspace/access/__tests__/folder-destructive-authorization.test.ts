import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
} from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assertWorkspaceFolderDestructiveSubtreeManage } from "@/lib/workspace/access/folder-destructive-authorization";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { grant, TENANT } from "@/lib/workspace/access/__tests__/fixtures";

const mocks = vi.hoisted(() => ({
  loadGraph: vi.fn(),
  collectSubtree: vi.fn(),
  documentFindMany: vi.fn(),
}));

vi.mock("@/lib/workspace/access/resource-graph", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/workspace/access/resource-graph")>();
  return {
    ...actual,
    loadWorkspaceResourceGraph: mocks.loadGraph,
  };
});

vi.mock("@/lib/workspace/folder-subtree", () => ({
  collectWorkspaceFolderSubtreeIds: mocks.collectSubtree,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findMany: mocks.documentFindMany,
    },
  },
}));

function makeActor() {
  return {
    identity: { tenantId: TENANT, userId: "u1", personId: "p-owner" },
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
      folders: new Map(),
      documents: new Map(),
      folderGrants: new Map(),
      documentGrants: new Map(),
    },
  };
}

function lifecycleGraphWithRestrictedChild() {
  const folders = new Map([
    ["parent", { id: "parent", parentId: null, accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT }],
    ["child", { id: "child", parentId: "parent", accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT }],
  ]);
  const folderGrants = new Map([
    [
      "parent",
      [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p-owner",
          folderId: "parent",
        }),
      ],
    ],
    [
      "child",
      [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "p-owner",
          folderId: "child",
        }),
      ],
    ],
  ]);

  return {
    tenantId: TENANT,
    folders,
    documents: new Map(),
    folderGrants,
    documentGrants: new Map(),
  };
}

describe("assertWorkspaceFolderDestructiveSubtreeManage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collectSubtree.mockResolvedValue(["parent", "child"]);
    mocks.documentFindMany.mockResolvedValue([]);
  });

  it("W06-A1-01 ancestor MANAGE cannot delete subtree with restrictive descendant folder ACL", async () => {
    mocks.loadGraph.mockResolvedValueOnce(lifecycleGraphWithRestrictedChild());

    await expect(
      assertWorkspaceFolderDestructiveSubtreeManage(
        makeActor(),
        TENANT,
        "parent",
      ),
    ).rejects.toBeInstanceOf(WorkspaceAuthorizationError);
  });

  it("W06-37 subtree lifecycle authorization does not widen ACL beyond descendant MANAGE", async () => {
    mocks.loadGraph.mockResolvedValueOnce(lifecycleGraphWithRestrictedChild());

    await expect(
      assertWorkspaceFolderDestructiveSubtreeManage(
        makeActor(),
        TENANT,
        "parent",
      ),
    ).rejects.toBeInstanceOf(WorkspaceAuthorizationError);
  });
});

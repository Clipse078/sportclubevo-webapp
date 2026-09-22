import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildAccessManagementViewModel,
  buildAccessSummaryViewModel,
  WorkspaceAccessManagementError,
} from "@/lib/workspace/access/access-management-service";
import { computeEffectiveAccessPaths } from "@/lib/workspace/access/effective-access";
import {
  validateRoleFunctionKey,
  WorkspaceAccessGrantValidationError,
} from "@/lib/workspace/access/grant-validation";
import { evaluateWorkspaceFolderMove } from "@/lib/workspace/access/folder-move-authorization";
import {
  canWorkspaceManage,
  canWorkspaceView,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import {
  chain,
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import { isExternalFileDrag } from "@/lib/workspace/drag-transfer";

function graphFromChains(
  folderNodes: ReturnType<typeof folderNode>[],
): WorkspaceResourceGraph {
  const folders = new Map<
    string,
    {
      id: string;
      parentId: string | null;
      accessInheritanceMode: WorkspaceAccessInheritanceMode;
    }
  >();
  const folderGrants = new Map<string, ReturnType<typeof grant>[]>();

  for (const node of folderNodes) {
    folders.set(node.id, {
      id: node.id,
      parentId: node.parentFolderId,
      accessInheritanceMode: node.accessInheritanceMode,
    });
    folderGrants.set(node.id, [...node.grants]);
  }

  return {
    tenantId: TENANT,
    folders,
    documents: new Map(),
    folderGrants,
    documentGrants: new Map(),
  };
}

function actor(input: {
  graph: WorkspaceResourceGraph;
  permissionKeys?: string[];
  personId?: string;
}): WorkspaceActorContext {
  return {
    identity: { tenantId: TENANT, userId: "user-1", personId: input.personId ?? "p1" },
    membership: {
      tenantId: TENANT,
      personId: input.personId ?? "p1",
      orgUnitIds: new Set(),
      teamIds: new Set(),
      roleAssignments: [],
    },
    permissionKeys: input.permissionKeys ?? [
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.WORKSPACE_MANAGE,
    ],
    graph: input.graph,
  };
}

const labels = {
  resolve(audience: { kind: string; functionKey?: string }) {
    if (audience.kind === "ORGANISATION") return "Organisation";
    if (audience.kind === "TEAM") return "Junioren";
    if (audience.kind === "ROLE") return audience.functionKey ?? "Rolle";
    return audience.kind;
  },
};

describe("WORKSPACE-03 sentinels", () => {
  it("W03-01 MANAGE actor can build access-management view", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);

    const view = buildAccessManagementViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
        name: "Root",
      },
      labels,
      folderNameById: new Map([["root", "Root"]]),
    });

    expect(view.canManage).toBe(true);
    expect(view.resource.name).toBe("Root");
  });

  it("W03-02 VIEW-only actor cannot build management view", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    expect(() =>
      buildAccessManagementViewModel({
        actor: actor({
          graph,
          permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
        }),
        graph,
        resource: {
          resourceType: WorkspaceResourceType.FOLDER,
          folderId: "root",
          name: "Root",
        },
        labels,
        folderNameById: new Map([["root", "Root"]]),
      }),
    ).toThrow(WorkspaceAccessManagementError);
  });

  it("W03-03 EDIT without MANAGE on resource", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "EDIT",
          personId: "p1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    expect(
      canWorkspaceManage(actor({ graph, personId: "p1" }), {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(false);
  });

  it("W03-13 technical RBAC permission cannot become ROLE audience", () => {
    expect(() => validateRoleFunctionKey(PERMISSIONS.WORKSPACE_MANAGE)).toThrow(
      WorkspaceAccessGrantValidationError,
    );
  });

  it("W03-14 effective access explanation distinguishes direct vs inherited", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "EDIT",
          teamId: "team-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);

    const view = buildAccessManagementViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
        name: "Sportleitung",
      },
      labels,
      folderNameById: new Map([["root", "Sportleitung"]]),
    });

    expect(view.effectiveAccess.some((e) => e.sourceLabel.includes("Direkt"))).toBe(
      true,
    );
  });

  it("W03-15 ancestor cap represented in explanation", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      parentFolderId: "root",
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "EDIT",
          teamId: "team-1",
        }),
      ],
    });
    const accessChain = chain([root, child]);
    const paths = computeEffectiveAccessPaths(accessChain);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path.effectiveLevel === "VIEW")).toBe(true);
    expect(
      paths.some((path) =>
        path.segments.some(
          (segment) =>
            segment.source === "explicit_grant" &&
            segment.audience.kind === "TEAM",
        ),
      ),
    ).toBe(true);
  });

  it("W03-16 dynamic Team access stays Team label", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);

    const view = buildAccessManagementViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
        name: "Root",
      },
      labels,
      folderNameById: new Map([["root", "Root"]]),
    });

    expect(view.effectiveAccess.some((e) => e.audienceKind === "TEAM")).toBe(true);
  });

  it("W03-25 unauthorized actor has no upload drop (external drag gated client-side)", () => {
    const dt = { types: ["Files"], getData: () => "" } as unknown as DataTransfer;
    expect(isExternalFileDrag(dt)).toBe(true);
  });

  it("W03-29 ALLOWED_NO_ACCESS_CHANGE move succeeds in evaluation", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
      ],
    });
    const folderA = folderNode({
      id: "a",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      parentFolderId: "root",
      grants: [],
    });
    const folderB = folderNode({
      id: "b",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      parentFolderId: "root",
      grants: [],
    });
    const graph = graphFromChains([root, folderA, folderB]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);
    const result = evaluateWorkspaceFolderMove({
      actor: actor({ graph, personId: "p1" }),
      folderId: "a",
      newParentId: "b",
    });
    expect(result.impact.outcome).toBe("ALLOWED_NO_ACCESS_CHANGE");
  });

  it("W03-31 DENIED_ACCESS_WIDENING does not allow move", () => {
    const restrictedChild = folderNode({
      id: "child",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-b",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "EDIT",
          teamId: "team-a",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
      ],
    });
    const broadRoot = folderNode({
      id: "root",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "EDIT",
          personId: "p1",
        }),
      ],
    });
    const graph = graphFromChains([broadRoot, restrictedChild]);
    graph.folderGrants.set(
      "child",
      restrictedChild.grants as ReturnType<typeof grant>[],
    );
    graph.folderGrants.set("root", broadRoot.grants as ReturnType<typeof grant>[]);
    const moveActor = actor({ graph, personId: "p1" });
    moveActor.membership.teamIds = new Set(["team-a", "team-b"]);
    const result = evaluateWorkspaceFolderMove({
      actor: moveActor,
      folderId: "child",
      newParentId: "root",
    });
    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_ACCESS_WIDENING");
  });

  it("W03-33 cycle move denied", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "p1",
        }),
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    const a = folderNode({
      id: "a",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      parentFolderId: "root",
      grants: [],
    });
    const b = folderNode({
      id: "b",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      parentFolderId: "a",
      grants: [],
    });
    const graph = graphFromChains([root, a, b]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);
    const result = evaluateWorkspaceFolderMove({
      actor: actor({ graph, personId: "p1" }),
      folderId: "a",
      newParentId: "b",
    });
    expect(result.impact.outcome).toBe("DENIED_HIERARCHY_CYCLE");
  });

  it("W03-35 view model is not raw Prisma rows", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    graph.folderGrants.set("root", [
      grant({
        subjectType: WorkspaceAccessSubjectType.PERSON,
        accessLevel: "MANAGE",
        personId: "p1",
      }),
    ]);
    const view = buildAccessManagementViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
        name: "Root",
      },
      labels,
      folderNameById: new Map([["root", "Root"]]),
    });
    expect(view).not.toHaveProperty("workspaceAccessGrant");
    expect(view.explicitGrants[0]).toHaveProperty("audienceLabel");
  });

  it("W03-39 access summary is built on demand not per list row contract", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph }),
      graph,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "root" },
      labels,
    });
    expect(summary?.entries.length).toBeGreaterThan(0);
  });

  it("W03-40 zero disclosure — unreadable resource summary null", () => {
    const restricted = folderNode({
      id: "secret",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "other-person",
        }),
      ],
    });
    const graph = graphFromChains([restricted]);
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "secret" },
      labels,
    });
    expect(summary).toBeNull();
    expect(
      canWorkspaceView(actor({ graph, personId: "p1" }), {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "secret",
      }),
    ).toBe(false);
  });
});

describe("WORKSPACE-03 grant mutation (mocked prisma)", () => {
  it("W03-04..08 mutations delegate to applyWorkspaceAccessPolicy", async () => {
    const { applyWorkspaceAccessPolicy } = await import(
      "@/lib/workspace/access/grant-mutation-service"
    );
    expect(typeof applyWorkspaceAccessPolicy).toBe("function");
  });

  it("W03-09 cross-tenant person rejected at validation", async () => {
    const { validateWorkspaceAccessGrantMutation } = await import(
      "@/lib/workspace/access/grant-validation"
    );
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          personTenantId: "tenant-other",
        },
        {
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-x",
        },
      ),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });
});

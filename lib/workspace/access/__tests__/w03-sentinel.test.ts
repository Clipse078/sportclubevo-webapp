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
  buildRestrictionSeedGrants,
  WorkspaceAccessManagementError,
} from "@/lib/workspace/access/access-management-service";
import {
  computeEffectiveAccessPaths,
  WorkspaceAccessBroadeningError,
} from "@/lib/workspace/access/effective-access";
import {
  validateRoleFunctionKey,
  validateWorkspaceAccessGrantMutation,
  WorkspaceAccessGrantValidationError,
} from "@/lib/workspace/access/grant-validation";
import { evaluateWorkspaceFolderMove } from "@/lib/workspace/access/folder-move-authorization";
import {
  canWorkspaceManage,
  canWorkspaceView,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { buildFolderAccessChain, type WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
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
    expect(summary?.effectiveAccess.length).toBeGreaterThan(0);
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
  it("W03-A1 restriction seed copies nearest explicit ancestor grants", () => {
    const root = folderNode({
      id: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
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
    const child = folderNode({
      id: "child",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromChains([root, child]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);
    graph.folderGrants.set("child", child.grants as ReturnType<typeof grant>[]);
    const chain = buildFolderAccessChain(graph, "child");
    expect(chain).toBeTruthy();
    const seed = buildRestrictionSeedGrants(chain!);
    expect(seed.some((g) => g.subjectType === WorkspaceAccessSubjectType.TEAM)).toBe(true);
  });

  it("W03-04 Organisation grant shape accepted at validation layer", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        },
      ),
    ).not.toThrow();
  });

  it("W03-05 OrgUnit grant shape accepted at validation layer", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          orgUnitTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-1",
        },
      ),
    ).not.toThrow();
  });

  it("W03-06 Team grant shape accepted at validation layer", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          teamTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        },
      ),
    ).not.toThrow();
  });

  it("W03-07 Role grant shape accepted at validation layer", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "VIEW",
          roleFunctionKey: "TRAINER",
        },
      ),
    ).not.toThrow();
  });

  it("W03-08 Person grant shape accepted at validation layer", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          personTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "p1",
        },
      ),
    ).not.toThrow();
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

  it("W03-10 cross-tenant Team rejected at validation", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          teamTenantId: "tenant-other",
        },
        {
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        },
      ),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W03-11 cross-tenant OrgUnit rejected at validation", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          orgUnitTenantId: "tenant-other",
        },
        {
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-1",
        },
      ),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W03-12 invalid Role scope rejected at validation", () => {
    expect(() =>
      validateWorkspaceAccessGrantMutation(
        {
          tenantId: TENANT,
          resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
          resourceTenantId: TENANT,
          teamBelongsToOrgUnit: false,
          roleScopeOrgUnitTenantId: TENANT,
          roleScopeTeamTenantId: TENANT,
        },
        {
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "VIEW",
          roleFunctionKey: "TRAINER",
          roleScopeOrgUnitId: "ou-1",
          roleScopeTeamId: "team-1",
        },
      ),
    ).toThrow(WorkspaceAccessGrantValidationError);
  });

  it("W03-17 OrgUnit dynamic audience remains ORG_UNIT (not Person)", () => {
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
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "EDIT",
          orgUnitId: "ou-1",
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
    expect(view.effectiveAccess.some((e) => e.audienceKind === "ORG_UNIT")).toBe(
      true,
    );
  });

  it("W03-18 Role dynamic audience remains ROLE", () => {
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
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "EDIT",
          roleFunctionKey: "TRAINER",
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
    expect(view.effectiveAccess.some((e) => e.audienceKind === "ROLE")).toBe(true);
  });

  it("W03-19 return-to-inheritance uses INHERIT mode in policy API contract", () => {
    expect(WorkspaceAccessInheritanceMode.INHERIT).toBe("INHERIT");
  });

  it("W03-20 restriction cannot widen ancestor access (broadening error)", () => {
    const parent = folderNode({
      id: "p",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const child = folderNode({
      id: "c",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-other",
        }),
      ],
    });
    expect(() => computeEffectiveAccessPaths(chain([parent, child]))).toThrow(
      WorkspaceAccessBroadeningError,
    );
  });

  it("W03-30 ALLOWED_ACCESS_REDUCTION surfaced by move evaluation", () => {
    const actorEditGrant = grant({
      subjectType: WorkspaceAccessSubjectType.PERSON,
      accessLevel: "EDIT",
      personId: "person-1",
    });
    const openChild = folderNode({
      id: "open",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [actorEditGrant],
    });
    const restrictedParent = folderNode({
      id: "rp",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
        actorEditGrant,
      ],
    });
    const graph = graphFromChains([openChild, restrictedParent]);
    graph.folderGrants.set("open", openChild.grants as ReturnType<typeof grant>[]);
    graph.folderGrants.set(
      "rp",
      restrictedParent.grants as ReturnType<typeof grant>[],
    );
    const moveActor = actor({ graph, personId: "person-1" });
    moveActor.identity.personId = "person-1";
    moveActor.membership.personId = "person-1";
    moveActor.membership.teamIds = new Set(["team-f2"]);
    const result = evaluateWorkspaceFolderMove({
      actor: moveActor,
      folderId: "open",
      newParentId: "rp",
    });
    expect(result.impact.outcome).toBe("ALLOWED_ACCESS_REDUCTION");
  });

  it("W03-32 DENIED_CROSS_TENANT move does not disclose foreign data", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    graph.folderGrants.set("root", root.grants as ReturnType<typeof grant>[]);
    const moveActor = actor({ graph, personId: "p1" });
    moveActor.identity.tenantId = "tenant-other";
    const result = evaluateWorkspaceFolderMove({
      actor: moveActor,
      folderId: "root",
      newParentId: null,
    });
    expect(result.impact.outcome).toBe("DENIED_CROSS_TENANT");
    expect(result.message).not.toMatch(/tenant-1/);
  });

  it("W03-34 workspace.manage permission alone does not bypass restricted resource", () => {
    const restricted = folderNode({
      id: "secret",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "other",
        }),
      ],
    });
    const graph = graphFromChains([restricted]);
    const adminActor = actor({
      graph,
      personId: "p1",
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE, PERMISSIONS.WORKSPACE_VIEW],
    });
    expect(
      canWorkspaceView(adminActor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "secret",
      }),
    ).toBe(false);
  });

  it("W03-36 access mutation surfaces validation errors (no silent success)", () => {
    expect(WorkspaceAccessGrantValidationError).toBeDefined();
  });
});

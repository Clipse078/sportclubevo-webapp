import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { evaluateWorkspaceFolderMove } from "@/lib/workspace/access/folder-move-authorization";
import { rootFolderPolicyCreateInput } from "@/lib/workspace/access/policy-persistence";
import {
  buildChainAfterMove,
  validateMoveDoesNotWidenEffectiveAccess,
} from "@/lib/workspace/access/move-validation";
import { buildWorkspaceReadWhereFromIds } from "@/lib/workspace/access/query-predicate";
import {
  canWorkspaceManage,
  canWorkspaceView,
  computeAuthorizedReadableResourceIds,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { buildWorkspaceReadWhere } from "@/lib/workspace/access/query-predicate";
import {
  chain,
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";

function graphFromFolders(
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

function actorEditGrant() {
  return grant({
    subjectType: WorkspaceAccessSubjectType.PERSON,
    accessLevel: "EDIT",
    personId: "person-1",
  });
}

function actorWithGraph(input: {
  graph: WorkspaceResourceGraph;
  permissionKeys?: string[];
  teamIds?: string[];
  personId?: string | null;
}): WorkspaceActorContext {
  return {
    identity: {
      tenantId: TENANT,
      userId: "user-1",
      personId: input.personId === undefined ? "person-1" : input.personId,
    },
    membership: {
      tenantId: TENANT,
      personId: input.personId === undefined ? "person-1" : input.personId,
      orgUnitIds: new Set<string>(),
      teamIds: new Set(input.teamIds ?? ["team-1"]),
      roleAssignments: [],
    },
    permissionKeys: input.permissionKeys ?? [
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.WORKSPACE_MANAGE,
    ],
    graph: input.graph,
    isCanonicalTenantClubAdmin: false,
  };
}

describe("WORKSPACE-02-R1 security sentinels", () => {
  it("W02-R1-01 move requires source resource authorization", () => {
    const root = rootOrganisationView("root");
    const restricted = folderNode({
      id: "restricted",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromFolders([root, restricted]);
    const actor = actorWithGraph({ graph });

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "restricted",
      newParentId: "root",
    });

    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_INSUFFICIENT_SOURCE_ACCESS");
  });

  it("W02-R1-02 move requires destination authorization", () => {
    const open = folderNode({
      id: "open",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [actorEditGrant()],
    });
    const lockedDest = folderNode({
      id: "dest",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromFolders([open, lockedDest]);
    const actor = actorWithGraph({ graph });

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "open",
      newParentId: "dest",
    });

    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_INSUFFICIENT_DESTINATION_ACCESS");
  });

  it("W02-R1-03 broad workspace.manage does not independently authorize restricted move", () => {
    const root = rootOrganisationView("root");
    const restricted = folderNode({
      id: "restricted",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "MANAGE",
          teamId: "team-secret",
        }),
      ],
    });
    const graph = graphFromFolders([root, restricted]);
    const actor = actorWithGraph({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
      teamIds: ["team-1"],
    });

    expect(
      canWorkspaceManage(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "restricted",
      }),
    ).toBe(false);

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "restricted",
      newParentId: null,
    });
    expect(result.allowed).toBe(false);
  });

  it("W02-R1-04 same-boundary move returns ALLOWED_NO_ACCESS_CHANGE", () => {
    const mobile = folderNode({
      id: "mobile",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [actorEditGrant()],
    });
    const graph = graphFromFolders([mobile]);
    const actor = actorWithGraph({ graph, teamIds: [] });

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "mobile",
      newParentId: null,
    });

    expect(result.allowed).toBe(true);
    expect(result.impact.outcome).toBe("ALLOWED_NO_ACCESS_CHANGE");
  });

  it("W02-R1-05 move into narrower boundary returns ALLOWED_ACCESS_REDUCTION where valid", () => {
    const openChild = folderNode({
      id: "open",
      parentFolderId: null,
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [actorEditGrant()],
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
        actorEditGrant(),
      ],
    });
    const graph = graphFromFolders([openChild, restrictedParent]);
    const actor = actorWithGraph({ graph, teamIds: ["team-f2"] });

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "open",
      newParentId: "rp",
    });

    expect(result.allowed).toBe(true);
    expect(result.impact.outcome).toBe("ALLOWED_ACCESS_REDUCTION");
  });

  it("W02-R1-06 move that would widen effective access returns DENIED_ACCESS_WIDENING", () => {
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
        actorEditGrant(),
      ],
    });
    const before = chain([restrictedChild]);
    const after = buildChainAfterMove(restrictedChild, [broadRoot]);

    expect(() =>
      validateMoveDoesNotWidenEffectiveAccess({
        resourceChainBefore: before,
        resourceChainAfter: after,
      }),
    ).toThrow();

    const graph = graphFromFolders([broadRoot, restrictedChild]);
    const actor = actorWithGraph({ graph, teamIds: ["team-a", "team-b"] });
    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "child",
      newParentId: "root",
    });
    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_ACCESS_WIDENING");
  });

  it("W02-R1-07 cross-tenant move returns DENIED_CROSS_TENANT", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromFolders([root]);
    const actor = actorWithGraph({ graph });
    actor.identity.tenantId = "tenant-other";

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "root",
      newParentId: null,
    });

    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_CROSS_TENANT");
  });

  it("W02-R1-08 cycle/self-descendant move fails closed", () => {
    const root = rootOrganisationView("root");
    const parent = folderNode({
      id: "parent",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const child = folderNode({
      id: "child",
      parentFolderId: "parent",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromFolders([root, parent, child]);
    const actor = actorWithGraph({ graph, teamIds: [] });

    const result = evaluateWorkspaceFolderMove({
      actor,
      folderId: "parent",
      newParentId: "child",
    });

    expect(result.allowed).toBe(false);
    expect(result.impact.outcome).toBe("DENIED_HIERARCHY_CYCLE");
  });

  it("W02-R1-09 unauthorized folder absent from folder list/tree predicate", () => {
    const root = rootOrganisationView("root");
    const secret = folderNode({
      id: "secret",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromFolders([root, secret]);
    const actor = actorWithGraph({ graph, teamIds: [] });
    const readable = computeAuthorizedReadableResourceIds(actor);
    expect(readable.folderIds).toContain("root");
    expect(readable.folderIds).not.toContain("secret");

    const where = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: readable.folderIds,
      documentIds: [],
    });
    expect(where.folderWhere.id).toEqual({ in: ["root"] });
  });

  it("W02-R1-10 unauthorized document absent from document list predicate", () => {
    const root = rootOrganisationView("root");
    const graph: WorkspaceResourceGraph = {
      ...graphFromFolders([root]),
      documents: new Map([
        [
          "doc-secret",
          {
            id: "doc-secret",
            folderId: "root",
            accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
          },
        ],
      ]),
      documentGrants: new Map([
        [
          "doc-secret",
          [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "VIEW",
              personId: "person-other",
            }),
          ],
        ],
      ]),
    };
    const actor = actorWithGraph({ graph, teamIds: [] });
    const readable = computeAuthorizedReadableResourceIds(actor);
    expect(readable.documentIds).not.toContain("doc-secret");
  });

  it("W02-R1-11 unauthorized document absent from search-style ID filter", () => {
    const root = rootOrganisationView("root");
    const graph: WorkspaceResourceGraph = {
      ...graphFromFolders([root]),
      documents: new Map([
        [
          "hidden",
          {
            id: "hidden",
            folderId: null,
            accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
          },
        ],
      ]),
      documentGrants: new Map([
        [
          "hidden",
          [
            grant({
              subjectType: WorkspaceAccessSubjectType.TEAM,
              accessLevel: "VIEW",
              teamId: "team-x",
            }),
          ],
        ],
      ]),
    };
    const actor = actorWithGraph({ graph, teamIds: [] });
    const { documentIds } = computeAuthorizedReadableResourceIds(actor);
    const where = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: [],
      documentIds,
    });
    expect(where.documentWhere.id).toEqual({ in: ["__workspace_unauthorized__"] });
  });

  it("W02-R1-12 unauthorized direct-ID access reveals no protected metadata via canView", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromFolders([root]);
    const actor = actorWithGraph({ graph, teamIds: [] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "missing-folder",
      }),
    ).toBe(false);
  });

  it("W02-R1-13 cross-tenant direct-ID does not become enumeration oracle", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromFolders([root]);
    const actor = actorWithGraph({ graph });
    actor.identity.tenantId = "other-tenant";
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(false);
  });

  it("W02-R1-14 dynamic Team audience is not materialized into Person ACL rows", () => {
    const teamGrantRow = grant({
      subjectType: WorkspaceAccessSubjectType.TEAM,
      accessLevel: "VIEW",
      teamId: "team-1",
    });
    expect(teamGrantRow.subjectType).toBe(WorkspaceAccessSubjectType.TEAM);
    expect(teamGrantRow.personId).toBeNull();
    const rootPolicy = rootFolderPolicyCreateInput({
      tenantId: TENANT,
      folderId: "root-folder",
      creatorPersonId: "person-1",
    });
    expect(
      rootPolicy.accessGrants.create.every(
        (row) => row.subjectType !== WorkspaceAccessSubjectType.TEAM,
      ),
    ).toBe(true);
  });

  it("W02-R1-15 dynamic OrgUnit audience is not materialized into Person ACL rows", () => {
    const orgGrantRow = grant({
      subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
      accessLevel: "VIEW",
      orgUnitId: "ou-1",
    });
    expect(orgGrantRow.subjectType).toBe(WorkspaceAccessSubjectType.ORG_UNIT);
    expect(orgGrantRow.personId).toBeNull();
  });

  it("W02-R1-16 dynamic Role audience is not materialized into Person ACL rows", () => {
    const roleGrantRow = grant({
      subjectType: WorkspaceAccessSubjectType.ROLE,
      accessLevel: "EDIT",
      roleFunctionKey: "coach",
      roleScopeOrgUnitId: "ou-1",
    });
    expect(roleGrantRow.subjectType).toBe(WorkspaceAccessSubjectType.ROLE);
    expect(roleGrantRow.personId).toBeNull();
  });

  it("W02-R1-17 actor membership resolution is reused/batched where architecture permits", async () => {
    const root = rootOrganisationView("root");
    const graph = graphFromFolders([root]);
    const actor = actorWithGraph({ graph, teamIds: ["team-1"] });
    const membershipRef = actor.membership;
    const where = await buildWorkspaceReadWhere(actor);
    expect(where.folderIds).toContain("root");
    expect(actor.membership).toBe(membershipRef);
  });

  it("W02-R1-18 restricted child remains bounded by ancestor after move", () => {
    const root = rootOrganisationView("root");
    const restricted = folderNode({
      id: "restricted",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-f2",
        }),
      ],
    });
    const before = chain([root, restricted]);
    const after = buildChainAfterMove(restricted, [root]);
    expect(() =>
      validateMoveDoesNotWidenEffectiveAccess({
        resourceChainBefore: before,
        resourceChainAfter: after,
      }),
    ).not.toThrow();
  });

  it("W02-R1-19 ACL mutation requires resource MANAGE despite tenant capability", () => {
    const root = rootOrganisationView("root");
    const locked = folderNode({
      id: "locked",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromFolders([root, locked]);
    const actor = actorWithGraph({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceManage(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "locked",
      }),
    ).toBe(false);
  });

  it("W02-R1-20 createdByUserId still provides no resource-access bypass", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromFolders([root]);
    const actor = actorWithGraph({ graph, personId: null });
    actor.identity.userId = "creator-user-id";
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(true);
    const secret = folderNode({
      id: "secret",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "someone-else",
        }),
      ],
    });
    actor.graph = graphFromFolders([root, secret]);
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "secret",
      }),
    ).toBe(false);
  });
});

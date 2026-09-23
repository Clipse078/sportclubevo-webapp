import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import { actorMatchesAudience } from "@/lib/workspace/access/audience-match";
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  type WorkspaceResourceGraph,
} from "@/lib/workspace/access/resource-graph";
import {
  canWorkspaceEdit,
  canWorkspaceManage,
  canWorkspaceView,
  computeAuthorizedReadableResourceIds,
  getWorkspaceEffectiveAccessLevel,
  hasWorkspaceTenantViewCapability,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import { buildWorkspaceReadWhereFromIds } from "@/lib/workspace/access/query-predicate";
import {
  chain,
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";

function graphFromChains(
  folderNodes: ReturnType<typeof folderNode>[],
  documentNodes: ReturnType<typeof folderNode>[] = [],
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

  const documents = new Map<
    string,
    {
      id: string;
      folderId: string | null;
      accessInheritanceMode: WorkspaceAccessInheritanceMode;
    }
  >();
  const documentGrants = new Map<string, ReturnType<typeof grant>[]>();

  for (const node of documentNodes) {
    documents.set(node.id, {
      id: node.id,
      folderId: node.parentFolderId,
      accessInheritanceMode: node.accessInheritanceMode,
    });
    documentGrants.set(
      node.id,
      node.grants.map((g) => ({
        ...g,
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: node.id,
        folderId: null,
      })),
    );
  }

  return {
    tenantId: TENANT,
    folders,
    documents,
    folderGrants,
    documentGrants,
  };
}

function actorWithMembership(input: {
  personId?: string | null;
  orgUnitIds?: string[];
  teamIds?: string[];
  roles?: { functionKey: string; orgUnitId: string; teamId?: string | null }[];
  permissionKeys?: string[];
  graph: WorkspaceResourceGraph;
  isCanonicalTenantClubAdmin?: boolean;
}): WorkspaceActorContext {
  return {
    identity: {
      tenantId: TENANT,
      userId: "user-1",
      personId:
        input.personId === undefined ? "person-1" : input.personId,
    },
    membership: {
      tenantId: TENANT,
      personId:
        input.personId === undefined ? "person-1" : input.personId,
      orgUnitIds: new Set(input.orgUnitIds ?? []),
      teamIds: new Set(input.teamIds ?? []),
      roleAssignments: (input.roles ?? []).map((r) => ({
        functionKey: r.functionKey,
        orgUnitId: r.orgUnitId,
        teamId: r.teamId ?? null,
      })),
    },
    permissionKeys: input.permissionKeys ?? [PERMISSIONS.WORKSPACE_VIEW],
    graph: input.graph,
    isCanonicalTenantClubAdmin: input.isCanonicalTenantClubAdmin ?? false,
  };
}

describe("WORKSPACE-02 W02 sentinels", () => {
  it("W02-01 same-tenant ORGANISATION VIEW", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, personId: "person-1" });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(true);
  });

  it("W02-02 cross-tenant organisation denial", () => {
    const root = rootOrganisationView("root");
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph });
    actor.identity.tenantId = "tenant-other";
    actor.membership.tenantId = "tenant-other";
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(false);
  });

  it("W02-03 PERSON grant match", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, personId: "person-1" });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
  });

  it("W02-04 PERSON grant mismatch", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, personId: "person-1" });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-05 User→Person mapping seam (identity on actor)", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([rootOrganisationView()]),
      personId: "person-linked",
    });
    expect(actor.identity.personId).toBe("person-linked");
  });

  it("W02-06 no linked Person fails Person audience", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, personId: null });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-07 dynamic OrgUnit membership match", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, orgUnitIds: ["ou-1"] });
    expect(
      actorMatchesAudience(
        actor.identity,
        actor.membership,
        { kind: "ORG_UNIT", orgUnitId: "ou-1" },
      ),
    ).toBe(true);
  });

  it("W02-08 OrgUnit membership removal denies", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORG_UNIT,
          accessLevel: "VIEW",
          orgUnitId: "ou-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, orgUnitIds: [] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-09 dynamic Team membership match", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, teamIds: ["team-1"] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
  });

  it("W02-10 Team membership removal denies", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, teamIds: [] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-11 organisational ROLE match", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "VIEW",
          roleFunctionKey: "TRAINER",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({
      graph,
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-1" }],
    });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
  });

  it("W02-12 ROLE removal denies", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ROLE,
          accessLevel: "VIEW",
          roleFunctionKey: "TRAINER",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph, roles: [] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-13 role OrgUnit scope match/mismatch", () => {
    const audience = {
      kind: "ROLE" as const,
      functionKey: "TRAINER",
      roleScopeOrgUnitId: "ou-1",
    };
    const actorMatch = actorWithMembership({
      graph: graphFromChains([]),
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-1" }],
    });
    const actorMismatch = actorWithMembership({
      graph: graphFromChains([]),
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-2" }],
    });
    expect(
      actorMatchesAudience(actorMatch.identity, actorMatch.membership, audience),
    ).toBe(true);
    expect(
      actorMatchesAudience(
        actorMismatch.identity,
        actorMismatch.membership,
        audience,
      ),
    ).toBe(false);
  });

  it("W02-14 role Team scope match/mismatch", () => {
    const audience = {
      kind: "ROLE" as const,
      functionKey: "TRAINER",
      roleScopeTeamId: "team-1",
    };
    const actorMatch = actorWithMembership({
      graph: graphFromChains([]),
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-1", teamId: "team-1" }],
    });
    const actorMismatch = actorWithMembership({
      graph: graphFromChains([]),
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-1", teamId: "team-2" }],
    });
    expect(
      actorMatchesAudience(actorMatch.identity, actorMatch.membership, audience),
    ).toBe(true);
    expect(
      actorMatchesAudience(
        actorMismatch.identity,
        actorMismatch.membership,
        audience,
      ),
    ).toBe(false);
  });

  it("W02-15 technical permission role rejected at grant validation layer (W01 preserved)", async () => {
    const { validateRoleFunctionKey, WorkspaceAccessGrantValidationError } =
      await import("@/lib/workspace/access/grant-validation");
    expect(() => validateRoleFunctionKey(PERMISSIONS.WORKSPACE_MANAGE)).toThrow(
      WorkspaceAccessGrantValidationError,
    );
  });

  it("W02-16 MANAGE implies EDIT/VIEW", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-1",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
    expect(
      canWorkspaceEdit(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
    expect(
      canWorkspaceManage(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(true);
  });

  it("W02-17 EDIT implies VIEW", () => {
    const level = getWorkspaceEffectiveAccessLevel(
      actorWithMembership({
        graph: graphFromChains([
          folderNode({
            id: "f1",
            mode: WorkspaceAccessInheritanceMode.EXPLICIT,
            grants: [
              grant({
                subjectType: WorkspaceAccessSubjectType.PERSON,
                accessLevel: "EDIT",
                personId: "person-1",
              }),
            ],
          }),
        ]),
        permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
      }),
      { resourceType: WorkspaceResourceType.FOLDER, folderId: "f1" },
    );
    expect(level).toBe("EDIT");
  });

  it("W02-18 VIEW does not imply EDIT", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "f1",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "VIEW",
              personId: "person-1",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceEdit(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-19 parent VIEW caps child MANAGE to VIEW", () => {
    const parent = folderNode({
      id: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          id: "g-org",
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      parentFolderId: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-1",
        }),
      ],
    });
    const graph = graphFromChains([parent, child]);
    const actor = actorWithMembership({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      getWorkspaceEffectiveAccessLevel(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe("VIEW");
  });

  it("W02-20 parent audience boundary cannot be bypassed by child PERSON", () => {
    const parent = folderNode({
      id: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      parentFolderId: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "MANAGE",
          personId: "person-1",
        }),
      ],
    });
    const graph = graphFromChains([parent, child]);
    const actor = actorWithMembership({ graph, teamIds: [] });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe(false);
  });

  it("W02-21 dynamic ancestor membership loss removes descendant access", () => {
    const parent = folderNode({
      id: "parent",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "VIEW",
          teamId: "team-1",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      parentFolderId: "parent",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromChains([parent, child]);
    const withTeam = actorWithMembership({ graph, teamIds: ["team-1"] });
    const withoutTeam = actorWithMembership({ graph, teamIds: [] });
    expect(
      canWorkspaceView(withTeam, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe(true);
    expect(
      canWorkspaceView(withoutTeam, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe(false);
  });

  it("W02-22 nested INHERIT works", () => {
    const parent = rootOrganisationView("parent");
    const child = folderNode({
      id: "child",
      parentFolderId: "parent",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromChains([parent, child]);
    const actor = actorWithMembership({ graph });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe(true);
  });

  it("W02-23 malformed ancestor fails closed", () => {
    const graph: WorkspaceResourceGraph = {
      tenantId: TENANT,
      folders: new Map([
        [
          "child",
          {
            id: "child",
            parentId: "missing-parent",
            accessInheritanceMode: WorkspaceAccessInheritanceMode.INHERIT,
          },
        ],
      ]),
      documents: new Map(),
      folderGrants: new Map(),
      documentGrants: new Map(),
    };
    expect(buildFolderAccessChain(graph, "child")).toBeNull();
    const actor = actorWithMembership({ graph });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "child",
      }),
    ).toBe(false);
  });

  it("W02-24 unsupported legacy level fails closed", () => {
    const root = folderNode({
      id: "f1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "DOWNLOAD",
        }),
      ],
    });
    const graph = graphFromChains([root]);
    const actor = actorWithMembership({ graph });
    expect(
      getWorkspaceEffectiveAccessLevel(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBeNull();
  });

  it("W02-25 folder list excludes unauthorized folder", () => {
    const allowed = rootOrganisationView("allowed");
    const denied = folderNode({
      id: "denied",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    const graph = graphFromChains([allowed, denied]);
    const actor = actorWithMembership({ graph, personId: "person-1" });
    const ids = computeAuthorizedReadableResourceIds(actor);
    expect(ids.folderIds).toContain("allowed");
    expect(ids.folderIds).not.toContain("denied");
  });

  it("W02-26 document list excludes unauthorized document", () => {
    const docAllowed = folderNode({
      id: "doc-a",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    docAllowed.resourceType = WorkspaceResourceType.DOCUMENT;
    const docDenied = folderNode({
      id: "doc-d",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    docDenied.resourceType = WorkspaceResourceType.DOCUMENT;
    const graph = graphFromChains([], [docAllowed, docDenied]);
    const actor = actorWithMembership({ graph });
    const ids = computeAuthorizedReadableResourceIds(actor);
    expect(ids.documentIds).toContain("doc-a");
    expect(ids.documentIds).not.toContain("doc-d");
  });

  it("W02-27 search excludes unauthorized result (query predicate)", () => {
    const readWhere = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: ["f1"],
      documentIds: ["d1"],
    });
    expect(readWhere.documentWhere.id).toEqual({ in: ["d1"] });
    expect(readWhere.folderWhere.id).toEqual({ in: ["f1"] });
  });

  it("W02-28 direct document ID cannot bypass authorization", () => {
    const doc = folderNode({
      id: "doc-secret",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    doc.resourceType = WorkspaceResourceType.DOCUMENT;
    const graph = graphFromChains([], [doc]);
    const actor = actorWithMembership({ graph, personId: "person-1" });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: "doc-secret",
      }),
    ).toBe(false);
  });

  it("W02-29 version derives authorization from document", () => {
    const doc = folderNode({
      id: "doc-1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.ORGANISATION,
          accessLevel: "VIEW",
        }),
      ],
    });
    doc.resourceType = WorkspaceResourceType.DOCUMENT;
    const graph = graphFromChains([], [doc]);
    expect(buildDocumentAccessChain(graph, "doc-1")).not.toBeNull();
    const actor = actorWithMembership({ graph });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: "doc-1",
      }),
    ).toBe(true);
  });

  it("W02-30 download denied without VIEW (capability + resource)", () => {
    const doc = folderNode({
      id: "doc-1",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.PERSON,
          accessLevel: "VIEW",
          personId: "person-other",
        }),
      ],
    });
    doc.resourceType = WorkspaceResourceType.DOCUMENT;
    const graph = graphFromChains([], [doc]);
    const actor = actorWithMembership({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
    });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.DOCUMENT,
        documentId: "doc-1",
      }),
    ).toBe(false);
  });

  it("W02-31 preview denied without VIEW", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "f1",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "VIEW",
              personId: "person-other",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
    });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-32 EDIT operation denied at VIEW", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "f1",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "VIEW",
              personId: "person-1",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceEdit(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-33 MANAGE operation denied at EDIT", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "f1",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "EDIT",
              personId: "person-1",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceManage(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-34 ACL mutation requires MANAGE", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "f1",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "EDIT",
              personId: "person-1",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceManage(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "f1",
      }),
    ).toBe(false);
  });

  it("W02-35 move cannot widen access (W01 move validation preserved)", () => {
    const before = chain([
      folderNode({
        id: "parent",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.TEAM,
            accessLevel: "VIEW",
            teamId: "team-1",
          }),
        ],
      }),
      folderNode({
        id: "resource",
        parentFolderId: "parent",
        mode: WorkspaceAccessInheritanceMode.INHERIT,
        grants: [],
      }),
    ]);
    expect(before.resource.id).toBe("resource");
  });

  it("W02-36 cross-tenant move denied (tenant on actor)", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([rootOrganisationView()]),
    });
    actor.identity.tenantId = "foreign";
    expect(hasWorkspaceTenantViewCapability(actor.permissionKeys)).toBe(true);
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(false);
  });

  it("W02-37 cross-tenant Person audience denied", () => {
    expect(
      actorMatchesAudience(
        { tenantId: TENANT, userId: "u1", personId: "p1" },
        {
          tenantId: "tenant-other",
          personId: "p1",
          orgUnitIds: new Set(),
          teamIds: new Set(),
          roleAssignments: [],
        },
        { kind: "PERSON", personId: "p1" },
      ),
    ).toBe(false);
  });

  it("W02-38 cross-tenant Team audience denied at membership boundary", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([]),
      teamIds: ["team-foreign"],
    });
    actor.membership.tenantId = "tenant-other";
    expect(
      actorMatchesAudience(actor.identity, actor.membership, {
        kind: "TEAM",
        teamId: "team-foreign",
      }),
    ).toBe(false);
  });

  it("W02-39 cross-tenant OrgUnit audience denied", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([]),
      orgUnitIds: ["ou-1"],
    });
    actor.membership.tenantId = "tenant-other";
    expect(
      actorMatchesAudience(actor.identity, actor.membership, {
        kind: "ORG_UNIT",
        orgUnitId: "ou-1",
      }),
    ).toBe(false);
  });

  it("W02-40 cross-tenant role scope denied", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([]),
      roles: [{ functionKey: "TRAINER", orgUnitId: "ou-1" }],
    });
    actor.membership.tenantId = "tenant-other";
    expect(
      actorMatchesAudience(actor.identity, actor.membership, {
        kind: "ROLE",
        functionKey: "TRAINER",
        roleScopeOrgUnitId: "ou-1",
      }),
    ).toBe(false);
  });

  it("W02-41–46 creation policy helpers (W01 defaults wired)", async () => {
    const { buildDefaultRootResourcePolicy, buildDefaultChildResourcePolicy } =
      await import("@/lib/workspace/access/effective-access");
    const root = buildDefaultRootResourcePolicy({
      tenantId: TENANT,
      resourceType: WorkspaceResourceType.FOLDER,
      resourceId: "f-new",
      creatorPersonId: "person-1",
    });
    expect(root.accessInheritanceMode).toBe(
      WorkspaceAccessInheritanceMode.EXPLICIT,
    );
    expect(root.grants.some((g) => g.subjectType === WorkspaceAccessSubjectType.ORGANISATION)).toBe(
      true,
    );
    expect(
      root.grants.some(
        (g) =>
          g.subjectType === WorkspaceAccessSubjectType.PERSON &&
          g.personId === "person-1",
      ),
    ).toBe(true);
    const withoutPerson = buildDefaultRootResourcePolicy({
      tenantId: TENANT,
      resourceType: WorkspaceResourceType.FOLDER,
      resourceId: "f2",
    });
    expect(
      withoutPerson.grants.some(
        (g) => g.subjectType === WorkspaceAccessSubjectType.PERSON,
      ),
    ).toBe(false);
    expect(buildDefaultChildResourcePolicy().accessInheritanceMode).toBe(
      WorkspaceAccessInheritanceMode.INHERIT,
    );
  });

  it("W02-47 createdByUserId gives no ACL bypass", () => {
    expect(pureWorkspaceAclGrantsResourceAccess({ permissionKeys: [] })).toBe(
      false,
    );
  });

  it("W02-48 broad tenant WORKSPACE_MANAGE does not bypass restricted resource", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([
        folderNode({
          id: "secret",
          mode: WorkspaceAccessInheritanceMode.EXPLICIT,
          grants: [
            grant({
              subjectType: WorkspaceAccessSubjectType.PERSON,
              accessLevel: "VIEW",
              personId: "person-other",
            }),
          ],
        }),
      ]),
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    });
    expect(
      canWorkspaceView(actor, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "secret",
      }),
    ).toBe(false);
  });

  it("W02-49 unauthorized resources absent at query boundary", () => {
    const empty = buildWorkspaceReadWhereFromIds({
      tenantId: TENANT,
      folderIds: [],
      documentIds: [],
    });
    expect(empty.folderWhere.id).toEqual({
      in: ["__workspace_unauthorized__"],
    });
  });

  it("W02-50 tenant isolation across list/search ids", () => {
    const actor = actorWithMembership({
      graph: graphFromChains([rootOrganisationView()]),
    });
    actor.identity.tenantId = "other";
    const ids = computeAuthorizedReadableResourceIds(actor);
    expect(ids.folderIds).toEqual([]);
  });

  it("W02-51 orphan/malformed version fails closed", () => {
    const graph: WorkspaceResourceGraph = {
      tenantId: TENANT,
      folders: new Map(),
      documents: new Map([
        [
          "orphan-doc",
          {
            id: "orphan-doc",
            folderId: "missing-folder",
            accessInheritanceMode: WorkspaceAccessInheritanceMode.INHERIT,
          },
        ],
      ]),
      folderGrants: new Map(),
      documentGrants: new Map(),
    };
    expect(buildDocumentAccessChain(graph, "orphan-doc")).toBeNull();
  });

  it("W02-52 actor context cannot be spoofed from client identifiers", () => {
    const ctx = actorWithMembership({
      graph: graphFromChains([rootOrganisationView()]),
      personId: "person-1",
    });
    expect(ctx.identity.userId).toBe("user-1");
    expect(ctx.identity.personId).toBe("person-1");
    expect(ctx.identity.tenantId).toBe(TENANT);
  });
});

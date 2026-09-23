import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildAccessSummaryViewModel } from "@/lib/workspace/access/access-management-service";
import {
  canWorkspaceEdit,
  canWorkspaceManage,
  canWorkspaceView,
  getWorkspaceEffectiveAccessLevel,
  getWorkspaceResourceAclEffectiveAccessLevel,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import {
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";

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

function actor(input: {
  graph: WorkspaceResourceGraph;
  personId?: string;
  teamIds?: string[];
  permissionKeys?: string[];
  isCanonicalTenantClubAdmin?: boolean;
  tenantId?: string;
}): WorkspaceActorContext {
  const tenantId = input.tenantId ?? TENANT;
  return {
    identity: {
      tenantId,
      userId: "user-1",
      personId: input.personId ?? "person-1",
    },
    membership: {
      tenantId,
      personId: input.personId ?? "person-1",
      orgUnitIds: new Set(),
      teamIds: new Set(input.teamIds ?? []),
      roleAssignments: [],
    },
    permissionKeys: input.permissionKeys ?? [
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.WORKSPACE_MANAGE,
    ],
    graph: input.graph,
    isCanonicalTenantClubAdmin: input.isCanonicalTenantClubAdmin ?? false,
  };
}

const labels = {
  resolve(audience: { kind: string }) {
    if (audience.kind === "ORGANISATION") return "FC Allschwil";
    if (audience.kind === "TEAM") return "Team A";
    if (audience.kind === "PERSON") return "Other Person";
    return audience.kind;
  },
};

describe("WORKSPACE-09-04A / W09-05R1 Club Admin workspace authority", () => {
  it("1 — Club Admin + Organisation VIEW => MANAGE (ACL remains VIEW)", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "vereinsleitung",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.ORGANISATION,
            accessLevel: "VIEW",
          }),
        ],
      }),
    ]);
    const clubAdmin = actor({ graph, isCanonicalTenantClubAdmin: true });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "vereinsleitung",
    };

    expect(getWorkspaceResourceAclEffectiveAccessLevel(clubAdmin, ref)).toBe("VIEW");
    expect(getWorkspaceEffectiveAccessLevel(clubAdmin, ref)).toBe("MANAGE");
    expect(canWorkspaceEdit(clubAdmin, ref)).toBe(true);
    expect(canWorkspaceManage(clubAdmin, ref)).toBe(true);
  });

  it("2 — Club Admin + Team-only resource (not a team member) => MANAGE", () => {
    const graph = graphFromFolders([
      rootOrganisationView("root"),
      folderNode({
        id: "team-only",
        parentFolderId: "root",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.TEAM,
            accessLevel: "EDIT",
            teamId: "team-secret",
          }),
        ],
      }),
    ]);
    const clubAdmin = actor({ graph, teamIds: [], isCanonicalTenantClubAdmin: true });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "team-only",
    };
    expect(getWorkspaceResourceAclEffectiveAccessLevel(clubAdmin, ref)).toBeNull();
    expect(getWorkspaceEffectiveAccessLevel(clubAdmin, ref)).toBe("MANAGE");
    expect(canWorkspaceView(clubAdmin, ref)).toBe(true);
  });

  it("3 — Club Admin + Person-restricted resource excluding admin => MANAGE", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "person-only",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.PERSON,
            accessLevel: "MANAGE",
            personId: "person-other",
          }),
        ],
      }),
    ]);
    const clubAdmin = actor({
      graph,
      personId: "person-admin",
      isCanonicalTenantClubAdmin: true,
    });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "person-only",
    };
    expect(getWorkspaceResourceAclEffectiveAccessLevel(clubAdmin, ref)).toBeNull();
    expect(getWorkspaceEffectiveAccessLevel(clubAdmin, ref)).toBe("MANAGE");
  });

  it("4 — Club Admin + deep restrictive hierarchy => MANAGE", () => {
    const root = rootOrganisationView("root");
    const mid = folderNode({
      id: "mid",
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
    const leaf = folderNode({
      id: "leaf",
      parentFolderId: "mid",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromFolders([root, mid, leaf]);
    const clubAdmin = actor({ graph, isCanonicalTenantClubAdmin: true });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "leaf",
    };
    expect(getWorkspaceEffectiveAccessLevel(clubAdmin, ref)).toBe("MANAGE");
  });

  it("5 — Club Admin can manage access (resource MANAGE)", () => {
    const graph = graphFromFolders([rootOrganisationView("root")]);
    const clubAdmin = actor({ graph, isCanonicalTenantClubAdmin: true });
    expect(
      canWorkspaceManage(clubAdmin, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBe(true);
  });

  it("14 — normal member + Organisation VIEW => VIEW not EDIT", () => {
    const graph = graphFromFolders([rootOrganisationView("root")]);
    const member = actor({ graph, isCanonicalTenantClubAdmin: false });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "root",
    };
    expect(getWorkspaceEffectiveAccessLevel(member, ref)).toBe("VIEW");
    expect(canWorkspaceEdit(member, ref)).toBe(false);
  });

  it("15 — normal Team member + EDIT => EDIT", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "team-edit",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.TEAM,
            accessLevel: "EDIT",
            teamId: "team-a",
          }),
        ],
      }),
    ]);
    const member = actor({ graph, teamIds: ["team-a"] });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "team-edit",
    };
    expect(getWorkspaceEffectiveAccessLevel(member, ref)).toBe("EDIT");
    expect(canWorkspaceEdit(member, ref)).toBe(true);
    expect(canWorkspaceManage(member, ref)).toBe(false);
  });

  it("16 — non-admin creator after access loss => no access", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "creator-lost",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.PERSON,
            accessLevel: "VIEW",
            personId: "person-other",
          }),
        ],
      }),
    ]);
    const member = actor({ graph, personId: "person-creator" });
    expect(
      getWorkspaceEffectiveAccessLevel(member, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "creator-lost",
      }),
    ).toBeNull();
  });

  it("17 — Club Admin removed + Organisation VIEW => VIEW", () => {
    const graph = graphFromFolders([rootOrganisationView("root")]);
    const formerAdmin = actor({ graph, isCanonicalTenantClubAdmin: false });
    const ref = {
      resourceType: WorkspaceResourceType.FOLDER as const,
      folderId: "root",
    };
    expect(getWorkspaceEffectiveAccessLevel(formerAdmin, ref)).toBe("VIEW");
    expect(canWorkspaceManage(formerAdmin, ref)).toBe(false);
  });

  it("18 — workspace.manage without canonical Club Admin => no MANAGE override", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "restricted",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.PERSON,
            accessLevel: "VIEW",
            personId: "person-1",
          }),
        ],
      }),
    ]);
    const technicalManager = actor({
      graph,
      permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
      isCanonicalTenantClubAdmin: false,
    });
    expect(
      canWorkspaceEdit(technicalManager, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "restricted",
      }),
    ).toBe(false);
  });

  it("13 — Club Admin tenant A graph cannot grant access on tenant B graph", () => {
    const graphB = graphFromFolders([rootOrganisationView("root")]);
    graphB.tenantId = "tenant-b";
    const clubAdminA = actor({
      graph: graphB,
      isCanonicalTenantClubAdmin: true,
      tenantId: TENANT,
    });
    expect(
      getWorkspaceEffectiveAccessLevel(clubAdminA, {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "root",
      }),
    ).toBeNull();
  });

  it("access summary distinguishes actor authority from configured Organisation VIEW", () => {
    const graph = graphFromFolders([
      folderNode({
        id: "vereinsleitung",
        mode: WorkspaceAccessInheritanceMode.EXPLICIT,
        grants: [
          grant({
            subjectType: WorkspaceAccessSubjectType.ORGANISATION,
            accessLevel: "VIEW",
          }),
        ],
      }),
    ]);
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph, isCanonicalTenantClubAdmin: true }),
      graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: "vereinsleitung",
      },
      labels,
      folderNameById: new Map([["vereinsleitung", "Vereinsleitung"]]),
    });

    expect(summary?.actorAuthority?.effectiveLevel).toBe("MANAGE");
    expect(summary?.actorAuthority?.sourceKind).toBe("CLUB_ADMIN");
    expect(summary?.actorAuthority?.configuredActorLevel).toBe("VIEW");
    const orgRow = summary?.effectiveAccess.find((e) => e.audienceKind === "ORGANISATION");
    expect(orgRow?.effectiveLevel).toBe("VIEW");
    expect(orgRow?.effectiveLevelLabel).toBe("Ansehen");
  });
});

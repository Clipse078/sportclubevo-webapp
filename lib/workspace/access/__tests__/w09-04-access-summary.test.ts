import { describe, expect, it } from "vitest";
import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildAccessSummaryViewModel } from "@/lib/workspace/access/access-management-service";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import {
  grant,
  rootOrganisationView,
  folderNode,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";

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
  personId?: string;
  teamIds?: string[];
}): WorkspaceActorContext {
  return {
    identity: { tenantId: TENANT, userId: "user-1", personId: input.personId ?? "p1" },
    membership: {
      tenantId: TENANT,
      personId: input.personId ?? "p1",
      orgUnitIds: new Set(),
      teamIds: new Set(input.teamIds ?? []),
      roleAssignments: [],
    },
    permissionKeys: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
    graph: input.graph,
    isCanonicalTenantClubAdmin: false,
  };
}

const labels = {
  resolve(audience: { kind: string; functionKey?: string; teamId?: string }) {
    if (audience.kind === "ORGANISATION") return "Organisation";
    if (audience.kind === "TEAM") return "Team A";
    if (audience.kind === "PERSON") return "Sandra Muster";
    return audience.kind;
  },
};

describe("WORKSPACE-09-04 access summary view model", () => {
  it("surfaces configured vs effective cap for child MANAGE under parent VIEW", () => {
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
          accessLevel: "VIEW",
          teamId: "team-a",
        }),
      ],
    });
    const child = folderNode({
      id: "child",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.EXPLICIT,
      grants: [
        grant({
          subjectType: WorkspaceAccessSubjectType.TEAM,
          accessLevel: "MANAGE",
          teamId: "team-a",
        }),
      ],
    });
    const graph = graphFromChains([root, child]);
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph, teamIds: ["team-a"] }),
      graph,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "child" },
      labels,
      folderNameById: new Map([
        ["root", "Root"],
        ["child", "Child"],
      ]),
    });

    expect(summary?.effectiveAccess.map((e) => e.audienceKey)).toContain("TEAM:team-a");
    const teamRow = summary?.effectiveAccess.find((e) => e.audienceKey === "TEAM:team-a");
    expect(teamRow?.configuredLevelLabel).toBe("Verwalten");
    expect(teamRow?.effectiveLevelLabel).toBe("Ansehen");
    expect(teamRow?.cappedByAncestor).toBe(true);
  });

  it("shows inherit headline for inherited child folder", () => {
    const root = rootOrganisationView("root");
    const child = folderNode({
      id: "child",
      parentFolderId: "root",
      mode: WorkspaceAccessInheritanceMode.INHERIT,
      grants: [],
    });
    const graph = graphFromChains([root, child]);
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph }),
      graph,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "child" },
      labels,
      folderNameById: new Map([
        ["root", "Vereinsleitung"],
        ["child", "Junioren"],
      ]),
    });
    expect(summary?.policyModeHeadline).toBe("Geerbt von: Vereinsleitung");
    expect(summary?.effectiveAccess.length).toBeGreaterThan(0);
  });

  it("includes direct person why label", () => {
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
    const summary = buildAccessSummaryViewModel({
      actor: actor({ graph, personId: "p1" }),
      graph,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: "root" },
      labels,
      folderNameById: new Map([["root", "Root"]]),
    });
    const personRow = summary?.effectiveAccess.find((e) => e.audienceKind === "PERSON");
    expect(personRow?.whyLabel).toBe("Direkter Zugriff");
  });
});

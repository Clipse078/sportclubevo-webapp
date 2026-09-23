import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceDocumentStatus,
  WorkspaceResourceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  computeWorkspaceDocumentAvailableActions,
  computeWorkspaceFolderAvailableActions,
  emptyAvailableActions,
} from "@/lib/workspace/command/workspace-available-actions";
import { enrichWorkspaceDocumentListWithAvailableActions } from "@/lib/workspace/command/enrich-document-list-available-actions";
import { mapAvailableActionsToCommandTiers } from "@/lib/workspace/command/available-actions-stub";
import type { WorkspaceActorContext } from "@/lib/workspace/access/workspace-authorization";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import type { WorkspaceResourceGraph } from "@/lib/workspace/access/resource-graph";
import {
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

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

function documentNode(
  id: string,
  accessLevel: "VIEW" | "EDIT" | "MANAGE",
  folderId: string | null = null,
): ReturnType<typeof folderNode> {
  const doc = folderNode({
    id,
    parentFolderId: folderId,
    mode: WorkspaceAccessInheritanceMode.EXPLICIT,
    grants: [
      grant({
        subjectType: WorkspaceAccessSubjectType.ORGANISATION,
        accessLevel,
      }),
    ],
  });
  doc.resourceType = WorkspaceResourceType.DOCUMENT;
  return doc;
}

function actor(input: {
  graph: WorkspaceResourceGraph;
  permissionKeys?: readonly string[];
  isCanonicalTenantClubAdmin?: boolean;
}): WorkspaceActorContext {
  return {
    identity: {
      tenantId: TENANT,
      userId: "user-1",
      personId: "person-1",
    },
    membership: {
      tenantId: TENANT,
      personId: "person-1",
      orgUnitIds: new Set(),
      teamIds: new Set(),
      roleAssignments: [],
    },
    permissionKeys:
      input.permissionKeys ?? [
        PERMISSIONS.WORKSPACE_VIEW,
        PERMISSIONS.WORKSPACE_MANAGE,
      ],
    graph: input.graph,
    isCanonicalTenantClubAdmin: input.isCanonicalTenantClubAdmin ?? false,
  };
}

describe("WORKSPACE-09-07 mobile-ready contract", () => {
  it("W09-07-01 canonical available-actions module replaces stub-only contract", () => {
    expect(read("lib/workspace/command/workspace-available-actions.ts")).toMatch(
      /computeWorkspaceDocumentAvailableActions/,
    );
    expect(read("lib/workspace/command/available-actions-stub.ts")).toMatch(
      /capabilities: WorkspaceResourceAvailableActionsDto/,
    );
    expect(read("lib/workspace/public-dto/workspace-resource-public-dto.ts")).toMatch(
      /availableActions/,
    );
  });

  it("W09-07-02 VIEW actor cannot rename/move/manageAccess", () => {
    const g = graphFromChains([], [documentNode("d1", "VIEW")]);
    const a = actor({
      graph: g,
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
    });
    const actions = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: true,
      },
      tenantCanDelete: true,
    });
    expect(actions.view).toBe(true);
    expect(actions.download).toBe(true);
    expect(actions.preview).toBe(true);
    expect(actions.rename).toBe(false);
    expect(actions.move).toBe(false);
    expect(actions.manageAccess).toBe(false);
    expect(actions.uploadVersion).toBe(false);
  });

  it("W09-07-03 EDIT actor gets content mutations on ACTIVE document", () => {
    const g = graphFromChains([], [documentNode("d1", "EDIT")]);
    const a = actor({ graph: g });
    const actions = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: true,
      },
      tenantCanDelete: true,
    });
    expect(actions.rename).toBe(true);
    expect(actions.move).toBe(true);
    expect(actions.uploadVersion).toBe(true);
    expect(actions.manageAccess).toBe(false);
  });

  it("W09-07-04 malware/content gate disables preview/download", () => {
    const g = graphFromChains([], [documentNode("d1", "VIEW")]);
    const a = actor({ graph: g });
    const actions = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: false,
      },
      tenantCanDelete: false,
    });
    expect(actions.view).toBe(true);
    expect(actions.download).toBe(false);
    expect(actions.preview).toBe(false);
  });

  it("W09-07-05 Club Admin effective MANAGE without synthetic ACL row", () => {
    const g = graphFromChains([], [documentNode("d1", "VIEW")]);
    const a = actor({ graph: g, isCanonicalTenantClubAdmin: true });
    const actions = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: true,
      },
      tenantCanDelete: true,
    });
    expect(actions.manageAccess).toBe(true);
    expect(actions.rename).toBe(true);
  });

  it("W09-07-06 dual-domain Task/Requirement flags are independent of Workspace EDIT", () => {
    const g = graphFromChains([], [documentNode("d1", "EDIT")]);
    const a = actor({ graph: g });
    const withoutWorkflow = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: true,
      },
      tenantCanDelete: false,
    });
    expect(withoutWorkflow.createTask).toBe(false);
    expect(withoutWorkflow.createRequirement).toBe(false);

    const withWorkflow = computeWorkspaceDocumentAvailableActions({
      actor: a,
      documentId: "d1",
      document: {
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
        hasCurrentVersion: true,
        mimeType: "application/pdf",
        contentAvailable: true,
      },
      tenantCanDelete: false,
      workflow: { canCreateTask: true, canCreateRequirement: true },
    });
    expect(withWorkflow.createTask).toBe(true);
    expect(withWorkflow.createRequirement).toBe(true);
  });

  it("W09-07-07 cross-tenant / no access yields empty actions (zero disclosure)", () => {
    const g = graphFromChains([rootOrganisationView("f1")]);
    const a = actor({
      graph: g,
      permissionKeys: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
    });
    const actions = computeWorkspaceFolderAvailableActions({
      actor: a,
      folderId: "missing-folder",
      folder: { archivedAt: null, trashedAt: null },
      tenantCanDelete: true,
    });
    expect(actions).toEqual(emptyAvailableActions());
  });

  it("W09-07-08 list enrichment embeds availableActions without N+1 HTTP", () => {
    const g = graphFromChains([], [documentNode("d1", "EDIT")]);
    const a = actor({ graph: g });
    const enriched = enrichWorkspaceDocumentListWithAvailableActions({
      actor: a,
      tenantCanDelete: false,
      documents: [
        {
          id: "d1",
          folderId: "f1",
          name: "Doc",
          status: WorkspaceDocumentStatus.ACTIVE,
          currentVersionId: "v1",
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          currentVersion: {
            id: "v1",
            versionNumber: 1,
            filename: "a.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            createdAt: new Date(),
          },
          canEditDocument: true,
          canManageAccess: false,
        },
      ],
    });
    expect(enriched[0]?.availableActions.rename).toBe(true);
    expect(read("app/(admin)/dashboard/workspace/page.tsx")).toMatch(
      /enrichWorkspaceDocumentListWithAvailableActions/,
    );
  });

  it("W09-07-09 forged rename path still requires server EDIT assertion", () => {
    const g = graphFromChains([], [documentNode("d1", "VIEW")]);
    const a = actor({ graph: g });
    expect(
      computeWorkspaceDocumentAvailableActions({
        actor: a,
        documentId: "d1",
        document: {
          status: WorkspaceDocumentStatus.ACTIVE,
          archivedAt: null,
          trashedAt: null,
          hasCurrentVersion: true,
          mimeType: "application/pdf",
          contentAvailable: true,
        },
        tenantCanDelete: false,
      }).rename,
    ).toBe(false);

    expect(() => assertWorkspaceDocumentEdit(a, "d1")).toThrow(
      WorkspaceAuthorizationError,
    );
  });

  it("W09-07-10 public list DTO serializer omits storage internals", () => {
    const src = read("lib/workspace/public-dto/workspace-resource-public-dto.ts");
    expect(src).not.toMatch(/storageKey/);
    expect(src).not.toMatch(/storageProvider/);
    expect(src).not.toMatch(/createdByUserId/);
  });

  it("W09-07-11 command tiers derived from canonical capabilities", () => {
    const tiers = mapAvailableActionsToCommandTiers({
      view: true,
      preview: true,
      download: true,
      favorite: true,
      rename: false,
      move: false,
      createFolder: false,
      uploadDocument: false,
      uploadVersion: false,
      manageAccess: false,
      createTask: false,
      createRequirement: false,
      archive: false,
      trash: false,
      restore: false,
      permanentDelete: false,
    });
    expect(tiers.primary).toContain("download");
    expect(tiers.secondary).toContain("preview");
  });

  it("W09-07-12 creator provenance is not used in action computation module", () => {
    const mod = read("lib/workspace/command/workspace-available-actions.ts");
    expect(mod).not.toMatch(/createdByUserId/);
    expect(mod).not.toMatch(/creator/i);
  });

  it("W09-07-13 workspace page has no Demnächst placeholders", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).not.toMatch(/Demnächst|DEMNAECHST|comingSoon/i);
  });
});

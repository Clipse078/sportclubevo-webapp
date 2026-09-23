import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocumentVersion: { findMany: vi.fn() },
    requirementWorkspaceDocumentVersionReference: { findMany: vi.fn() },
    taskDocumentReference: { findMany: vi.fn() },
    workspaceDocument: { findFirst: vi.fn() },
    task: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/workspace/document-access", () => ({
  canReadWorkspaceDocument: vi.fn(),
}));

vi.mock("@/lib/requirements/requirement-authorization", () => ({
  canCreateRequirement: vi.fn(),
  canReadRequirement: vi.fn(),
  hasRequirementPermission: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import {
  canCreateRequirement,
  canReadRequirement,
  hasRequirementPermission,
} from "@/lib/requirements/requirement-authorization";
import { listRequirementsForWorkspaceDocument } from "@/lib/requirements/list-requirements-for-workspace-document";

const reqCtx = {
  tenantId: "t1",
  userId: "u1",
  permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW, PERMISSIONS.WORKSPACE_VIEW],
};

describe("WORKSPACE-09-02 document inspector", () => {
  it("W09-02-01 workspace page mounts tabbed document inspector server component", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/WorkspaceDocumentInspectorServer/);
    expect(page).toMatch(/documentInspectorSlot/);
    expect(page).not.toMatch(/ContextRelatedTasksPanel/);
  });

  it("W09-02-02 client shell uses inspector slot and workflow capabilities", () => {
    const shell = read("components/admin/workspace/WorkspaceClientShell.tsx");
    expect(shell).toMatch(/WorkspaceDocumentInspectorActionsProvider/);
    expect(shell).toMatch(/documentInspectorSlot/);
    expect(shell).toMatch(/documentWorkflowCapabilities/);
    expect(shell).not.toMatch(/WorkspaceFilePreview/);
  });

  it("W09-02-03 inspector view exposes workflow tabs including Aufgaben and Anforderungen", () => {
    const view = read("components/admin/workspace/inspector/WorkspaceDocumentInspectorView.tsx");
    expect(view).toMatch(/workspace-document-inspector-tabs/);
    expect(view).toMatch(/Aufgaben/);
    expect(view).toMatch(/Anforderungen/);
    expect(view).toMatch(/Noch keine Aufgaben verknüpft/);
    expect(view).toMatch(/Noch keine Anforderungen verknüpft/);
  });

  it("W09-02-04 command bar exposes gated workflow actions", () => {
    const bar = read("components/admin/workspace/WorkspaceCommandBar.tsx");
    expect(bar).toMatch(/workflowCapabilities\.canCreateTask/);
    expect(bar).toMatch(/workflowCapabilities\.canCreateRequirement/);
    expect(bar).toMatch(/ContextualTaskCreateTrigger/);
    expect(bar).not.toMatch(/DEMNAECHST|comingSoon/i);
  });

  it("W09-02-05 requirements list uses exact version references without client-side counting", () => {
    const svc = read("lib/requirements/list-requirements-for-workspace-document.ts");
    expect(svc).toMatch(/requirementWorkspaceDocumentVersionReference\.findMany/);
    expect(svc).toMatch(/visible: false/);
    expect(svc).not.toMatch(/findMany\(\{\s*where:\s*\{\s*tenantId[^]*requirement\.findMany/);
  });

  it("W09-02-06 link action binds current document version via canonical service", () => {
    const actions = read("app/(admin)/dashboard/workspace/document-inspector-actions.ts");
    expect(actions).toMatch(/linkRequirementDocumentReference/);
    expect(actions).toMatch(/createRequirementDraft/);
  });

  it("W09-02-07 RSC boundary — inspector server component has no use client", () => {
    const server = read("components/admin/workspace/inspector/WorkspaceDocumentInspectorServer.tsx");
    expect(server).not.toMatch(/"use client"/);
    expect(server).toMatch(/loadWorkspaceDocumentInspectorPayload/);
    expect(server).toMatch(/tenantId/);
  });

  it("W09-02-08 folder inspector does not surface Aufgaben/Anforderungen tabs", () => {
    const view = read("components/admin/workspace/inspector/WorkspaceDocumentInspectorView.tsx");
    expect(view).toMatch(/payload\.tasks\.visible/);
    expect(view).toMatch(/payload\.requirements\.visible/);
    const shell = read("components/admin/workspace/WorkspaceClientShell.tsx");
    expect(shell).toMatch(/selectedDocument \?/);
  });
});

describe("WORKSPACE-09-02 requirement metadata disclosure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("W09-02-09 returns null count visibility when Requirements domain is unauthorized", async () => {
    vi.mocked(hasRequirementPermission).mockReturnValue(false);
    const result = await listRequirementsForWorkspaceDocument(reqCtx, "doc-1");
    expect(result).toEqual({ visible: false });
    expect(prisma.requirementWorkspaceDocumentVersionReference.findMany).not.toHaveBeenCalled();
  });

  it("W09-02-10 filters unreadable requirements from rows and count", async () => {
    vi.mocked(hasRequirementPermission).mockReturnValue(true);
    vi.mocked(canReadWorkspaceDocument).mockResolvedValue(true);
    vi.mocked(canCreateRequirement).mockReturnValue(false);
    vi.mocked(prisma.workspaceDocumentVersion.findMany).mockResolvedValue([
      { id: "v1", versionNumber: 1 },
    ] as never);
    vi.mocked(prisma.requirementWorkspaceDocumentVersionReference.findMany).mockResolvedValue([
      {
        id: "ref-1",
        workspaceDocumentVersionId: "v1",
        requirement: {
          id: "r-visible",
          title: "Visible",
          status: "ACTIVE",
          tenantId: "t1",
          createdByUserId: "u2",
        },
      },
      {
        id: "ref-2",
        workspaceDocumentVersionId: "v1",
        requirement: {
          id: "r-hidden",
          title: "Hidden",
          status: "ACTIVE",
          tenantId: "t1",
          createdByUserId: "u3",
        },
      },
    ] as never);
    vi.mocked(canReadRequirement).mockImplementation(
      (_ctx, record) => record.id === "r-visible",
    );

    const result = await listRequirementsForWorkspaceDocument(reqCtx, "doc-1");
    expect(result.visible).toBe(true);
    if (result.visible) {
      expect(result.count).toBe(1);
      expect(result.requirements[0]?.linkedVersionNumber).toBe(1);
      expect(result.requirements[0]?.title).toBe("Visible");
    }
  });
});

describe("WORKSPACE-09-02 task document context", () => {
  it("W09-02-11 loader delegates tasks to canonical DOCUMENT context panel", () => {
    const loader = read("lib/workspace/document-inspector/load-workspace-document-inspector.ts");
    expect(loader).toMatch(/loadContextRelatedTasksPanel/);
    expect(loader).toMatch(/TaskContextType\.DOCUMENT/);
  });
});

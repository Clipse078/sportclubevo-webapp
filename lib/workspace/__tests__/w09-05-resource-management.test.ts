import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import { validateWorkspaceDocumentName } from "@/lib/workspace/document-name";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-09-05 resource management", () => {
  it("W09-05-01 document rename/move services and API routes exist", () => {
    expect(read("lib/workspace/document-rename-service.ts")).toMatch(
      /renameWorkspaceDocument/,
    );
    expect(read("lib/workspace/document-move-service.ts")).toMatch(
      /moveWorkspaceDocument/,
    );
    expect(read("lib/workspace/access/document-move-authorization.ts")).toMatch(
      /evaluateWorkspaceDocumentMove/,
    );
    expect(read("app/api/workspace/documents/[documentId]/rename/route.ts")).toBeTruthy();
    expect(read("app/api/workspace/documents/[documentId]/move/route.ts")).toBeTruthy();
    expect(
      read("app/api/workspace/documents/[documentId]/move-impact/route.ts"),
    ).toBeTruthy();
  });

  it("W09-05-02 audit taxonomy includes document rename and move", () => {
    expect(WorkspaceAuditAction.DOCUMENT_RENAMED).toBe("WORKSPACE_DOCUMENT_RENAMED");
    expect(WorkspaceAuditAction.DOCUMENT_MOVED).toBe("WORKSPACE_DOCUMENT_MOVED");
  });

  it("W09-05-03 UI wires rename/move without Demnächst placeholders", () => {
    const actions = read("components/admin/workspace/WorkspaceDocumentActions.tsx");
    expect(actions).toMatch(/WorkspaceDocumentRenameDialog/);
    expect(actions).toMatch(/WorkspaceDocumentMoveDialog/);
    expect(actions).not.toMatch(/comingSoonLabel={t\("comingSoon"\)/);
    const commandBar = read("components/admin/workspace/WorkspaceCommandBar.tsx");
    expect(commandBar).toMatch(/WorkspaceDocumentRenameDialog/);
    expect(commandBar).not.toMatch(/DEMNAECHST|Demnächst/i);
  });

  it("W09-05-04 permanent delete gated by showPermanentDelete (trash contexts only)", () => {
    const actions = read("components/admin/workspace/WorkspaceDocumentActions.tsx");
    expect(actions).toMatch(/showPermanentDelete = false/);
    expect(actions).toMatch(/showPermanentDelete && canDelete/);
  });

  it("W09-05-05 lifecycle views expose restore management panel", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/WorkspaceLifecycleManagementPanel/);
    const panel = read("components/admin/workspace/WorkspaceLifecycleManagementPanel.tsx");
    expect(panel).toMatch(/restore-trash/);
    expect(panel).toMatch(/\/restore/);
  });

  it("W09-05-06 folder trash action wired from inspector", () => {
    const mgmt = read("components/admin/workspace/WorkspaceFolderInspectorManagement.tsx");
    expect(mgmt).toMatch(/TrashFolderButton/);
    const actions = read("app/(admin)/dashboard/workspace/actions.ts");
    expect(actions).toMatch(/trashWorkspaceFolderAction/);
    expect(actions).toMatch(/requestWorkspaceFolderTrash/);
  });

  it("W09-05-07 stable internal document links remain ID-based after rename/move", () => {
    const link = buildWorkspaceInternalLink({
      type: "document",
      documentId: "doc-stable-1",
    });
    expect(link).toBe("/dashboard/workspace?document=doc-stable-1");
    expect(link).not.toMatch(/folder=/);
  });

  it("W09-05-08 server-side document name validation rejects empty names", () => {
    expect(validateWorkspaceDocumentName("   ").ok).toBe(false);
    expect(validateWorkspaceDocumentName("  Bericht  ").ok).toBe(true);
    if (validateWorkspaceDocumentName("  Bericht  ").ok) {
      expect(validateWorkspaceDocumentName("  Bericht  ").name).toBe("Bericht");
    }
  });
});

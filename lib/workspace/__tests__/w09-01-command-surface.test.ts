import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildActiveFolderCommandContext,
  withDocumentSelection,
} from "@/lib/workspace/command/workspace-command-context";
import { stubWorkspaceAvailableActions } from "@/lib/workspace/command/available-actions-stub";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-09-01 command surface", () => {
  it("W09-01-01 workspace page uses compact lifecycle navigation instead of discovery strip", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/WorkspaceLifecycleNavigation/);
    expect(page).not.toMatch(/WorkspaceDiscoveryPanel/);
  });

  it("W09-01-02 client shell exposes command bar and upload provider", () => {
    const shell = read("components/admin/workspace/WorkspaceClientShell.tsx");
    expect(shell).toMatch(/WorkspaceCommandBar/);
    expect(shell).toMatch(/WorkspaceUploadProvider/);
    expect(shell).not.toMatch(/WorkspaceUploadButton/);
  });

  it("W09-01-03 upload button supports multi-file via shared provider input", () => {
    const provider = read("components/admin/workspace/WorkspaceUploadContext.tsx");
    expect(provider).toMatch(/multiple/);
    expect(provider).toMatch(/useWorkspaceUploadBatch/);
  });

  it("W09-01-04 document row menu omits rename/move placeholders", () => {
    const actions = read("components/admin/workspace/WorkspaceDocumentActions.tsx");
    expect(actions).not.toMatch(/comingSoonLabel={t\("comingSoon"\)/);
    expect(actions).not.toMatch(/label={t\("rename"\)/);
    expect(actions).not.toMatch(/label={t\("move"\)/);
  });

  it("W09-01-05 active folder inspector uses subtle permanent delete", () => {
    const mgmt = read(
      "components/admin/workspace/WorkspaceFolderInspectorManagement.tsx",
    );
    expect(mgmt).toMatch(/variant="subtle"/);
  });

  it("W09-01-06 command bar avoids placeholder controls (W09-02 adds real gated actions)", () => {
    const bar = read("components/admin/workspace/WorkspaceCommandBar.tsx");
    expect(bar).toMatch(/workflowCapabilities\.canCreateTask/);
    expect(bar).not.toMatch(/DEMNAECHST|comingSoon/i);
    expect(bar).not.toMatch(/Sortieren|Ansicht/);
  });

  it("W09-01-07 command context maps document selection to download primary", () => {
    const base = buildActiveFolderCommandContext({
      folderId: "f1",
      folderName: "Docs",
      canUpload: true,
      canCreateFolder: true,
      canManageFolder: false,
      canDelete: false,
    });
    const ctx = withDocumentSelection(base, {
      id: "d1",
      hasCurrentVersion: true,
      canEditDocument: true,
      canManageAccess: false,
    });
    const actions = stubWorkspaceAvailableActions(ctx);
    expect(actions.primary).toContain("download");
    expect(actions.primary).not.toContain("upload");
  });
});

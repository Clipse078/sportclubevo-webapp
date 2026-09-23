import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

/**
 * W08-07A — Server/Client runtime boundary regression for /dashboard/workspace.
 * Detects function-valued props crossing from the workspace page (RSC) into client shells.
 */
describe("WORKSPACE-08-07A runtime boundary sentinels", () => {
  it("W08-07A-01 workspace page does not pass render-prop functions to client tree panel", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).not.toMatch(/createSubfolderSlot\s*=\s*\(/);
    expect(page).not.toMatch(/createSubfolderSlot\s*=\s*\{/);
  });

  it("W08-07A-02 folder tree panel owns subfolder UI on client (no function slot prop)", () => {
    const panel = read("components/admin/workspace/WorkspaceFolderTreePanel.tsx");
    expect(panel).toMatch(/"use client"/);
    expect(panel).toMatch(/CreateSubfolderForm/);
    expect(panel).not.toMatch(/createSubfolderSlot/);
  });

  it("W08-07A-03 workspace page passes serializable capability flags only to tree panel", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    const treeUsage = page.split("<WorkspaceFolderNavPanel")[1]?.split("/>")[0] ?? "";
    expect(treeUsage).toMatch(/canManage=\{canManage\}/);
    expect(treeUsage).toMatch(/selectedFolderId=/);
    expect(treeUsage).not.toMatch(/=\s*\([^)]*\)\s*=>/);
  });

  it("W08-07A-04 client shell still receives ReactNode slots not function props from page", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/folderManagementSlot=\{/);
    expect(page).not.toMatch(/folderManagementSlot=\{\s*\(/);
  });

  it("W08-07A-05 document inspector slot is a ReactNode without function props", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(/documentInspectorSlot=\{/);
    expect(page).not.toMatch(/documentInspectorSlot=\{\s*\(/);
  });
});

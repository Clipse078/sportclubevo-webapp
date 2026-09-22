import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WORKSPACE-03 context menu portal contract", () => {
  it("W03-21 uses FloatingPortal for non-clipping overlay", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "components/admin/workspace/WorkspaceFloatingContextMenu.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("FloatingPortal");
  });

  it("W03-22 uses flip middleware for viewport collision", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "components/admin/workspace/WorkspaceFloatingContextMenu.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("flip(");
  });
});

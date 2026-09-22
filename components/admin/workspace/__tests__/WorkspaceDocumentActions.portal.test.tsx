import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WorkspaceDocumentActions portal wiring", () => {
  it("W03-38 document actions use floating context menu", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "components/admin/workspace/WorkspaceDocumentActions.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("WorkspaceFloatingContextMenu");
    expect(source).not.toContain("absolute right-0 top-full");
  });
});

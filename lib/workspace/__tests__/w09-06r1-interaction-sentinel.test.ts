import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-09-06R1 interaction sentinel", () => {
  it("W09-06R1-01 row layout exposes quick actions and reserved width", () => {
    const actions = read("components/admin/workspace/WorkspaceDocumentActions.tsx");
    expect(actions).toMatch(/layout === "row"/);
    expect(actions).toMatch(/w-\[7\.25rem\]/);
  });

  it("W09-06R1-02 access dialog uses who-has-access heading", () => {
    const dialog = read("components/admin/workspace/WorkspaceAccessManagementDialog.tsx");
    expect(dialog).toMatch(/whoHasAccessHeading/);
    expect(dialog).not.toMatch(/effectiveSection/);
  });

  it("W09-06R1-03 inspector defaults closed in pane preferences", () => {
    const prefs = read("lib/workspace/ui/workspace-pane-preferences.ts");
    expect(prefs).toMatch(/return false/);
  });
});

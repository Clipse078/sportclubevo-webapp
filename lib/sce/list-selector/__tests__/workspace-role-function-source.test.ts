import { describe, expect, it } from "vitest";
import { browseWorkspaceRoleFunctionSelectorItems } from "@/lib/sce/list-selector/sources/workspace-role-function-selector-source";

describe("workspace role/function selector source", () => {
  it("browse returns person function keys, not tenant role ids", async () => {
    const page = await browseWorkspaceRoleFunctionSelectorItems({ limit: 50 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((item) => item.type === "ROLE")).toBe(true);
    expect(page.items.some((item) => item.metadata?.workspaceRoleFunction === true)).toBe(true);
    expect(page.items.every((item) => !item.id.startsWith("cl"))).toBe(true);
  });
});

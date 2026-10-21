// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isOrgBuilderTextEditingTarget } from "@/lib/org/org-builder-command-history";

describe("isOrgBuilderTextEditingTarget", () => {
  it("detects text inputs for shortcut protection", () => {
    const input = document.createElement("input");
    expect(isOrgBuilderTextEditingTarget(input)).toBe(true);
    const div = document.createElement("div");
    expect(isOrgBuilderTextEditingTarget(div)).toBe(false);
  });
});

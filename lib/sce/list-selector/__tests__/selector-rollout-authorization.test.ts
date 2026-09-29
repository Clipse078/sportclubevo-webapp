/**
 * SCE-SELECTOR-02 — extended authorization contexts
 */
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  allowedSourceTypesForSelectorAuthorizationContext,
  filterSelectorSourceTypesForAuthorizationContext,
  routePermissionsForSelectorAuthorizationContext,
} from "@/lib/sce/list-selector/selector-authorization-context";

describe("SCE-SELECTOR-02 authorization contexts", () => {
  it("TASK_ASSIGNMENT exposes USER and task-scoped ORG_UNIT only", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("TASK_ASSIGNMENT")).toEqual([
      "USER",
      "ORG_UNIT",
    ]);
    const perms = routePermissionsForSelectorAuthorizationContext("TASK_ASSIGNMENT");
    expect(perms).toContain(PERMISSIONS.TASKS_ASSIGN);
  });

  it("REQUIREMENT_AUDIENCE exposes PERSON only", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("REQUIREMENT_AUDIENCE")).toEqual([
      "PERSON",
    ]);
  });

  it("WORKSPACE_ACCESS exposes structural audience sources without target groups", () => {
    const allowed = allowedSourceTypesForSelectorAuthorizationContext("WORKSPACE_ACCESS");
    expect(allowed).toEqual(expect.arrayContaining(["PERSON", "TEAM", "ORG_UNIT", "ROLE"]));
    expect(allowed).not.toContain("TARGET_GROUP");
  });

  it("filters USER out of REQUIREMENT_AUDIENCE context", () => {
    const filtered = filterSelectorSourceTypesForAuthorizationContext({
      context: "REQUIREMENT_AUDIENCE",
      requested: ["PERSON", "USER"],
    });
    expect(filtered).toEqual(["PERSON"]);
  });
});

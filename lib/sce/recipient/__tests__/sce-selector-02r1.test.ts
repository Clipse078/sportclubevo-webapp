/**
 * SCE-SELECTOR-02R1 — recipient unification contracts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowedSourceTypesForSelectorAuthorizationContext,
  routePermissionsForSelectorAuthorizationContext,
} from "@/lib/sce/list-selector/selector-authorization-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-SELECTOR-02R1 contract matrix", () => {
  it("TASK_ASSIGNMENT uses PERSON + task ORG_UNIT with assign permissions", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("TASK_ASSIGNMENT")).toEqual([
      "PERSON",
      "ORG_UNIT",
    ]);
    const perms = routePermissionsForSelectorAuthorizationContext("TASK_ASSIGNMENT");
    expect(perms).toContain(PERMISSIONS.TASKS_ASSIGN);
  });

  it("REQUIREMENT_AUDIENCE exposes structural rule sources resolved to persons (02R5)", () => {
    expect(allowedSourceTypesForSelectorAuthorizationContext("REQUIREMENT_AUDIENCE")).toEqual([
      "PERSON",
      "TEAM",
      "ORG_UNIT",
      "ROLE",
      "TARGET_GROUP",
    ]);
  });

  it("TARGET_GROUP_MANAGEMENT keeps PERSON without USER split", () => {
    const allowed = allowedSourceTypesForSelectorAuthorizationContext("TARGET_GROUP_MANAGEMENT");
    expect(allowed).toContain("PERSON");
    expect(allowed).not.toContain("USER");
  });

  it("COMMUNICATION_SEND uses PERSON audience model", () => {
    const allowed = allowedSourceTypesForSelectorAuthorizationContext("COMMUNICATION_SEND");
    expect(allowed).toContain("PERSON");
  });

  it("no parallel requirement picker implementations remain", () => {
    const builder = read("components/admin/aufgaben/RequirementAudienceBuilder.tsx");
    expect(builder).toContain("SceRecipientSelector");
    expect(builder).not.toContain("RequirementPersonMultiPicker");
    expect(builder).not.toContain("RequirementTeamPicker");
    expect(builder).not.toContain("SelectorAddPanel");
  });

  it("task assignee UI uses PERSON discovery with linked user metadata", () => {
    const picker = read("components/admin/aufgaben/TaskPeopleMultiPicker.tsx");
    expect(picker).toContain('sourceTypes={["PERSON"]}');
    expect(picker).toContain("linkedUserId");
  });
});

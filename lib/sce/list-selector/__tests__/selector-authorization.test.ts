/**
 * SCE-SELECTOR-01R2 — selector authorization contract matrix
 */
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  allowedSourceTypesForSelectorAuthorizationContext,
  communicationDiscoverParamToAuthorizationContext,
  filterSelectorSourceTypesForAuthorizationContext,
  isSceSelectorAuthorizationContext,
  routePermissionsForSelectorAuthorizationContext,
} from "@/lib/sce/list-selector/selector-authorization-context";

describe("SCE selector authorization context", () => {
  it("maps Zielgruppen discover param to TARGET_GROUP_MANAGEMENT permissions", () => {
    expect(communicationDiscoverParamToAuthorizationContext("TARGET_GROUP_MANAGEMENT")).toBe(
      "TARGET_GROUP_MANAGEMENT",
    );
    const perms = routePermissionsForSelectorAuthorizationContext("TARGET_GROUP_MANAGEMENT");
    expect(perms).toContain(PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE);
    expect(perms).not.toContain(PERMISSIONS.COMMUNICATION_CLUB_SEND);
  });

  it("maps organisation discover param to communication send gate", () => {
    expect(communicationDiscoverParamToAuthorizationContext("ORGANISATION")).toBe(
      "COMMUNICATION_SEND",
    );
    const perms = routePermissionsForSelectorAuthorizationContext("COMMUNICATION_SEND");
    expect(perms).toContain(PERMISSIONS.COMMUNICATION_CLUB_SEND);
    expect(perms).toContain(PERMISSIONS.COMMUNICATION_CLUB_VIEW);
  });

  it("TARGET_GROUP_MANAGEMENT excludes recursive TARGET_GROUP source", () => {
    const allowed = allowedSourceTypesForSelectorAuthorizationContext("TARGET_GROUP_MANAGEMENT");
    expect(allowed).toEqual(
      expect.arrayContaining(["ORG_UNIT", "TEAM", "ROLE", "PERSON", "EXTERNAL_CONTACT"]),
    );
    expect(allowed).not.toContain("TARGET_GROUP");
  });

  it("rejects arbitrary authContext values on generic selector contract", () => {
    expect(isSceSelectorAuthorizationContext("users.manage_memberships")).toBe(false);
    expect(isSceSelectorAuthorizationContext(null)).toBe(false);
  });

  it("filters invalid sources for context (no arbitrary source outside contract)", () => {
    const filtered = filterSelectorSourceTypesForAuthorizationContext({
      context: "TARGET_GROUP_MANAGEMENT",
      requested: ["ORG_UNIT", "TARGET_GROUP"],
    });
    expect(filtered).toEqual(["ORG_UNIT"]);
  });
});

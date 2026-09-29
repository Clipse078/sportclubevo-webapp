import { describe, expect, it } from "vitest";
import { applyPermissionOverrides } from "@/lib/permissions/apply-permission-overrides";

describe("applyPermissionOverrides", () => {
  it("DENY removes inherited role permission", () => {
    const baseline = new Set(["teams.view", "teams.manage"]);
    const effective = applyPermissionOverrides(baseline, [
      { permissionKey: "teams.view", effect: "DENY" },
    ]);
    expect(effective.has("teams.view")).toBe(false);
    expect(effective.has("teams.manage")).toBe(true);
  });

  it("ALLOW adds permission not in role baseline", () => {
    const baseline = new Set(["teams.view"]);
    const effective = applyPermissionOverrides(baseline, [
      { permissionKey: "news.manage", effect: "ALLOW" },
    ]);
    expect(effective.has("news.manage")).toBe(true);
  });

  it("DENY wins over role grant", () => {
    const baseline = new Set(["users.manage"]);
    const effective = applyPermissionOverrides(baseline, [
      { permissionKey: "users.manage", effect: "DENY" },
    ]);
    expect(effective.has("users.manage")).toBe(false);
  });
});

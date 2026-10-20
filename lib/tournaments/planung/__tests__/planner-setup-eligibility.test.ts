import { describe, expect, it } from "vitest";
import {
  resolvePlannerSetupActivation,
  shouldExposePlannerSetupPrimaryAction,
} from "../planner-setup-eligibility";

describe("planner setup eligibility (DS-06-R1 / TP01-02)", () => {
  it("allows HOME legacy tournament without fixtures to activate planner setup", () => {
    expect(
      resolvePlannerSetupActivation({
        ownership: "TENANT_ORGANISED",
        fixtureCount: 0,
        assignmentCount: 0,
        hasPlannerSetupIncomplete: true,
      }).allowed,
    ).toBe(true);
  });

  it("allows Spielplan-disabled HOME tournament to activate later", () => {
    expect(
      resolvePlannerSetupActivation({
        ownership: "TENANT_ORGANISED",
        fixtureCount: 0,
        assignmentCount: 0,
        hasPlannerSetupIncomplete: true,
      }),
    ).toEqual({ allowed: true, mode: "RESUME_INCOMPLETE" });
  });

  it("blocks AWAY / external tournaments from tenant planner activation", () => {
    expect(
      resolvePlannerSetupActivation({
        ownership: "EXTERNALLY_ORGANISED",
        fixtureCount: 0,
        assignmentCount: 0,
        hasPlannerSetupIncomplete: true,
      }),
    ).toEqual({ allowed: false, code: "EXTERNALLY_ORGANISED" });
  });

  it("leaves configured tournaments unchanged (no parallel setup)", () => {
    expect(
      resolvePlannerSetupActivation({
        ownership: "TENANT_ORGANISED",
        fixtureCount: 4,
        assignmentCount: 4,
        hasPlannerSetupIncomplete: false,
      }),
    ).toEqual({ allowed: false, code: "ALREADY_SCHEDULED" });
  });

  it("exposes primary setup CTA only for tenant-organised incomplete planung", () => {
    expect(
      shouldExposePlannerSetupPrimaryAction({
        ownership: "TENANT_ORGANISED",
        incompleteSetupCodes: ["PLANNER_SETUP", "PITCHES"],
        canManage: true,
      }),
    ).toBe(true);
    expect(
      shouldExposePlannerSetupPrimaryAction({
        ownership: "EXTERNALLY_ORGANISED",
        incompleteSetupCodes: ["PLANNER_SETUP"],
        canManage: true,
      }),
    ).toBe(false);
  });
});

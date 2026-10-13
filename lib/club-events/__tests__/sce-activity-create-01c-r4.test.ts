import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  clubEventFreigabenMayShowDecisionForm,
  resolveClubEventFreigabenAccessFromContext,
  tenantCanAdministerClubEventGovernance,
} from "@/lib/club-events/governance/resolve-club-event-freigaben-access";

const approve = PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE;

/** Realistic FC Allschwil Club Admin tenant bundle (no platform `users.manage`). */
const CLUB_ADMIN_TENANT_PERMISSIONS = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.PEOPLE_MANAGE,
] as const;

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C-R4 — Club Admin governance access resolution", () => {
  describe("tenantCanAdministerClubEventGovernance", () => {
    it("recognizes canonical Club Admin membership management permission", () => {
      expect(
        tenantCanAdministerClubEventGovernance([], [...CLUB_ADMIN_TENANT_PERMISSIONS]),
      ).toBe(true);
    });

    it("does not treat platform-only users.manage as required for Club Admin", () => {
      expect(tenantCanAdministerClubEventGovernance([], [PERMISSIONS.USERS_VIEW])).toBe(
        false,
      );
    });
  });

  describe("Freigaben access matrix", () => {
    it("TEST A — club admin not in validator pool → governance-admin non-approver", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [...CLUB_ADMIN_TENANT_PERMISSIONS],
        personId: "person-po",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toMatchObject({
        kind: "unauthorized",
        display: "GOVERNANCE_ADMIN_NON_VALIDATOR",
      });
      expect(access.kind === "unauthorized" ? access.reason : null).toBe(
        "MISSING_APPROVE_PERMISSION",
      );
    });

    it("TEST B — club admin validator with approve → approval workspace", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [...CLUB_ADMIN_TENANT_PERMISSIONS, approve],
        personId: "person-validator",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toEqual({
        kind: "authorized",
        personId: "person-validator",
        validatorPersonIds: ["person-validator"],
      });
    });

    it("TEST C — ordinary events user → standard unauthorized", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [PERMISSIONS.EVENTS_MANAGE],
        personId: "person-user",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toEqual({
        kind: "unauthorized",
        reason: "MISSING_APPROVE_PERMISSION",
        display: "STANDARD",
      });
    });

    it("TEST D — approve permission without validator pool membership", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [approve],
        personId: "person-user",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toMatchObject({
        kind: "unauthorized",
        reason: "NOT_IN_VALIDATOR_POOL",
        display: "STANDARD",
      });
      if (access.kind !== "authorized") {
        expect(
          clubEventFreigabenMayShowDecisionForm({
            access,
            creatorPersonId: "person-creator",
          }),
        ).toBe(false);
      }
    });

    it("TEST E — validator pool without approve permission", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [...CLUB_ADMIN_TENANT_PERMISSIONS],
        personId: "person-po",
        validatorPersonIds: ["person-po"],
      });
      expect(access).toMatchObject({
        kind: "unauthorized",
        reason: "MISSING_APPROVE_PERMISSION",
        display: "GOVERNANCE_ADMIN_NON_VALIDATOR",
      });
    });

    it("TEST F — self-submission cannot show decision form", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [approve],
        personId: "person-validator",
        validatorPersonIds: ["person-validator"],
      });
      expect(access.kind).toBe("authorized");
      if (access.kind !== "authorized") return;
      expect(
        clubEventFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: "person-validator",
        }),
      ).toBe(false);
    });
  });

  it("TEST G — approval decision service scopes revisions by tenant", () => {
    const service = read("lib/club-events/composer/club-event-approval-service.ts");
    expect(service).toMatch(/tenantId:\s*input\.tenantId/);
    expect(service).toContain("approverIsValidator && input.approverHeldApprovePermission");
  });

  it("TEST H — Freigaben verwalten destination matches people-access guard", () => {
    const unauthorized = read(
      "components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState.tsx",
    );
    const peopleAccess = read("app/(admin)/dashboard/admin/people-access/page.tsx");
    expect(unauthorized).toContain('adminActionHref: "/dashboard/admin/people-access"');
    expect(peopleAccess).toContain("PERMISSIONS.USERS_VIEW");
    expect(peopleAccess).toContain("PERMISSIONS.USERS_MANAGE");
    expect(
      tenantCanAdministerClubEventGovernance([], [PERMISSIONS.USERS_VIEW, ...CLUB_ADMIN_TENANT_PERMISSIONS]),
    ).toBe(true);
  });

  it("TEST I — unauthorized UX does not expose raw permission keys", () => {
    const unauthorized = read(
      "components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState.tsx",
    );
    expect(unauthorized).not.toContain("activities.club_event.approve");
    expect(unauthorized).not.toContain("users.manage");
    expect(unauthorized).not.toContain("users.manage_memberships");
  });

  it("aligns club-event governance API with Personen & Zugänge manage permissions", () => {
    const route = read("app/api/admin/sce/activity-governance/club-event/route.ts");
    expect(route).toContain("USERS_MANAGE_MEMBERSHIPS");
    expect(route).not.toMatch(/requirePermission\(PERMISSIONS\.USERS_MANAGE\)/);
  });

  it("load path resolves governance admin from effective permissions", () => {
    const loader = read("lib/club-events/governance/load-club-event-freigaben-access.ts");
    expect(loader).not.toContain("PERMISSIONS.USERS_MANAGE");
    expect(loader).toContain("resolveClubEventFreigabenAccessFromContext");
  });
});

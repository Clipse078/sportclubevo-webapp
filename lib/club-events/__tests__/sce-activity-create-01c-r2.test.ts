import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  clubEventFreigabenMayShowDecisionForm,
  resolveClubEventFreigabenAccessFromContext,
} from "@/lib/club-events/governance/resolve-club-event-freigaben-access";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C-R2 — PO UAT corrections", () => {
  it("Freigaben page does not use requirePermission dashboard redirect", () => {
    const page = read("app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx");
    expect(page).not.toContain("requirePermission");
    expect(page).toContain("requireAnyPermission");
    expect(page).toContain("ClubEventFreigabenUnauthorizedState");
    expect(page).not.toContain('redirect("/dashboard")');
  });

  it("backfills club event approve permission onto tenant Club Admin roles", () => {
    const migration = read(
      "prisma/migrations/20261013210000_sce_club_admin_club_event_approve_backfill/migration.sql",
    );
    expect(migration).toContain("activities.club_event.approve");
    expect(migration).toContain("club_admin__%");
  });

  it("renders exactly one visible composer create trigger", () => {
    const trigger = read("components/admin/veranstaltungen/VeranstaltungenComposerCreateTrigger.tsx");
    expect(trigger).not.toContain("veranstaltungen-create-overlay-trigger-mobile");
    expect((trigger.match(/data-testid="veranstaltungen-create-overlay-trigger"/g) ?? []).length).toBe(
      1,
    );
    expect((trigger.match(/<button/g) ?? []).length).toBe(1);
  });

  it("keeps /new page fallback link without a second visible CTA", () => {
    const trigger = read("components/admin/veranstaltungen/VeranstaltungenComposerCreateTrigger.tsx");
    expect(trigger).toContain('href="/dashboard/veranstaltungen/new"');
    expect(trigger).toContain("sr-only");
  });

  describe("Freigaben access resolution", () => {
    const approve = PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE;

    it("authorizes validator with approve permission", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [approve],
        personId: "person-validator",
        validatorPersonIds: ["person-validator", "person-other"],
      });
      expect(access).toEqual({
        kind: "authorized",
        personId: "person-validator",
        validatorPersonIds: ["person-validator", "person-other"],
      });
    });

    it("denies club admin without approve permission explicitly", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [PERMISSIONS.EVENTS_MANAGE],
        personId: "person-admin",
        validatorPersonIds: ["person-admin"],
      });
      expect(access).toEqual({
        kind: "unauthorized",
        reason: "MISSING_APPROVE_PERMISSION",
      });
    });

    it("denies holder of approve permission outside validator pool", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [approve],
        personId: "person-admin",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toEqual({
        kind: "unauthorized",
        reason: "NOT_IN_VALIDATOR_POOL",
      });
    });

    it("blocks decision UI for self-approval while keeping authorized workspace", () => {
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
      expect(
        clubEventFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: "person-creator",
        }),
      ).toBe(true);
    });
  });

  it("provides freigaben route module on disk", () => {
    expect(
      existsSync(join(root, "app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx")),
    ).toBe(true);
  });
});

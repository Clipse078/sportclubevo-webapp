import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildClubEventCreatorGovernanceRows,
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF,
  buildClubEventGovernanceUserDetailHref,
  parseClubEventGovernancePeopleAccessContext,
} from "@/lib/club-events/governance/club-event-governance-people-access-context";
import type { SceActivityTypeGovernancePolicy } from "@/lib/sce/activity-governance/types";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const clubEventTypePolicy: SceActivityTypeGovernancePolicy = {
  activityType: "CLUB_EVENT",
  defaultPublicationAuthority: "DIRECT_PUBLISH",
  validatorPersonIds: [],
  creatorPolicies: [
    {
      personId: "person-approval",
      createEnabled: true,
      publicationAuthority: "APPROVAL_REQUIRED",
    },
  ],
};

describe("SCE-ACTIVITY-CREATE-01C-R5 — governance configuration discoverability", () => {
  it("A — Freigaben verwalten opens people-access with club-event governance context", () => {
    const unauthorized = read(
      "components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState.tsx",
    );
    expect(unauthorized).toContain("CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF");
    expect(CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF).toContain(
      `context=${CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT}`,
    );
    const page = read("app/(admin)/dashboard/admin/people-access/page.tsx");
    expect(page).toContain("parseClubEventGovernancePeopleAccessContext");
    expect(page).toContain("ClubEventGovernancePeopleAccessView");
  });

  it("B — direct people-access without context keeps generic list", () => {
    const page = read("app/(admin)/dashboard/admin/people-access/page.tsx");
    expect(page).toContain("TenantUsersSearchableList");
    expect(page).toContain("Personen & Zugänge");
    expect(parseClubEventGovernancePeopleAccessContext(undefined)).toBe(false);
  });

  it("C — validator pool visible in governance context view", () => {
    const view = read("components/admin/users/people-access/ClubEventGovernancePeopleAccessView.tsx");
    const validators = read("components/admin/users/people-access/ClubEventValidatorPoolSection.tsx");
    expect(view).toContain("ClubEventValidatorPoolSection");
    expect(validators).toContain("Freigabeberechtigte Personen");
    expect(validators).toContain("SceChipMultiSelectorField");
    expect(validators).not.toContain('type="checkbox"');
  });

  it("D/E — creator policy rows distinguish direct vs approval-required", () => {
    const rows = buildClubEventCreatorGovernanceRows({
      clubEventTypePolicy,
      users: [
        {
          userId: "user-direct",
          firstName: "Patrick",
          lastName: "Scotton",
          name: "Patrick Scotton",
          email: "p@example.com",
          userIsActive: true,
          membershipIsActive: true,
          joinedAt: new Date(),
          lastLoginAt: null,
          roles: [{ id: "role-events", name: "Events", key: "events" }],
          scopedRoles: [],
          platformRoles: [],
          isPlatformSystemIdentity: false,
          linkedPersonId: "person-direct",
          linkedPersonName: "Patrick Scotton",
          pendingInvitation: false,
        },
        {
          userId: "user-approval",
          firstName: "Sandra",
          lastName: "Fischer",
          name: "Sandra Fischer",
          email: "s@example.com",
          userIsActive: true,
          membershipIsActive: true,
          joinedAt: new Date(),
          lastLoginAt: null,
          roles: [{ id: "role-events", name: "Events", key: "events" }],
          scopedRoles: [],
          platformRoles: [],
          isPlatformSystemIdentity: false,
          linkedPersonId: "person-approval",
          linkedPersonName: "Sandra Fischer",
          pendingInvitation: false,
        },
      ],
      personsWithoutUser: [],
      roleIdsWithEventsManage: new Set(["role-events"]),
    });

    const direct = rows.find((r) => r.personId === "person-direct");
    const approval = rows.find((r) => r.personId === "person-approval");
    expect(direct?.publicationLabel).toBe("Direkt");
    expect(approval?.publicationLabel).toBe("Freigabe erforderlich");
    expect(direct?.createLabel).toBe("Ja");
    expect(approval?.createLabel).toBe("Ja");
  });

  it("F — zero-validator empty state is explicit in validator section", () => {
    const validators = read("components/admin/users/people-access/ClubEventValidatorPoolSection.tsx");
    expect(validators).toContain("club-event-validator-pool-empty");
    expect(validators).toContain("Es sind noch keine freigabeberechtigten Personen hinterlegt");
  });

  it("G — approval-required without validators remains guarded server-side", () => {
    const upsert = read(
      "lib/sce/activity-governance/persistence/upsert-person-club-event-governance.ts",
    );
    expect(upsert).toContain("validateActivityGovernanceConfiguration");
    const person = read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx");
    expect(person).toContain("validatorCount === 0");
    expect(person).toContain("Freigabeberechtigte verwalten");
  });

  it("H — governance admin can navigate back to Freigaben", () => {
    const view = read("components/admin/users/people-access/ClubEventGovernancePeopleAccessView.tsx");
    expect(view).toContain("Zurück zu Freigaben");
    expect(view).toContain("CLUB_EVENT_FREIGABEN_HREF");
  });

  it("I — person detail preserves governance return context", () => {
    expect(buildClubEventGovernanceUserDetailHref("user-1")).toContain("returnContext=");
    expect(buildClubEventGovernanceUserDetailHref("user-1")).toContain(
      CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
    );
    expect(buildClubEventGovernanceUserDetailHref("user-1")).toContain("tab=veranstaltungs-freigaben");
    const detail = read("app/(admin)/dashboard/admin/users/[userId]/page.tsx");
    expect(detail).toContain("parseClubEventGovernanceReturnContext");
    expect(detail).toContain("Zurück zu Veranstaltungs-Freigaben");
  });

  it("J — governance context requires governance administration authority", () => {
    const page = read("app/(admin)/dashboard/admin/people-access/page.tsx");
    expect(page).toContain("tenantCanAdministerClubEventGovernance");
    expect(page).toContain("notFound()");
  });

  it("K — no raw permission keys in governance administration UX", () => {
    const view = read("components/admin/users/people-access/ClubEventGovernancePeopleAccessView.tsx");
    expect(view).not.toContain(PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE);
    expect(view).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(view).not.toContain("users.manage_memberships");
  });

  it("L — toggle-first: no new binary checkboxes in governance surfaces", () => {
    const view = read("components/admin/users/people-access/ClubEventGovernancePeopleAccessView.tsx");
    const validators = read("components/admin/users/people-access/ClubEventValidatorPoolSection.tsx");
    expect(view).not.toContain('type="checkbox"');
    expect(validators).not.toContain('type="checkbox"');
    expect(read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx")).toContain(
      "SwitchToggle",
    );
  });
});

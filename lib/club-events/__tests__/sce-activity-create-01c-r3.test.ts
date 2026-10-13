import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveClubEventFreigabenAccessFromContext } from "@/lib/club-events/governance/resolve-club-event-freigaben-access";
import {
  clubEventAudienceToEditorInitial,
  hydrateClubEventComposerFormFromDraft,
} from "@/lib/club-events/composer/hydrate-club-event-composer-form-from-draft";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const FIXTURE_DRAFT: ClubEventComposerDraftPayload = {
  seasonId: "season-persisted",
  title: "Sponsorenanlass R3",
  category: "Sponsorenanlass",
  description: "Beschreibung R3",
  location: "Clubhaus",
  organizerName: "Vorstand",
  remarks: "Hinweis",
  schedule: {
    allDay: false,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
    startTime: "19:30",
    endTime: "22:00",
  },
  audience: {
    scope: "SELECTED_ORG_UNITS",
    targets: [
      { kind: "TEAM", id: "team-1", label: "U17" },
      { kind: "ORG_UNIT", id: "ou-1", label: "Jugend" },
    ],
  },
  ausspielung: {
    websiteVisible: false,
    homepageVisible: true,
    wochenplanVisible: true,
  },
  recurrence: {
    enabled: true,
    frequency: "WEEKLY",
    intervalCount: 2,
    weekday: "WEDNESDAY",
    monthlyPatternKind: "ORDINAL_WEEKDAY",
    monthDay: 10,
    monthOrdinal: "SECOND",
    endMode: "AFTER_COUNT",
    endDate: "",
    occurrenceCount: 6,
  },
  resources: [
    {
      kind: "pitch_hall",
      facilityResourceId: "res-pitch",
      facilityResourceName: "Hauptplatz",
    },
    {
      kind: "dressing_room",
      facilityResourceId: "res-dressing",
      facilityResourceName: "Heimgarderobe",
    },
    {
      kind: "other",
      facilityResourceId: "res-other",
      facilityResourceName: "Bar",
    },
  ],
};

describe("SCE-ACTIVITY-CREATE-01C-R3 — draft resume + Freigaben UX", () => {
  it("wires resumeDraft and server hydration in create form", () => {
    const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
    expect(form).toContain("resumeDraft={resumeDraft}");
    expect(form).toContain("initialResumeDraft");
    expect(form).toContain("persistedBaseline");
    expect(form).toContain("clubEventAudienceToEditorInitial");
    expect(form).toContain("resolveClubEventComposerTitleForResume");
  });

  it("loads editable drafts for creator on page and GET API", () => {
    expect(read("app/(admin)/dashboard/veranstaltungen/new/page.tsx")).toContain(
      "club-event-composer-draft-access.server",
    );
    expect(read("app/api/club-events/composer/drafts/[draftId]/route.ts")).toContain(
      "club-event-composer-draft-access.server",
    );
    expect(read("lib/club-events/composer/club-event-draft-persistence.ts")).toContain(
      "createdByPersonId: input.actorPersonId",
    );
  });

  it("round-trips all tab fields through hydration helper", () => {
    let counter = 0;
    const hydrated = hydrateClubEventComposerFormFromDraft(FIXTURE_DRAFT, (prefix) => {
      counter += 1;
      return `${prefix}-${counter}`;
    });

    expect(hydrated.seasonId).toBe("season-persisted");
    expect(hydrated.title).toBe("Sponsorenanlass R3");
    expect(hydrated.category).toBe("Sponsorenanlass");
    expect(hydrated.description).toBe("Beschreibung R3");
    expect(hydrated.organizerName).toBe("Vorstand");
    expect(hydrated.remarks).toBe("Hinweis");
    expect(hydrated.audience.scope).toBe("SELECTED_ORG_UNITS");
    expect(hydrated.audience.targets).toHaveLength(2);
    expect(hydrated.schedule.startDate).toBe("2026-11-12");
    expect(hydrated.recurrence.enabled).toBe(true);
    expect(hydrated.recurrence.frequency).toBe("WEEKLY");
    expect(hydrated.pitchDraft?.facilityResourceId).toBe("res-pitch");
    expect(hydrated.dressingDraft?.facilityResourceId).toBe("res-dressing");
    expect(hydrated.otherDrafts).toHaveLength(1);
    expect(hydrated.ausspielung.homepageVisible).toBe(true);

    const audienceInitial = clubEventAudienceToEditorInitial(hydrated.audience);
    expect(audienceInitial.teamIds).toEqual(["team-1"]);
    expect(audienceInitial.orgUnitIds).toEqual(["ou-1"]);
  });

  it("prefers persisted season over tenant default in seasons effect guard", () => {
    const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
    expect(form).toContain("if (!initialDraftId && !initialResumeDraft)");
  });

  describe("Freigaben access UX", () => {
    const approve = PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE;

    it("shows governance-admin copy for club admin outside validator pool", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [approve, PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
        personId: "person-admin",
        validatorPersonIds: ["person-validator"],
      });
      expect(access).toEqual({
        kind: "unauthorized",
        reason: "NOT_IN_VALIDATOR_POOL",
        display: "GOVERNANCE_ADMIN_NON_VALIDATOR",
      });
    });

    it("keeps standard unauthorized copy for ordinary users", () => {
      const access = resolveClubEventFreigabenAccessFromContext({
        platformPermissions: [],
        tenantPermissions: [PERMISSIONS.EVENTS_MANAGE],
        personId: "person-user",
        validatorPersonIds: ["person-validator"],
        canManageGovernance: false,
      });
      expect(access).toEqual({
        kind: "unauthorized",
        reason: "MISSING_APPROVE_PERMISSION",
        display: "STANDARD",
      });
    });
  });
});

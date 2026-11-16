import { describe, expect, it } from "vitest";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMeetingPresentationFromProgramme } from "../adapters/meeting-programme";
import { resolveProgrammeDashboardPreviewClubIdentity } from "../programme-dashboard-preview-identity";
import type { SceClubEventPresentationModel } from "../types";
import { buildSceActivityRoute } from "../route";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";

describe("resolveProgrammeDashboardPreviewClubIdentity", () => {
  it("returns tenant club and team for training", () => {
    const model = createSceTrainingCardFixtureSession({
      team: { name: "Junioren B1" },
      trainingTitle: "Techniktraining",
      tenantClub: buildClubIdentity({ displayName: "Sportclub Muster", logoUrl: "https://cdn/x.png" }),
    });
    expect(resolveProgrammeDashboardPreviewClubIdentity(model)).toEqual({
      crestIdentity: model.tenantClub,
      clubName: "Sportclub Muster",
      unitLabel: "Junioren B1",
    });
  });

  it("drops organisational unit duplicated in authored title", () => {
    const model = createSceTrainingCardFixtureSession({
      team: { name: "Junioren B1" },
      trainingTitle: "Junioren B1 Training",
      tenantClub: buildClubIdentity({ displayName: "Sportclub Muster" }),
    });
    expect(resolveProgrammeDashboardPreviewClubIdentity(model)).toEqual({
      crestIdentity: model.tenantClub,
      clubName: "Sportclub Muster",
      unitLabel: undefined,
    });
  });

  it("does not treat club-event audience scope as organisational unit", () => {
    const model: SceClubEventPresentationModel = {
      kind: "CLUB_EVENT",
      activityId: "evt-1",
      resourceKey: "club-event:evt-1",
      typeLabel: "Veranstaltung",
      eventTitle: "Sommerfest",
      schedule: { startAt: "2026-08-01T14:00:00.000Z", endAt: null, allDay: false },
      location: buildSportingActivityLocation({ mode: "HOME", venueName: "Clubhaus" }),
      route: buildSceActivityRoute("CLUB_EVENT", "club-event:evt-1"),
      tenantClub: buildClubIdentity({ displayName: "Sportclub Muster" }),
      audience: {
        scope: "SELECTED_ORG_UNITS",
        primaryLabel: "Junioren F1 · Junioren F2",
        compactLabel: "2 Teams",
        targetCount: 2,
        teamCount: 2,
      },
    };
    const identity = resolveProgrammeDashboardPreviewClubIdentity(model);
    expect(identity?.clubName).toBe("Sportclub Muster");
    expect(identity?.unitLabel).toBeUndefined();
  });

  it("returns tenant club without role fallback for meetings", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-1",
      slug: "vorstand",
      title: "Vorstandssitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      organisationalContext: "Vorstand",
      tenantClub: buildClubIdentity({ displayName: "Sportclub Muster" }),
    });
    expect(resolveProgrammeDashboardPreviewClubIdentity(model)?.clubName).toBe("Sportclub Muster");
    expect(resolveProgrammeDashboardPreviewClubIdentity(model)?.unitLabel).toBe("Vorstand");
  });
});
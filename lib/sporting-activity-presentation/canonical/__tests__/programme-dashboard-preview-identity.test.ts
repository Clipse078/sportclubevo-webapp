import { describe, expect, it } from "vitest";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMeetingPresentationFromProgramme } from "../adapters/meeting-programme";
import { resolveProgrammeDashboardPreviewClubIdentity } from "../programme-dashboard-preview-identity";

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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatSceActivityLocationHierarchy } from "../location-format";
import { resolveSceTrainingPresentationFromManagementRow } from "../adapters/training-management";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "../adapters/weekplanner-training";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const repoRoot = process.cwd();

describe("SCE-UI-ROLLOUT-01E — architecture guardrails", () => {
  it("documents canonical Training card in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("SceTrainingCard");
    expect(doc).toContain("Canonical Training card family");
  });

  it("uses a single canonical SceTrainingCard module", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceTrainingCard.tsx"),
      "utf8",
    );
    expect(source).toContain("SceTrainingPresentationModel");
    expect(source).not.toContain("TrainingCardModel");
    expect(source).not.toContain("TrainingPresentationModelV2");
    expect(source).toContain("data-sce-training-density");
    expect(source).not.toMatch(/function\s+SceTrainingHero/);
    expect(source).not.toMatch(/function\s+SceTrainingStandard/);
    expect(source).not.toContain("VS");
    expect(source).not.toContain("fixture");
  });

  it("management adapter produces recurring definition schedulePresentation", () => {
    const model = resolveSceTrainingPresentationFromManagementRow(
      {
        teamSeasonId: "ts-1",
        title: "Training",
        teamDisplayName: "Junioren B1",
        weekdays: ["MONDAY", "WEDNESDAY"],
        rhythmLabel: "Mo · Mi",
        timeLabel: "18:00–19:30",
        timeDetailLines: null,
        facilityVenueName: "Im Brüel",
        facilityResourceLabel: "KR2",
        status: "ACTIVE",
      },
      "FC Allschwil",
    );
    expect(model.kind).toBe("TRAINING");
    expect(model.schedulePresentation?.kind).toBe("RECURRING_DEFINITION");
    expect(formatSceActivityLocationHierarchy(model.location)).toBe(
      "FC Allschwil · Im Brüel · KR2",
    );
  });

  it("weekplanner adapter uses session schedulePresentation", () => {
    const item: WeekplannerTrainingItem = {
      id: "training:session-1",
      tenantId: "t1",
      type: "TRAINING",
      startAt: new Date("2026-10-12T16:45:00.000Z"),
      endAt: new Date("2026-10-12T18:15:00.000Z"),
      canonicalStartAt: new Date("2026-10-12T16:45:00.000Z"),
      canonicalEndAt: new Date("2026-10-12T18:15:00.000Z"),
      timeOverridden: false,
      title: "Junioren B1 Training",
      teamNames: ["Junioren B1"],
      pitchAllocations: [
        {
          facilityResourceId: "r1",
          facilityId: "f1",
          code: "KR2",
          name: "KR2",
          facilityName: "Im Brüel",
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      trainingSeriesId: "series-1",
      trainingSessionId: "session-1",
      teamSeasonId: "ts-1",
    };
    const model = resolveSceTrainingPresentationFromWeekplannerTraining(item, {
      tenantClubName: "FC Allschwil",
    });
    expect(model.schedulePresentation?.kind).toBe("SESSION");
    expect(model.resourceKey).toBe("training-session:session-1");
  });

  it("representative consumers import SceTrainingCard", () => {
    const paths = [
      "components/admin/training/TrainingSeriesManagementRow.tsx",
      "components/admin/planner/WeekplannerTrainingIdentityCard.tsx",
      "components/sporting-activity/detail/SportingActivityDetailContent.tsx",
    ];
    for (const relativePath of paths) {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src, relativePath).toContain("SceTrainingCard");
    }
  });

  it("does not introduce new binary checkboxes in 01E training card sources", () => {
    const paths = [
      "components/sporting-activity/SceTrainingCard.tsx",
      "components/admin/training/TrainingSeriesManagementRow.tsx",
      "components/admin/planner/WeekplannerTrainingIdentityCard.tsx",
    ];
    for (const relativePath of paths) {
      const src = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(src, relativePath).not.toMatch(/type=["']checkbox["']/);
    }
  });
});

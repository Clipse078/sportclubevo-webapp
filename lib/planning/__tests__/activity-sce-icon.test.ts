import { describe, expect, it } from "vitest";
import {
  ACTIVITY_SCE_ICON_BY_KIND,
  getActivitySceIconName,
  getProgrammeSourceActivitySceIconName,
  getWeekplannerActivitySceIconName,
} from "@/lib/planning/activity-sce-icon";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";

describe("activity-sce-icon mapping", () => {
  it("maps TRAINING, MATCH, and TOURNAMENT to approved registry names", () => {
    expect(getActivitySceIconName("TRAINING")).toBe("training");
    expect(getActivitySceIconName("MATCH")).toBe("match");
    expect(getActivitySceIconName("TOURNAMENT")).toBe("tournament");
    expect(ACTIVITY_SCE_ICON_BY_KIND.TRAINING).toBe("training");
    expect(ACTIVITY_SCE_ICON_BY_KIND.MATCH).toBe("match");
    expect(ACTIVITY_SCE_ICON_BY_KIND.TOURNAMENT).toBe("tournament");
  });

  it("returns null for unsupported activity kinds", () => {
    expect(getActivitySceIconName("EVENT")).toBeNull();
    expect(getActivitySceIconName("MEETING")).toBeNull();
    expect(getActivitySceIconName("VERANSTALTUNG")).toBeNull();
    expect(getActivitySceIconName(undefined)).toBeNull();
  });

  it("maps programme and weekplanner domain types through the shared layer", () => {
    expect(getProgrammeSourceActivitySceIconName("TRAINING")).toBe("training");
    expect(getWeekplannerActivitySceIconName("MATCH")).toBe("match");
    expect(getWeekplannerActivitySceIconName("VERANSTALTUNG")).toBeNull();
  });

  it("uses approved-master geometry for all mapped activity icons", () => {
    for (const iconName of Object.values(ACTIVITY_SCE_ICON_BY_KIND)) {
      expect(SCE_ICON_REGISTRY[iconName].geometrySource).toBe("approved-master");
    }
  });
});

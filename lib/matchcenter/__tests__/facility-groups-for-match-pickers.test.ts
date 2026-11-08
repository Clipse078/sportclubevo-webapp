import { describe, expect, it } from "vitest";
import {
  facilityGroupsWithCodeAsId,
  resourceLabelFromCode,
} from "@/lib/matchcenter/facility-groups-for-match-pickers";

describe("facility-groups-for-match-pickers", () => {
  it("facilityGroupsWithCodeAsId uses resource code as picker id", () => {
    const groups = facilityGroupsWithCodeAsId([
      {
        facilityId: "f1",
        facilityName: "Site",
        facilityType: "SPORTS_GROUND",
        resources: [
          {
            id: "db-id",
            code: "KR2",
            name: "Kunstrasen 2",
            type: "FULL_PITCH",
            facilityId: "f1",
            facilityName: "Site",
            facilityType: "SPORTS_GROUND",
          },
        ],
      },
    ]);
    expect(groups[0]?.resources[0]?.id).toBe("KR2");
    expect(resourceLabelFromCode(groups, "KR2")).toBe("Kunstrasen 2");
  });
});

import { describe, expect, it } from "vitest";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_MASTER_SEMANTIC_MAPPING_AUDIT } from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  SCE_APPROVED_MASTER_ICON_NAMES,
  SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";

const BATCH_3_PEOPLE_NAV: Array<[string, string]> = [
  ["mitglieder", "member"],
  ["anmeldungen", "invitation"],
  ["trainer-staff", "coach"],
  ["helfereinsaetze", "volunteer"],
  ["sponsoring", "sponsor"],
  ["admin-facilities", "facility"],
  ["admin-people-access", "invitation"],
];

describe("SCE-ICONS-06 people & club operations", () => {
  it("registers all Batch 3 people operations masters in the approved library", () => {
    for (const name of SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_ICON_NAMES) {
      expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).toBe("approved-master");
    }
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(50);
  });

  it("maps high-confidence people & club operations destinations to Batch 3 masters", () => {
    for (const [navKey, iconName] of BATCH_3_PEOPLE_NAV) {
      expect(
        NAV_DESTINATION_SCE_ICON_BY_KEY[navKey as keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY],
      ).toBe(iconName);
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName as keyof typeof SCE_ICON_REGISTRY].geometrySource).toBe(
        "approved-master",
      );
    }
  });

  it("keeps generic personen on people, not player or coach", () => {
    expect(getNavDestinationSceIconName("personen")).toBe("people");
    expect(getNavDestinationSceIconName("personen")).not.toBe("player");
    expect(getNavDestinationSceIconName("personen")).not.toBe("coach");
  });

  it("does not replace roles-access with assignment globally", () => {
    expect(getNavDestinationSceIconName("admin-roles")).toBe("roles-access");
    expect(getNavDestinationSceIconName("admin-roles")).not.toBe("assignment");
  });

  it("records adopted Batch 3 rows as HIGH-confidence in the semantic audit", () => {
    for (const [destination, proposedSceMaster] of BATCH_3_PEOPLE_NAV) {
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.confidence).toBe("HIGH");
      expect(row?.adoptedNow).toBe(true);
      expect(row?.proposedSceMaster).toBe(proposedSceMaster);
    }
  });

  it("defers committee-board where semantics are not exact", () => {
    const meetings = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === "meetings");
    expect(meetings?.confidence).toBe("MEDIUM");
    expect(meetings?.adoptedNow).toBe(false);
    expect(getNavDestinationSceIconName("meetings")).toBeNull();
  });
});

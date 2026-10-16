import { describe, expect, it } from "vitest";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
  getQuickAccessSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import {
  SCE_MASTER_SEMANTIC_MAPPING_AUDIT,
  summarizeSceSemanticMappingAudit,
} from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  expectNavDestinationUsesRegistryMaster,
  forEachNavDestinationIconMapping,
} from "@/lib/nav/__tests__/nav-test-assertions";

describe("SCE-ICONS-04 semantic mapping audit", () => {
  it("records HIGH-confidence rows with full adoption after SCE-ICONS-13", () => {
    const summary = summarizeSceSemanticMappingAudit();
    expect(summary.highConfidence).toBeGreaterThan(5);
    expect(summary.deferred).toBe(0);
    expect(summary.adoptedNow).toBe(summary.highConfidence + summary.mediumConfidence + summary.lowConfidence);
  });

  it("only adopts HIGH-confidence mappings in nav destination wiring", () => {
    const adopted = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.filter((row) => row.adoptedNow);
    for (const row of adopted) {
      expect(row.confidence).toBe("HIGH");
      expect(getNavDestinationSceIconName(row.destination)).toBe(row.proposedSceMaster);
    }
  });

  it("maps adopted destinations to approved-master registry entries", () => {
    forEachNavDestinationIconMapping((_navKey, iconName) => {
      expectNavDestinationUsesRegistryMaster(iconName);
    });
  });

  it("keeps veranstaltungen on provisional icon policy", () => {
    expect(getNavDestinationSceIconName("veranstaltungen")).toBe("events");
  });

  it("resolves quick access for newly adopted tasks mapping", () => {
    expect(getQuickAccessSceIconName("navigation.aufgaben")).toBe("tasks");
    expect(getQuickAccessSceIconName("navigation.trainingcenter")).toBe("training");
  });
});

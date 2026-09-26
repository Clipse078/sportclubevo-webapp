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
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";

describe("SCE-ICONS-04 semantic mapping audit", () => {
  it("records HIGH-confidence rows and defers MEDIUM/LOW", () => {
    const summary = summarizeSceSemanticMappingAudit();
    expect(summary.highConfidence).toBeGreaterThan(5);
    expect(summary.lowConfidence + summary.mediumConfidence).toBeGreaterThan(0);
    expect(summary.adoptedNow).toBe(summary.highConfidence);
  });

  it("only adopts HIGH-confidence mappings in nav destination wiring", () => {
    const adopted = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.filter((row) => row.adoptedNow);
    for (const row of adopted) {
      expect(row.confidence).toBe("HIGH");
      expect(getNavDestinationSceIconName(row.destination)).toBe(row.proposedSceMaster);
    }
  });

  it("maps adopted destinations to approved-master registry entries", () => {
    for (const iconName of Object.values(NAV_DESTINATION_SCE_ICON_BY_KEY)) {
      expect(SCE_ICON_REGISTRY[iconName].geometrySource).toBe("approved-master");
      expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(iconName);
    }
  });

  it("keeps veranstaltungen on provisional icon policy", () => {
    expect(getNavDestinationSceIconName("veranstaltungen")).toBe("events");
  });

  it("resolves quick access for newly adopted tasks mapping", () => {
    expect(getQuickAccessSceIconName("navigation.aufgaben")).toBe("tasks");
    expect(getQuickAccessSceIconName("navigation.trainingcenter")).toBe("training");
  });
});

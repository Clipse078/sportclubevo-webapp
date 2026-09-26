import { describe, expect, it } from "vitest";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_MASTER_SEMANTIC_MAPPING_AUDIT } from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_ICON_NAMES,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";

const BATCH_5_INTEGRATION_NAV: Array<[string, string]> = [
  ["admin-integrations", "integration"],
  ["platform-integrations", "integration"],
];

describe("SCE-ICONS-08 analytics, reporting & workflow", () => {
  it("registers all Batch 5 analytics/workflow masters in the approved library", () => {
    for (const name of SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_ICON_NAMES) {
      expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).toBe("approved-master");
    }
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(78);
  });

  it("extends the registry without removing prior concepts", () => {
    expect(SCE_ICON_REGISTRY_NAMES.length).toBe(92);
    expect(SCE_ICON_REGISTRY.analytics.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.dashboard.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.match.geometrySource).toBe("approved-master");
  });

  it("maps high-confidence integration destinations to Batch 5 integration master", () => {
    for (const [navKey, iconName] of BATCH_5_INTEGRATION_NAV) {
      expect(
        NAV_DESTINATION_SCE_ICON_BY_KEY[navKey as keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY],
      ).toBe(iconName);
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName as keyof typeof SCE_ICON_REGISTRY].geometrySource).toBe(
        "approved-master",
      );
    }
  });

  it("keeps analytics, report, and insight distinct", () => {
    expect(SCE_ICON_REGISTRY.analytics.name).toBe("analytics");
    expect(SCE_ICON_REGISTRY.report.name).toBe("report");
    expect(SCE_ICON_REGISTRY.insight.name).toBe("insight");
    expect(SCE_ICON_REGISTRY.analytics.name).not.toBe(SCE_ICON_REGISTRY.report.name);
    expect(SCE_ICON_REGISTRY.insight.name).not.toBe(SCE_ICON_REGISTRY.analytics.name);
  });

  it("keeps import/export distinct from upload/download utility semantics", () => {
    expect(SCE_ICON_REGISTRY.import.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.export.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.search.geometrySource).not.toBe("approved-master");
  });

  it("keeps audit vs history distinct", () => {
    expect(SCE_ICON_REGISTRY.audit.name).toBe("audit");
    expect(SCE_ICON_REGISTRY.history.name).toBe("history");
  });

  it("records adopted Batch 5 integration rows as HIGH-confidence in the semantic audit", () => {
    for (const [destination, proposedSceMaster] of BATCH_5_INTEGRATION_NAV) {
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.confidence).toBe("HIGH");
      expect(row?.adoptedNow).toBe(true);
      expect(row?.proposedSceMaster).toBe(proposedSceMaster);
    }
  });

  it("does not map analytics/report/workflow without canonical destinations", () => {
    expect(getNavDestinationSceIconName("analytics")).toBeNull();
    expect(getNavDestinationSceIconName("report")).toBeNull();
    expect(getNavDestinationSceIconName("workflow")).toBeNull();
  });
});

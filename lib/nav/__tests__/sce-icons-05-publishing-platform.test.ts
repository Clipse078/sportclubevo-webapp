import { describe, expect, it } from "vitest";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_MASTER_SEMANTIC_MAPPING_AUDIT } from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  SCE_APPROVED_MASTER_ICON_NAMES,
  SCE_APPROVED_PLATFORM_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";

const BATCH_2_PUBLISHING_NAV: Array<[string, string]> = [
  ["planung", "planning"],
  ["website", "website"],
  ["website-news", "news"],
  ["infoboard", "infoboard"],
  ["website-publishing", "publish"],
  ["website-settings", "settings"],
  ["platform-commercial-billing-invoices", "billing-invoice"],
];

describe("SCE-ICONS-05 publishing & platform nav adoption", () => {
  it("registers all Batch 2 platform masters in the approved library", () => {
    for (const name of SCE_APPROVED_PLATFORM_MASTER_ICON_NAMES) {
      expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).toBe("approved-master");
    }
  });

  it("maps high-confidence publishing & platform destinations to Batch 2 masters", () => {
    for (const [navKey, iconName] of BATCH_2_PUBLISHING_NAV) {
      expect(NAV_DESTINATION_SCE_ICON_BY_KEY[navKey as keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY]).toBe(
        iconName,
      );
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName as keyof typeof SCE_ICON_REGISTRY].geometrySource).toBe(
        "approved-master",
      );
    }
  });

  it("records adopted Batch 2 rows as HIGH-confidence in the semantic audit", () => {
    for (const [destination, proposedSceMaster] of BATCH_2_PUBLISHING_NAV) {
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.confidence).toBe("HIGH");
      expect(row?.adoptedNow).toBe(true);
      expect(row?.proposedSceMaster).toBe(proposedSceMaster);
    }
  });

  it("does not map audit destinations without canonical nav keys", () => {
    expect(getNavDestinationSceIconName("audit-log")).toBeNull();
  });
});

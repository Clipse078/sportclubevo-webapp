import { describe, expect, it } from "vitest";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_MASTER_SEMANTIC_MAPPING_AUDIT } from "@/lib/nav/sce-master-semantic-mapping-audit";
import {
  SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_ICON_NAMES,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";

const BATCH_4_FINANCE_NAV: Array<[string, string]> = [
  ["finanzen", "finance"],
  ["platform-commercial-billing-overview", "finance"],
  ["platform-commercial-billing-customers", "commercial-account"],
  ["platform-commercial-billing-contracts", "contract"],
  ["platform-commercial-billing-invoices", "billing-invoice"],
  ["platform-commercial-billing-reconciliation", "transaction"],
];

describe("SCE-ICONS-07 finance & commercial operations", () => {
  it("registers all Batch 4 finance/commercial masters in the approved library", () => {
    for (const name of SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_ICON_NAMES) {
      expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(name);
      expect(SCE_ICON_REGISTRY[name].geometrySource).toBe("approved-master");
    }
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(66);
  });

  it("extends the registry without removing prior concepts", () => {
    expect(SCE_ICON_REGISTRY_NAMES.length).toBe(80);
    expect(SCE_ICON_REGISTRY["billing-invoice"].geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.sponsor.geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY.facility.geometrySource).toBe("approved-master");
  });

  it("maps high-confidence finance & commercial destinations to Batch 4 masters", () => {
    for (const [navKey, iconName] of BATCH_4_FINANCE_NAV) {
      expect(
        NAV_DESTINATION_SCE_ICON_BY_KEY[navKey as keyof typeof NAV_DESTINATION_SCE_ICON_BY_KEY],
      ).toBe(iconName);
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName as keyof typeof SCE_ICON_REGISTRY].geometrySource).toBe(
        "approved-master",
      );
    }
  });

  it("keeps invoice vs finance vs Swiss QR concepts distinct in the registry", () => {
    expect(SCE_ICON_REGISTRY.finance.name).toBe("finance");
    expect(SCE_ICON_REGISTRY["billing-invoice"].name).toBe("billing-invoice");
    expect(SCE_ICON_REGISTRY["qr-invoice"].name).toBe("qr-invoice");
    expect(getNavDestinationSceIconName("platform-commercial-billing-invoices")).toBe(
      "billing-invoice",
    );
    expect(getNavDestinationSceIconName("finanzen")).toBe("finance");
    expect(getNavDestinationSceIconName("finanzen")).not.toBe("billing-invoice");
  });

  it("keeps payment vs transaction and sponsor vs sponsorship-management distinct", () => {
    expect(SCE_ICON_REGISTRY.payment.name).not.toBe(SCE_ICON_REGISTRY.transaction.name);
    expect(SCE_ICON_REGISTRY.sponsor.name).not.toBe(
      SCE_ICON_REGISTRY["sponsorship-management"].name,
    );
    expect(getNavDestinationSceIconName("sponsoring")).toBe("sponsor");
  });

  it("keeps facility vs facility-booking vs booking distinct", () => {
    expect(SCE_ICON_REGISTRY.facility.name).toBe("facility");
    expect(SCE_ICON_REGISTRY["facility-booking"].name).toBe("facility-booking");
    expect(SCE_ICON_REGISTRY.booking.name).toBe("booking");
    expect(getNavDestinationSceIconName("admin-facilities")).toBe("facility");
  });

  it("records adopted Batch 4 rows as HIGH-confidence in the semantic audit", () => {
    for (const [destination, proposedSceMaster] of BATCH_4_FINANCE_NAV) {
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.confidence).toBe("HIGH");
      expect(row?.adoptedNow).toBe(true);
      expect(row?.proposedSceMaster).toBe(proposedSceMaster);
    }
  });

  it("does not map business-club without a canonical destination", () => {
    expect(getNavDestinationSceIconName("business-club")).toBeNull();
  });
});

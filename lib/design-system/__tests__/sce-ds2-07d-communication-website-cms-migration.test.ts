/**
 * SCE-DS2-07D — communication and website CMS migration.
 * Every route assigned by the DS2-07B registry must adopt canonical workspace
 * architecture. Visual verification stays on DS2-07G until evidence exists.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_07B_ROUTE_REGISTRY,
  SCE_DS2_07B_SUMMARY,
} from "@/lib/design-system/sce-ds2-07b-route-registry";

const ROOT = process.cwd();

/** Exact DS2-07D assignments from the STAGE registry before this package. */
export const SCE_DS2_07D_ASSIGNED_SOURCES = [
  "app/(admin)/dashboard/communication/page.tsx",
  "app/(admin)/dashboard/communication/email-sender/page.tsx",
  "app/(admin)/dashboard/communication/inbox/page.tsx",
  "app/(admin)/dashboard/communication/inbox/new/page.tsx",
  "app/(admin)/dashboard/communication/inbox/settings/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/new/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/new/page.tsx",
  "app/(admin)/dashboard/communication/personal-signature/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/new/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/[id]/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/new/page.tsx",
  "app/(admin)/dashboard/notifications/page.tsx",
  "app/(admin)/dashboard/website/page.tsx",
  "app/(admin)/dashboard/website/blocks/page.tsx",
  "app/(admin)/dashboard/website/components/page.tsx",
  "app/(admin)/dashboard/website/components/[id]/edit/page.tsx",
  "app/(admin)/dashboard/website/components/new/page.tsx",
  "app/(admin)/dashboard/website/design-system/page.tsx",
  "app/(admin)/dashboard/website/editorial/page.tsx",
  "app/(admin)/dashboard/website/homepage/page.tsx",
  "app/(admin)/dashboard/website/media/page.tsx",
  "app/(admin)/dashboard/website/navigation/page.tsx",
  "app/(admin)/dashboard/website/news/[id]/edit/page.tsx",
  "app/(admin)/dashboard/website/news/new/page.tsx",
  "app/(admin)/dashboard/website/pages/page.tsx",
  "app/(admin)/dashboard/website/pages/[id]/builder/page.tsx",
  "app/(admin)/dashboard/website/pages/[id]/edit/page.tsx",
  "app/(admin)/dashboard/website/pages/new/page.tsx",
  "app/(admin)/dashboard/website/publishing/page.tsx",
  "app/(admin)/dashboard/website/review/page.tsx",
  "app/(admin)/dashboard/website/settings/page.tsx",
] as const;

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
];

describe("SCE-DS2-07D communication and website CMS migration", () => {
  it("accounts for every assigned route and moves it to canonical DS2-07G", () => {
    expect(SCE_DS2_07D_ASSIGNED_SOURCES).toHaveLength(38);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07D"]).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.CANONICAL).toBe(143);
    expect(SCE_DS2_07B_SUMMARY.architecture.PARTIAL).toBe(12);
    expect(SCE_DS2_07B_SUMMARY.architecture.LEGACY).toBe(59);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07E"]).toBe(27);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07F"]).toBe(44);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(143);

    for (const sourceFile of SCE_DS2_07D_ASSIGNED_SOURCES) {
      const entry = SCE_DS2_07B_ROUTE_REGISTRY.find((item) => item.sourceFile === sourceFile);
      expect(entry, sourceFile).toBeDefined();
      expect(entry?.architecture, sourceFile).toBe("CANONICAL");
      expect(entry?.migrationStatus, sourceFile).toBe("IMPLEMENTED");
      expect(entry?.migrationPackage, sourceFile).toBe("DS2-07G");
      expect(entry?.visualVerificationStatus, sourceFile).toBe("PENDING");
      const source = readFileSync(join(ROOT, sourceFile), "utf8");
      expect(CANONICAL_MARKERS.some((marker) => source.includes(marker)), sourceFile).toBe(true);
    }
  });
});

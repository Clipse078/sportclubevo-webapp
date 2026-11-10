/**
 * SCE-DS2-07C — admin and configuration migration.
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

/** Exact DS2-07C assignments from the STAGE registry before this package. */
export const SCE_DS2_07C_ASSIGNED_SOURCES = [
  "app/(admin)/admin/page.tsx",
  "app/(admin)/dashboard/account/page.tsx",
  "app/(admin)/dashboard/admin/page.tsx",
  "app/(admin)/dashboard/admin/branding/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/contracts/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/contracts/[contractKey]/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/contracts/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/customers/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/customers/[customerKey]/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/customers/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/invoices/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/invoices/[invoiceKey]/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/invoices/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/operations/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/reconciliation/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/settings/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/new/page.tsx",
  "app/(admin)/dashboard/admin/integrations/sfv/page.tsx",
  "app/(admin)/dashboard/admin/tenants/page.tsx",
  "app/(admin)/dashboard/admin/tenants/[tenantSlug]/page.tsx",
  "app/(admin)/dashboard/admin/tenants/new/page.tsx",
  "app/(admin)/dashboard/admin/users/[userId]/page.tsx",
  "app/(admin)/dashboard/org-units/[id]/edit/page.tsx",
  "app/(admin)/dashboard/org-units/[id]/history/page.tsx",
  "app/(admin)/dashboard/org-units/new/page.tsx",
  "app/(admin)/dashboard/permissions/page.tsx",
  "app/(admin)/dashboard/platform/page.tsx",
  "app/(admin)/dashboard/roles/page.tsx",
  "app/(admin)/dashboard/roles/[id]/page.tsx",
  "app/(admin)/dashboard/runtime/page.tsx",
  "app/(admin)/dashboard/seasons/page.tsx",
  "app/(admin)/dashboard/users/page.tsx",
  "app/(admin)/dashboard/users/[userId]/page.tsx",
  "app/(admin)/dashboard/users/new/page.tsx",
  "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/page.tsx",
  "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/[registrationId]/page.tsx",
  "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/archiv/page.tsx",
  "app/(admin)/tenant/[tenantSlug]/cockpit/registrations/warteliste/page.tsx",
] as const;

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
];

describe("SCE-DS2-07C admin and configuration migration", () => {
  it("accounts for every assigned route and moves it to canonical DS2-07G", () => {
    expect(SCE_DS2_07C_ASSIGNED_SOURCES).toHaveLength(41);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07C"]).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.CANONICAL).toBe(105);
    expect(SCE_DS2_07B_SUMMARY.architecture.PARTIAL).toBe(42);
    expect(SCE_DS2_07B_SUMMARY.architecture.LEGACY).toBe(67);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07D"]).toBe(38);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07E"]).toBe(27);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07F"]).toBe(44);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(105);

    for (const sourceFile of SCE_DS2_07C_ASSIGNED_SOURCES) {
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

  it("does not promote redirect aliases by wrapping them in workspace chrome", () => {
    for (const route of ["/dashboard/admin/users", "/dashboard/admin/users/new"]) {
      const entry = SCE_DS2_07B_ROUTE_REGISTRY.find((item) => item.urlPattern === route);
      expect(entry?.routeKind).toBe("REDIRECT_ALIAS");
      expect(entry?.architecture).toBe("NOT_APPLICABLE");
      expect(entry?.migrationStatus).toBe("EXCEPTION");
    }
  });
});

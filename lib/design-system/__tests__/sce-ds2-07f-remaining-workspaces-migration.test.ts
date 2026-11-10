/**
 * SCE-DS2-07F — Vereinsleitung and remaining workspaces migration.
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

/** Exact DS2-07F assignments from the STAGE registry before this package. */
export const SCE_DS2_07F_ASSIGNED_SOURCES = [
  "app/(admin)/dashboard/admin/people-access/new/page.tsx",
  "app/(admin)/dashboard/admin/people-access/page.tsx",
  "app/(admin)/dashboard/aufgaben/@task/(.)[taskId]/page.tsx",
  "app/(admin)/dashboard/aufgaben/[taskId]/page.tsx",
  "app/(admin)/dashboard/aufgaben/anforderung/[recipientId]/page.tsx",
  "app/(admin)/dashboard/aufgaben/anforderungen/[requirementId]/page.tsx",
  "app/(admin)/dashboard/aufgaben/anforderungen/neu/page.tsx",
  "app/(admin)/dashboard/aufgaben/neu/page.tsx",
  "app/(admin)/dashboard/aufgaben/page.tsx",
  "app/(admin)/dashboard/aufgaben/serien/[seriesId]/page.tsx",
  "app/(admin)/dashboard/aufgaben/serien/neu/page.tsx",
  "app/(admin)/dashboard/dev/sce-icons/page.tsx",
  "app/(admin)/dashboard/formulare-freigaben/page.tsx",
  "app/(admin)/dashboard/helfereinsaetze/page.tsx",
  "app/(admin)/dashboard/infoboard/[id]/page.tsx",
  "app/(admin)/dashboard/infoboard/page.tsx",
  "app/(admin)/dashboard/infoboard/preview/page.tsx",
  "app/(admin)/dashboard/mitglieder/page.tsx",
  "app/(admin)/dashboard/persons/settings/development-criteria/page.tsx",
  "app/(admin)/dashboard/players/page.tsx",
  "app/(admin)/dashboard/programm/page.tsx",
  "app/(admin)/dashboard/sponsoring/page.tsx",
  "app/(admin)/dashboard/trainer-staff/page.tsx",
  "app/(admin)/dashboard/trainers/page.tsx",
  "app/(admin)/dashboard/vereine/[clubId]/merge/page.tsx",
  "app/(admin)/dashboard/vereine/[clubId]/page.tsx",
  "app/(admin)/dashboard/vorfaelle-disziplin/page.tsx",
  "app/(admin)/vereinsleitung/club-entwicklung/page.tsx",
  "app/(admin)/vereinsleitung/finanzen/rechnungen/page.tsx",
  "app/(admin)/vereinsleitung/initiativen/[slug]/edit/page.tsx",
  "app/(admin)/vereinsleitung/initiativen/new/page.tsx",
  "app/(admin)/vereinsleitung/kpis/page.tsx",
  "app/(admin)/vereinsleitung/material/page.tsx",
  "app/(admin)/vereinsleitung/meetings/[slug]/edit/page.tsx",
  "app/(admin)/vereinsleitung/meetings/new/page.tsx",
  "app/(admin)/vereinsleitung/page.tsx",
  "app/(admin)/vereinsleitung/prozesse/page.tsx",
  "app/(admin)/vereinsleitung/targets/[id]/edit/page.tsx",
  "app/(admin)/vereinsleitung/targets/[id]/page.tsx",
  "app/(admin)/vereinsleitung/targets/new/page.tsx",
  "app/(admin)/vereinsleitung/templates/[id]/edit/page.tsx",
  "app/(admin)/vereinsleitung/templates/[id]/page.tsx",
  "app/(admin)/vereinsleitung/templates/new/page.tsx",
  "app/(admin)/vereinsleitung/templates/page.tsx",
] as const;

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "PlanningActivitiesPageFrame",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
];

describe("SCE-DS2-07F remaining workspaces migration", () => {
  it("accounts for every assigned route and moves it to canonical DS2-07G", () => {
    expect(SCE_DS2_07F_ASSIGNED_SOURCES).toHaveLength(44);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07F"]).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.CANONICAL).toBe(214);
    expect(SCE_DS2_07B_SUMMARY.architecture.PARTIAL).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.LEGACY).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(214);

    for (const sourceFile of SCE_DS2_07F_ASSIGNED_SOURCES) {
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

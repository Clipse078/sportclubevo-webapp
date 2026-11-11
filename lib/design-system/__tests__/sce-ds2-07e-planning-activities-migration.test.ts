/**
 * SCE-DS2-07E — planning activities migration.
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

/** Exact DS2-07E assignments from the STAGE registry before this package. */
export const SCE_DS2_07E_ASSIGNED_SOURCES = [
  "app/(admin)/dashboard/activity/event/[eventId]/page.tsx",
  "app/(admin)/dashboard/activity/training-session/[sessionId]/page.tsx",
  "app/(admin)/dashboard/events/page.tsx",
  "app/(admin)/dashboard/events/import/page.tsx",
  "app/(admin)/dashboard/events/matches/new/page.tsx",
  "app/(admin)/dashboard/events/other/new/page.tsx",
  "app/(admin)/dashboard/events/tournaments/new/page.tsx",
  "app/(admin)/dashboard/events/trainings/new/page.tsx",
  "app/(admin)/dashboard/kalender/page.tsx",
  "app/(admin)/dashboard/matchcenter/page.tsx",
  "app/(admin)/dashboard/matchcenter/[matchId]/page.tsx",
  "app/(admin)/dashboard/matchcenter/new/page.tsx",
  "app/(admin)/dashboard/planner/edit/[eventId]/page.tsx",
  "app/(admin)/dashboard/planner/week/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/new/page.tsx",
  "app/(admin)/dashboard/training/page.tsx",
  "app/(admin)/dashboard/training/new/page.tsx",
  "app/(admin)/dashboard/training/series/[seriesId]/allocations/page.tsx",
  "app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx",
  "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/new/page.tsx",
  "app/(admin)/dashboard/wochenplan/page.tsx",
] as const;

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "PlanningActivitiesPageFrame",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
];

describe("SCE-DS2-07E planning activities migration", () => {
  it("accounts for every assigned route and moves it to canonical DS2-07G", () => {
    expect(SCE_DS2_07E_ASSIGNED_SOURCES).toHaveLength(27);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07E"]).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.CANONICAL).toBe(215);
    expect(SCE_DS2_07B_SUMMARY.architecture.PARTIAL).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.architecture.LEGACY).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07F"]).toBe(0);
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(215);

    for (const sourceFile of SCE_DS2_07E_ASSIGNED_SOURCES) {
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

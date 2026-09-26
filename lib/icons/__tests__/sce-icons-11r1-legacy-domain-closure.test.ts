/**
 * SCE-ICONS-11R1 — eliminate legacy domain icon debt when approved masters exist.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { MISSING_SCE_SEMANTICS } from "@/lib/icons/missing-sce-semantics";
import { runWebappIconCoverageAudit } from "@/lib/icons/webapp-icon-coverage-audit";

describe("SCE-ICONS-11R1 legacy domain closure", () => {
  it(
    "eliminates legacy Lucide render evidence for approved masters",
    () => {
      const report = runWebappIconCoverageAudit();
      expect(report.legacyDomainReport.legacyWithAvailableMaster).toBe(0);
      expect(report.masterAdoption.legacyLucideDespiteApprovedMaster).toEqual([]);
      expect(report.masterAdoption.unresolvedDomainWithExistingMaster).toEqual([]);
      expect(report.classificationTotals.UNKNOWN_REQUIRES_REVIEW).toBe(0);
    },
    60_000,
  );

  it("clears LEGACY_MIX routes and missing-master backlog after SCE-ICONS-13", () => {
    const report = runWebappIconCoverageAudit();
    const legacyMix = report.routeMatrix.filter((r) => r.consistency === "LEGACY_MIX");
    expect(legacyMix).toEqual([]);
    expect(report.missingMasterBacklog).toEqual([]);
    expect(MISSING_SCE_SEMANTICS).toEqual([]);
  });

  it("migrates veranstaltungen KPI past to canonical history master", () => {
    const { veranstaltungenDeepDive } = runWebappIconCoverageAudit();
    expect(veranstaltungenDeepDive.KPI_PAST.symbols).toContain("HistorySceIcon");
    expect(veranstaltungenDeepDive.KPI_PAST.classification).toContain("SCE_DOMAIN_APPROVED");
    expect(veranstaltungenDeepDive.KPI_TOTAL.classification).toContain("SCE_DOMAIN_APPROVED");
    expect(veranstaltungenDeepDive.KPI_TOTAL.symbols).toContain("CompetitionSceIcon");
  });

  it("keeps approved artwork frozen (90 masters including final semantic batch)", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    expect(readdirSync(join(process.cwd(), "public/images/icons")).filter((f) => f.endsWith(".svg")).length).toBe(
      90,
    );
    const fp = readFileSync(
      join(process.cwd(), "components/design-system/icons/masters/approved-hero-fingerprint.ts"),
      "utf8",
    );
    expect(fp).toContain("SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS");
  });
});

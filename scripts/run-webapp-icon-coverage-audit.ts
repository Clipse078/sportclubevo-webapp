#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runWebappIconCoverageAudit } from "@/lib/icons/webapp-icon-coverage-audit";

const report = runWebappIconCoverageAudit();
const outPath = join(process.cwd(), "lib/icons/webapp-icon-coverage-audit.report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  routeModules: report.routeInventory.modulesAudited,
  classificationTotals: report.classificationTotals,
  ambiguity: report.ambiguity,
  missingMasterConcepts: report.missingMasterBacklog.length,
  legacyWithMaster: report.legacyDomainReport.legacyWithAvailableMaster,
  unresolvedWithExistingMaster: report.masterAdoption.unresolvedDomainWithExistingMaster.length,
  reportPath: outPath,
}, null, 2));

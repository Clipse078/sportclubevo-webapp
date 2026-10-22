#!/usr/bin/env tsx
/**
 * FIN-01A — Inspect FC Allschwil reference workbook (read-only).
 *
 * Usage:
 *   npx tsx scripts/finance/sce-finance-01a-analyze-fca-workbook.ts
 *   npx tsx scripts/finance/sce-finance-01a-analyze-fca-workbook.ts --out docs/finance/FCA-WORKBOOK-ANALYSIS.generated.json
 */

import fs from "node:fs";
import path from "node:path";
import {
  analyzeFcaWorkbook,
  DEFAULT_FCA_REFERENCE_WORKBOOK_PATH,
  resolveFcaWorkbookPath,
} from "../../lib/finance/fca-workbook-analyzer";

function parseArgs(argv: string[]): { workbookPath?: string; outPath?: string } {
  let workbookPath: string | undefined;
  let outPath: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workbook" && argv[i + 1]) {
      workbookPath = argv[++i];
    } else if (arg === "--out" && argv[i + 1]) {
      outPath = argv[++i];
    }
  }
  return { workbookPath, outPath };
}

function main(): void {
  const { workbookPath, outPath } = parseArgs(process.argv);
  const resolved = resolveFcaWorkbookPath(workbookPath);

  if (!fs.existsSync(resolved)) {
    console.error(`FCA_WORKBOOK_NOT_FOUND: expected file at ${resolved}`);
    console.error(`Place ${path.basename(DEFAULT_FCA_REFERENCE_WORKBOOK_PATH)} under docs/finance/reference/ and re-run.`);
    process.exit(2);
  }

  const analysis = analyzeFcaWorkbook(resolved);
  const json = JSON.stringify(analysis, null, 2);

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, "utf8");
    console.log(`Wrote ${outPath}`);
  } else {
    console.log(json);
  }
}

main();

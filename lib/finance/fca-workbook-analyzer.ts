/**
 * Programmatic inspection of the FC Allschwil reference budget workbook (FIN-01A).
 *
 * Read-only: does not modify the source file.
 */

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export const FCA_REFERENCE_WORKBOOK_FILENAME = "FC_Allschwil_Budget_26-27_Draft_v2.xlsx";

export const DEFAULT_FCA_REFERENCE_WORKBOOK_PATH = path.join(
  process.cwd(),
  "docs/finance/reference",
  FCA_REFERENCE_WORKBOOK_FILENAME,
);

export interface FcaSheetSummary {
  name: string;
  rowCount: number;
  colCount: number;
  formulaCellCount: number;
  mergedRegionCount: number;
  sampleHeaders: string[];
}

export interface FcaWorkbookAnalysis {
  workbookPath: string;
  sheetNames: string[];
  sheets: FcaSheetSummary[];
  implicitDimensions: string[];
  excelLimitations: string[];
  analyzedAtIso: string;
}

function cellToHeaderText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function collectHeaderSamples(rows: unknown[][], maxRows = 8, maxCols = 12): string[] {
  const headers: string[] = [];
  for (let r = 0; r < Math.min(rows.length, maxRows); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < Math.min(row.length, maxCols); c++) {
      const text = cellToHeaderText(row[c]);
      if (text.length > 0 && text.length < 80) {
        headers.push(text);
      }
    }
  }
  return [...new Set(headers)].slice(0, 40);
}

function countFormulas(sheet: XLSX.WorkSheet): number {
  let count = 0;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith("!")) continue;
    const cell = sheet[key] as XLSX.CellObject | undefined;
    if (cell?.f) count++;
  }
  return count;
}

export function analyzeFcaWorkbook(workbookPath: string): FcaWorkbookAnalysis {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`FCA_WORKBOOK_NOT_FOUND: ${workbookPath}`);
  }

  const workbook = XLSX.readFile(workbookPath, { cellFormula: true, cellDates: true });
  const sheets: FcaSheetSummary[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"];
    const range = ref ? XLSX.utils.decode_range(ref) : { e: { r: 0, c: 0 } };
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][];
    return {
      name,
      rowCount: range.e.r + 1,
      colCount: range.e.c + 1,
      formulaCellCount: countFormulas(sheet),
      mergedRegionCount: (sheet["!merges"] ?? []).length,
      sampleHeaders: collectHeaderSamples(rows),
    };
  });

  const implicitDimensions = inferImplicitDimensions(sheets);
  const excelLimitations = [
    "No tenant-safe multi-user audit trail on cell edits",
    "Weak referential integrity between team columns and SCE Team ids",
    "Formula breakage when rows inserted in category blocks",
    "Duplicate category labels across sheets without stable keys",
    "Season vs calendar year boundaries implicit in sheet naming",
    "Personnel rows may contain PII without permission model",
  ];

  return {
    workbookPath,
    sheetNames: workbook.SheetNames,
    sheets,
    implicitDimensions,
    excelLimitations,
    analyzedAtIso: new Date().toISOString(),
  };
}

function inferImplicitDimensions(sheets: FcaSheetSummary[]): string[] {
  const joined = sheets.flatMap((s) => s.sampleHeaders).join(" ").toLowerCase();
  const dims: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/mannschaft|team|junioren|kinder|frauen|senior/, "TEAM / AGE GROUP"],
    [/personal|trainer|honorar|lohn/, "PERSON / PERSONNEL"],
    [/event|turnier|anlass/, "EVENT / TOURNAMENT"],
    [/material|ball|trikot|ausrüst/, "MATERIAL PLANNING"],
    [/sponsor|partner/, "SPONSOR / FUNDING"],
    [/kostenstelle|bereich|abteilung/, "COST CENTER / ORG UNIT"],
    [/ist|budget|plan|forecast|abweich/, "MEASURE: ACTUAL / BUDGET / FORECAST / VARIANCE"],
    [/saison|jahr|26.?27|2026/, "SEASON / FINANCE YEAR"],
  ];
  for (const [pattern, label] of rules) {
    if (pattern.test(joined)) dims.push(label);
  }
  return [...new Set(dims)];
}

export function resolveFcaWorkbookPath(explicitPath?: string): string {
  return explicitPath?.trim() || DEFAULT_FCA_REFERENCE_WORKBOOK_PATH;
}

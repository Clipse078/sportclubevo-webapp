import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  analyzeFcaWorkbook,
  DEFAULT_FCA_REFERENCE_WORKBOOK_PATH,
  FCA_REFERENCE_WORKBOOK_FILENAME,
} from "../fca-workbook-analyzer";

describe("FCA workbook analyzer", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("throws when reference workbook is missing", () => {
    expect(() => analyzeFcaWorkbook("/nonexistent/workbook.xlsx")).toThrow(/FCA_WORKBOOK_NOT_FOUND/);
  });

  it("parses sheet metadata and formula counts from a workbook file", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fca-wb-"));
    const filePath = path.join(tempDir, FCA_REFERENCE_WORKBOOK_FILENAME);
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Ertrag", "Budget", "Ist"],
      ["Mitgliederbeiträge", 1000, 900],
      ["Total", { f: "SUM(B2:B2)" }],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Erfolgsrechnung");
    XLSX.writeFile(wb, filePath);

    const analysis = analyzeFcaWorkbook(filePath);
    expect(analysis.sheetNames).toContain("Erfolgsrechnung");
    expect(analysis.sheets[0]?.rowCount).toBeGreaterThanOrEqual(2);
    expect(analysis.implicitDimensions.length).toBeGreaterThan(0);
  });

  it("documents canonical reference path for PO-supplied FCA workbook", () => {
    expect(DEFAULT_FCA_REFERENCE_WORKBOOK_PATH).toContain(FCA_REFERENCE_WORKBOOK_FILENAME);
  });
});

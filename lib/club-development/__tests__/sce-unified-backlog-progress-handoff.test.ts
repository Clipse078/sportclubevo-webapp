import { describe, expect, it } from "vitest";
import {
  buildPr1020JuniorenUngeplantPreviewUrl,
  PR_1020_PO_UAT_CHECKLIST,
} from "../sce-unified-backlog-progress-handoff";
import { STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID } from "../sce-cd-connected-workspace-po-uat-handoff";

describe("PR #1020 PO handoff", () => {
  it("builds Junioren Ungeplant deep link bound to preview commit", () => {
    const sha = "abcdef1234567890abcdef1234567890abcdef12";
    const url = buildPr1020JuniorenUngeplantPreviewUrl("https://preview.example.com", sha);
    expect(url).toContain("umsetzungsabschnitt=ungeplant");
    expect(url).toContain(encodeURIComponent(STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID));
    expect(url).toContain("dpl=abcdef12345");
  });

  it("documents PO UAT ordering for drag and menu", () => {
    expect(PR_1020_PO_UAT_CHECKLIST.length).toBeGreaterThanOrEqual(6);
    expect(PR_1020_PO_UAT_CHECKLIST.some((line) => line.includes("⋯"))).toBe(true);
  });
});
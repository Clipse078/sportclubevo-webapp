/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R22R2 — operational heading typography consistency (PLATZ parity).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  VENUE_SEMANTIC_LABEL_FONT_SIZE_BASE,
  VENUE_SEMANTIC_LABEL_FONT_VAR,
  VENUE_SEMANTIC_LABEL_TYPOGRAPHY,
} from "@/lib/infoboard/venue-semantic-label";
import { resolveVenueDensityEventListCssVars } from "@/lib/infoboard/venue-presentation-density";

const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

function sharedSemanticLabelBlock(): string {
  const marker = ".venueSemanticLabel,\n.eventTypeLabel {";
  const start = SCREEN1_CSS.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  return SCREEN1_CSS.slice(start, SCREEN1_CSS.indexOf("}", start));
}

describe("R22R2 operational heading typography", () => {
  it("binds all five semantic badges to the canonical label font token (not pitch cqi scaling)", () => {
    const block = sharedSemanticLabelBlock();
    expect(block).toMatch(
      new RegExp(`font-size:\\s*var\\(${VENUE_SEMANTIC_LABEL_FONT_VAR}\\)`),
    );
    expect(block).not.toMatch(/--ib-fs-activity-type/);
    expect(VENUE_SEMANTIC_LABEL_FONT_SIZE_BASE).not.toMatch(/cqw|cqi/);
  });

  it("declares vw-based semantic label sizing on DARK root and physical-infoboard container", () => {
    expect(SCREEN1_CSS).toMatch(
      /--ib-semantic-label-font-size:\s*clamp\(0\.82rem,\s*1\.08vw,\s*1\.32rem\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /@container physical-infoboard[\s\S]*--ib-semantic-label-font-size:\s*clamp\(0\.72rem,\s*0\.95vw,\s*1\.12rem\)/,
    );
  });

  it("keeps PLATZ badge geometry unconstrained inside ib-platz-slot headers", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.cardPitchZone \.venueColumnHeader \.venueSemanticLabel[\s\S]*overflow:\s*visible/,
    );
  });

  it("preserves semantic green PLATZ badge colors in LIGHT and DARK operational polish", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.venueSemanticLabel\[data-semantic-label="PLATZ"\][\s\S]*color:\s*#174D38/,
    );
    expect(SCREEN1_CSS).toMatch(
      /venueSemanticLabel\[data-semantic-label="PLATZ"\][\s\S]*color:\s*#9FD4B8/,
    );
  });

  it("scales semantic label typography via viewport-based event-list vars", () => {
    const vars = resolveVenueDensityEventListCssVars("standard");
    expect(vars["--ib-semantic-label-font-size"]).toBe(vars["--ib-fs-activity-type"]);
    expect(vars["--ib-semantic-label-font-size"]).toContain("vw");
    expect(vars["--ib-semantic-label-font-size"]).not.toContain("cqw");
  });

  it("documents the shared heading typography contract", () => {
    expect(VENUE_SEMANTIC_LABEL_TYPOGRAPHY.fontWeight).toBe(700);
    expect(VENUE_SEMANTIC_LABEL_TYPOGRAPHY.letterSpacing).toBe("0.14em");
    expect(VENUE_SEMANTIC_LABEL_TYPOGRAPHY.textTransform).toBe("uppercase");
    expect(VENUE_SEMANTIC_LABEL_TYPOGRAPHY.lineHeight).toBe(1);
    expect(VENUE_SEMANTIC_LABEL_TYPOGRAPHY.fontSize).toBe(
      `var(${VENUE_SEMANTIC_LABEL_FONT_VAR})`,
    );
  });
});

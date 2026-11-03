/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R22R1 — DARK unified card visual polish (automated contract).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_DARK,
  VENUE_OPERATIONAL_CARD_OUTLINE_DARK,
  VENUE_OPERATIONAL_MATCH_ROLE_DARK,
  VENUE_OPERATIONAL_TEXT_DIM_DARK,
  VENUE_OPERATIONAL_TEXT_MUTED_DARK,
  VENUE_OPERATIONAL_UNIFIED_DIVIDER_DARK,
} from "@/lib/infoboard/screen1-ambient-depth";

const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

describe("R22R1 DARK unified card visual polish", () => {
  it("exports DARK-only operational polish tokens", () => {
    expect(VENUE_OPERATIONAL_UNIFIED_DIVIDER_DARK).toBe("rgba(99, 135, 175, 0.06)");
    expect(VENUE_OPERATIONAL_CARD_OUTLINE_DARK).toBe("rgba(99, 135, 175, 0.24)");
    expect(VENUE_OPERATIONAL_TEXT_MUTED_DARK).toBe("#92A8BE");
    expect(VENUE_OPERATIONAL_TEXT_DIM_DARK).toBe("#7A93AB");
    expect(VENUE_OPERATIONAL_MATCH_ROLE_DARK).toBe("#9DB4CA");
  });

  it("keeps R22 background raster opacity unchanged", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_DARK).toBe(0.65);
  });

  it("softens internal operational dividers without touching LIGHT theme rules", () => {
    expect(SCREEN1_CSS).toMatch(
      /--ib-zone-separator-operational-unified:\s*rgba\(99,\s*135,\s*175,\s*0\.06\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\[data-venue-column="kabine"\]\.cardDressingRoomZone[\s\S]*border-left-color:\s*transparent/,
    );
    const lightThemeBlock = SCREEN1_CSS.split(".root[data-theme=\"light\"]")[1]?.split(
      ".root:not([data-theme=\"light\"])",
    )[0];
    expect(lightThemeBlock ?? "").not.toContain("--ib-zone-separator-operational-unified");
  });

  it("defines one row-level outline on DARK operational cards", () => {
    expect(SCREEN1_CSS).toMatch(
      /:not\(\[data-theme="light"\]\)\s*\.eventCard\[data-venue-operational-ambient="true"\][\s\S]*border-color:\s*var\(--ib-card-outline-operational\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-surface="unified-dark"\][\s\S]*border:\s*none/,
    );
  });

  it("raises secondary label contrast on unified DARK cards only", () => {
    expect(SCREEN1_CSS).toMatch(
      /:not\(\[data-theme="light"\]\)\s*\.eventCard\[data-venue-operational-ambient="true"\][\s\S]*--ib-text-muted:\s*var\(--ib-text-muted-operational\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /venueSemanticLabel\[data-semantic-label="KABINE"\][\s\S]*color:\s*#A8C4E8/,
    );
    expect(SCREEN1_CSS).toMatch(
      /venueSemanticLabel\[data-semantic-label="PLATZ"\][\s\S]*color:\s*#9FD4B8/,
    );
  });

  it("applies training matrix divider treatment under operational ambient", () => {
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\.trainingMatrixCell:nth-child\(2\)[\s\S]*border-left-color:\s*transparent/,
    );
  });
});

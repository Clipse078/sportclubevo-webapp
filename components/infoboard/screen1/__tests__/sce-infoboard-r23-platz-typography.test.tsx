/**
 * SCE-INFOBOARD-R23 — Screen 1 Platz value typography scale.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MATCH_PLATZ_FONT_SIZE_CSS,
  TRAINING_PLATZ_FONT_SIZE_CSS,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  VENUE_PLATZ_VALUE_TYPOGRAPHY_SCALE,
  scalePlatzValueTypographyClamp,
} from "@/lib/infoboard/venue-platz-value-typography";
import { resolveVenueDensityEventListCssVars } from "@/lib/infoboard/venue-presentation-density";

const SCREEN1_CSS = readFileSync(
  join(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

describe("SCE-INFOBOARD-R23 Platz typography", () => {
  it("applies the approved ~20% Platz value scale constant", () => {
    expect(VENUE_PLATZ_VALUE_TYPOGRAPHY_SCALE).toBe(1.2);
  });

  it("scales PLATZ preset clamps without touching Kabine presets", () => {
    expect(TRAINING_PLATZ_FONT_SIZE_CSS.XLARGE).toBe(
      scalePlatzValueTypographyClamp("clamp(1.75rem, 2.4vw, 3.35rem)"),
    );
    expect(MATCH_PLATZ_FONT_SIZE_CSS.MEDIUM).toContain("1.62rem");
  });

  it("scales event-list dest-pitch density token without scaling Kabine dest-room", () => {
    const vars = resolveVenueDensityEventListCssVars("standard");
    expect(vars["--ib-fs-dest-pitch"]).toContain("2.394rem");
    expect(vars["--ib-fs-dest-room"]).toContain("1.415rem");
    expect(vars["--ib-fs-dest-room"]).not.toContain("2.064rem");
  });

  it("keeps green Platz badge geometry and nowrap overflow protection", () => {
    expect(SCREEN1_CSS).toMatch(/\.destPitchValue,\s*\n\.trainingGroupPitchValue[\s\S]*white-space: nowrap/);
    expect(SCREEN1_CSS).toMatch(/\.cardPitchZone \.destPitchValue[\s\S]*13\.8cqi/);
    expect(SCREEN1_CSS).toMatch(/\.destPitchValue,\s*\n\.trainingGroupPitchValue[\s\S]*background: rgba\(26,\s*122,\s*74/);
  });
});

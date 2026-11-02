import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AMBIENT_BASE_ATMOSPHERE_CSS_VAR,
  AMBIENT_IMAGE_OPACITY_CSS_VAR,
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT,
} from "@/lib/infoboard/screen1-ambient-depth";

const AMBIENT_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/venue-display/VenueAmbientLayer.module.css"),
  "utf8",
);

describe("R15 ambient depth tokens", () => {
  it("exports activity-specific light-theme raster opacity contract", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.MATCH).toBe(0.42);
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.TOURNAMENT).toBe(0.38);
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.TRAINING).toBe(0.34);
  });

  it("wires CSS variables for raster opacity and base atmosphere", () => {
    expect(AMBIENT_IMAGE_OPACITY_CSS_VAR).toBe("--ambient-image-opacity");
    expect(AMBIENT_BASE_ATMOSPHERE_CSS_VAR).toBe("--ambient-base-atmosphere");
    expect(AMBIENT_CSS).toMatch(
      new RegExp(`\\[data-theme="light"\\] \\.activityMatch[\\s\\S]*${AMBIENT_IMAGE_OPACITY_CSS_VAR}:\\s*0\\.42`),
    );
    expect(AMBIENT_CSS).toMatch(
      new RegExp(`\\[data-theme="light"\\] \\.activityTournament[\\s\\S]*${AMBIENT_IMAGE_OPACITY_CSS_VAR}:\\s*0\\.38`),
    );
    expect(AMBIENT_CSS).toMatch(
      new RegExp(`\\[data-theme="light"\\] \\.activityTraining[\\s\\S]*${AMBIENT_IMAGE_OPACITY_CSS_VAR}:\\s*0\\.34`),
    );
    expect(AMBIENT_CSS).toMatch(
      new RegExp(`\\.baseActivityAtmosphere[\\s\\S]*${AMBIENT_BASE_ATMOSPHERE_CSS_VAR}`),
    );
  });
});

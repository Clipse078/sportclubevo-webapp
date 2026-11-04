import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS,
  resolveScreen2DirectionLandmarkSrc,
} from "@/lib/infoboard/screen2-direction-landmarks";

describe("Screen 2 direction landmark assets (R23R5)", () => {
  it("maps FC Allschwil left/right groups to approved PNG paths", () => {
    expect(
      resolveScreen2DirectionLandmarkSrc("fc-allschwil", "allschwil-zentrum"),
    ).toBe(INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.allschwilDorf);
    expect(
      resolveScreen2DirectionLandmarkSrc("fc-allschwil", "bachgraben-basel"),
    ).toBe(INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.basel);
  });

  it("returns null for unknown tenants and unmapped direction groups", () => {
    expect(resolveScreen2DirectionLandmarkSrc("other-club", "allschwil-zentrum")).toBeNull();
    expect(resolveScreen2DirectionLandmarkSrc("fc-allschwil", "unknown-group")).toBeNull();
    expect(resolveScreen2DirectionLandmarkSrc(null, "allschwil-zentrum")).toBeNull();
  });

  it("stores landmark rasters under public/Infoboard (capital I)", () => {
    for (const publicPath of Object.values(INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS)) {
      const diskPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
      expect(existsSync(diskPath), publicPath).toBe(true);
    }
  });
});

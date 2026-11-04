import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  INFOBOARD_AMBIENT_ASSET_PATHS,
  resolveActivityAmbientSrc,
} from "@/lib/infoboard/screen1-ambient-assets";

describe("Screen 1 ambient asset mapping (R12)", () => {
  it("maps activity types to canonical LIGHT ambient rasters", () => {
    expect(resolveActivityAmbientSrc("MATCH", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.match,
    );
    expect(resolveActivityAmbientSrc("TOURNAMENT", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.tournament,
    );
    expect(resolveActivityAmbientSrc("TRAINING", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.training,
    );
    expect(resolveActivityAmbientSrc("OTHER", "LIGHT")).toBeNull();
    expect(resolveActivityAmbientSrc("VACATION_PERIOD", "LIGHT")).toBeNull();
  });

  it("maps DARK activity types to the unified operational backdrop (R22)", () => {
    for (const eventType of ["MATCH", "TOURNAMENT", "TRAINING"] as const) {
      expect(resolveActivityAmbientSrc(eventType, "DARK")).toBe(
        INFOBOARD_AMBIENT_ASSET_PATHS.darkOperational,
      );
    }
    expect(resolveActivityAmbientSrc("OTHER", "DARK")).toBeNull();
  });

  it("exposes header and jumbotron ambient paths", () => {
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.header).toBe(
      "/Infoboard/ambient/infoboard-header-ambient.png",
    );
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.jumbotron).toBe(
      "/Infoboard/ambient/infoboard-jumbotron-ambient.png",
    );
  });

  it("stores ambient rasters under public/Infoboard (capital I)", () => {
    for (const publicPath of Object.values(INFOBOARD_AMBIENT_ASSET_PATHS)) {
      const diskPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
      expect(existsSync(diskPath), publicPath).toBe(true);
    }
  });
});

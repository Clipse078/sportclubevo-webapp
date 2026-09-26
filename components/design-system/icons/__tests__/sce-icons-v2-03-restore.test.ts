/**
 * SCE-ICONS-V2-03 — restore approved V1 geometry as monochrome V2 masters.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditV2AuthoritativeArtworkIntegrity,
  fingerprintApprovedHeroMasterSvg,
  SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS,
  SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA,
} from "../masters/approved-hero-fingerprint";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "../masters/approved-hero-meta";
import { NAV_DESTINATION_SCE_ICON_BY_KEY } from "@/lib/nav/nav-destination-sce-icons";
import {
  masterSvgGeometryEquivalent,
  normalizeMasterSvgGeometryMarkup,
} from "@/lib/icons/v1-master-geometry-equivalence";

const V1_FINAL_SNAPSHOT = "087dc2f75ddb1d806cb5d9ac1e7924a6c4c5fb1c";
const BRAND_HEX = /#(?:0b4aa2|f97316|fff|ffffff|062b52|f59a0b|2f8cff|ff7a1a)\b/i;
const V1_COLOR_TOKEN = /var\(--sce-icon-/i;

function readV1MasterSvg(name: string): string {
  return execFileSync(
    "git",
    ["show", `${V1_FINAL_SNAPSHOT}:public/images/icons/${name}.svg`],
    { encoding: "utf8", cwd: process.cwd() },
  );
}

describe("SCE-ICONS-V2-03 V1 geometry restoration", () => {
  it("recovers 90 approved masters from the final V1 snapshot", () => {
    const listed = execFileSync(
      "git",
      ["ls-tree", "--name-only", `${V1_FINAL_SNAPSHOT}:public/images/icons/`],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((file) => file.endsWith(".svg"));
    expect(listed.length).toBe(90);
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
  });

  it("proves V1_GEOMETRY_EQUIVALENT = 90/90 (color/style ownership only)", () => {
    const mismatches: string[] = [];
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const v1 = readV1MasterSvg(name);
      const v2 = readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8");
      if (!masterSvgGeometryEquivalent(v1, v2)) {
        mismatches.push(name);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("restores high-visibility approved V1 concepts", () => {
    const trainingV1 = normalizeMasterSvgGeometryMarkup(readV1MasterSvg("training"));
    const trainingV2 = normalizeMasterSvgGeometryMarkup(
      readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS.training), "utf8"),
    );
    expect(trainingV2).toBe(trainingV1);
    expect(trainingV2).toContain('d="M8 12v42h18"');
    expect(trainingV2).not.toContain("<rect");

    const matchV1 = readV1MasterSvg("match");
    expect(matchV1).toContain('d="M18 13A23 23');
    expect(
      masterSvgGeometryEquivalent(
        matchV1,
        readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS.match), "utf8"),
      ),
    ).toBe(true);

    for (const name of ["tournament", "dashboard", "week-planner", "team"] as const) {
      expect(
        masterSvgGeometryEquivalent(
          readV1MasterSvg(name),
          readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8"),
        ),
      ).toBe(true);
    }
  });
});

describe("SCE-ICONS-V2-03 monochrome color contract", () => {
  it("requires CURRENTCOLOR = 90/90 with zero baked brand / V1 runtime tokens", () => {
    let hardcodedBlue = 0;
    let hardcodedOrange = 0;
    let hardcodedWhite = 0;
    let v1ColorVars = 0;
    let missingCurrentColor = 0;

    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const src = readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8");
      if (!/currentColor/.test(src)) {
        missingCurrentColor += 1;
      }
      if (BRAND_HEX.test(src)) {
        if (/0b4aa2|2f8cff|062b52/i.test(src)) hardcodedBlue += 1;
        if (/f97316|f59a0b|ff7a1a/i.test(src)) hardcodedOrange += 1;
        if (/fff|ffffff/i.test(src)) hardcodedWhite += 1;
      }
      if (V1_COLOR_TOKEN.test(src)) {
        v1ColorVars += 1;
      }
    }

    expect(missingCurrentColor).toBe(0);
    expect(hardcodedBlue).toBe(0);
    expect(hardcodedOrange).toBe(0);
    expect(hardcodedWhite).toBe(0);
    expect(v1ColorVars).toBe(0);
  });
});

describe("SCE-ICONS-V2-03 administration semantics", () => {
  it("maps administration destinations to the canonical settings cogwheel master", () => {
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY.administration).toBe("settings");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY["admin-branding"]).toBe("settings");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY["website-settings"]).toBe("settings");
    const settingsSvg = readFileSync(
      join(process.cwd(), SCE_APPROVED_MASTER_ASSETS.settings),
      "utf8",
    );
    expect(settingsSvg).toMatch(/circle|<path/i);
  });
});

describe("SCE-ICONS-V2-03 authoritative fingerprints", () => {
  it("locks restored-monochrome artwork fingerprints", () => {
    expect(SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA).toMatch(/^[a-f0-9]{40}$/);
    const { mismatches } = auditV2AuthoritativeArtworkIntegrity();
    expect(mismatches).toEqual([]);
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[name])).toBe(
        SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[name],
      );
    }
  });
});

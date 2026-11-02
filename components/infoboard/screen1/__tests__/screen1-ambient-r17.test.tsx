/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R17 — Kabine foreground full-opacity lock (automated contract).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import {
  KABINE_FOREGROUND_OPACITY,
  KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY,
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT,
  VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX,
} from "@/lib/infoboard/screen1-ambient-depth";
import {
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_OPERATIONAL_AMBIENT_PRESENTATION,
} from "@/lib/infoboard/venue-display-grid";
import {
  buildWednesday20260826Feed,
  resolveWednesdayPreviewCurrentTimeIso,
} from "@/components/infoboard/screen1/wednesday-2026-08-26-fixture";

function cssBlock(selector: string): string {
  const start = SCREEN1_CSS.indexOf(selector);
  expect(start, `Missing CSS selector ${selector}`).toBeGreaterThanOrEqual(0);
  return SCREEN1_CSS.slice(start, SCREEN1_CSS.indexOf("}", start));
}

const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);
const AMBIENT_CSS = readFileSync(
  resolve(
    process.cwd(),
    "components/infoboard/venue-display/VenueAmbientLayer.module.css",
  ),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
  tenantPrimaryColor: "#0b4aa2",
  tenantSecondaryColor: "#c7332c",
};

afterEach(() => {
  cleanup();
});

describe("R17 Kabine foreground opacity invariant", () => {
  it("declares KABINE_FOREGROUND_OPACITY = 1", () => {
    expect(KABINE_FOREGROUND_OPACITY).toBe(1);
  });

  it("anchors Kabine readability veils to each cell (not the full training matrix)", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.trainingMatrixCell:nth-child\(2\)[\s\S]*position:\s*relative[\s\S]*isolation:\s*isolate/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-column="kabine"\]\.cardDressingRoomZone[\s\S]*position:\s*relative[\s\S]*isolation:\s*isolate/,
    );
  });

  it("keeps veil behind Kabine foreground with explicit opacity 1 on direct children", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.trainingMatrixCell:nth-child\(2\)::before[\s\S]*z-index:\s*0/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\.trainingMatrixCell:nth-child\(2\) > \*[\s\S]*z-index:\s*1[\s\S]*opacity:\s*1/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-column="kabine"\]\.cardDressingRoomZone::before[\s\S]*z-index:\s*0/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-column="kabine"\]\.cardDressingRoomZone > \*[\s\S]*opacity:\s*1/,
    );
  });

  it("does not apply row-index or density-dependent Kabine opacity fades", () => {
    expect(SCREEN1_CSS).not.toMatch(
      /\.trainingMatrixRow[^\{]*\{[^}]*opacity:\s*0\./,
    );
    expect(SCREEN1_CSS).not.toMatch(
      /\.eventCard\[data-type="TRAINING"\]\[data-group-density="[^"]+"\] \.trainingGroupRoomValue/,
    );
    const kabinePillBlock = cssBlock(".trainingGroupRoomValue {");
    expect(kabinePillBlock).not.toMatch(/opacity:/);
    expect(cssBlock(".matchAllocRoom {")).not.toMatch(/opacity:/);
    expect(cssBlock(".participantRoomValue {")).not.toMatch(/opacity:/);
  });

  it("does not mask or filter Kabine pill selectors", () => {
    for (const selector of [
      "trainingGroupRoomValue",
      "matchAllocRoom",
      "participantRoomValue",
    ]) {
      expect(SCREEN1_CSS).not.toMatch(new RegExp(`\\.${selector}[\\s\\S]*filter:`));
      expect(SCREEN1_CSS).not.toMatch(new RegExp(`\\.${selector}[\\s\\S]*mask-image:`));
    }
  });
});

describe("R17 dense training Kabine contract", () => {
  it("uses the same trainingGroupRoomValue class for every matrix Kabine cell", () => {
    const nowIso = resolveWednesdayPreviewCurrentTimeIso("18:45");
    render(
      <InfoboardScreen1
        feed={buildWednesday20260826Feed(nowIso)}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso={nowIso}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );
    const trainingCards = screen
      .getAllByTestId("event-row")
      .filter((row) => row.getAttribute("data-type") === "TRAINING");
    const trainingCard = trainingCards.reduce<HTMLElement | null>((best, card) => {
      const rowCount = within(card).queryAllByTestId("training-matrix-row").length;
      if (best === null) return card;
      const bestCount = within(best).queryAllByTestId("training-matrix-row").length;
      return rowCount > bestCount ? card : best;
    }, null);
    expect(trainingCard?.getAttribute("data-venue-operational-ambient")).toBe("true");

    const rows = within(trainingCard as HTMLElement).getAllByTestId("training-matrix-row");
    expect(rows.length).toBeGreaterThanOrEqual(6);

    const kabineClassNames = rows.map((row) => {
      const kabineCell = row.children.item(1);
      const pill = kabineCell?.querySelector("span");
      expect(pill).toBeTruthy();
      return pill?.className ?? "";
    });
    const reference = kabineClassNames[kabineClassNames.length - 1];
    expect(reference.length).toBeGreaterThan(0);
    for (const className of kabineClassNames) {
      expect(className).toBe(reference);
    }
  });
});

describe("R17 other foreground integrity", () => {
  it("keeps team and Platz foreground selectors free of ambient opacity hooks", () => {
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\.trainingMatrix[\s\S]*opacity:\s*1/,
    );
    expect(cssBlock(".trainingGroupPitchValue {")).not.toMatch(/opacity:\s*0\./);
    expect(SCREEN1_CSS).not.toMatch(
      /\.trainingIdentityRow[^\{]*\{[^}]*opacity:\s*0\./,
    );
  });
});

describe("R17 R16 ambient lock", () => {
  it("preserves background-only raster opacity and full-cover contract", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT).toEqual({
      MATCH: 0.42,
      TOURNAMENT: 0.38,
      TRAINING: 0.34,
    });
    expect(AMBIENT_CSS).toMatch(
      /\.activityTraining \.ambientIllustrationClip \.ambientImage[\s\S]*height:\s*100%[\s\S]*object-fit:\s*cover/,
    );
    expect(AMBIENT_CSS).not.toMatch(/\.ambientIllustrationClip[\s\S]*mask-image:/);
  });

  it("preserves foreground z-index stack and grid geometry", () => {
    expect(VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX.foreground).toBe(10);
    expect(SCREEN1_CSS).toMatch(
      new RegExp(
        `--venue-ambient-z-foreground:\\s*${VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX.foreground}`,
      ),
    );
    expect(VENUE_OPERATIONAL_AMBIENT_PRESENTATION).toEqual({
      leftPercent: 15,
      widthPercent: 85,
    });
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
  });

  it("records known MATCH pitch asset issue without CSS disguise", () => {
    expect(KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY).toBe("YES");
  });
});

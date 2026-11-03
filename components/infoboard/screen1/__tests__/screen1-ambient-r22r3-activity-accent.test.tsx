/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R22R3 — restore activity-type left accent on TIME column (Screen 1).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

describe("R22R3 activity-type TIME column left accent", () => {
  it("maps stripe keys to semantic design tokens on DARK operational cards", () => {
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\]\[data-stripe="red"\][\s\S]*border-left-color:\s*var\(--ib-match\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\]\[data-stripe="blue"\][\s\S]*border-left-color:\s*var\(--ib-training\)/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\]\[data-stripe="orange"\][\s\S]*border-left-color:\s*var\(--ib-tournament\)/,
    );
  });

  it("does not let the unified row outline override the left accent via border-color", () => {
    const darkOperationalOutline = SCREEN1_CSS.match(
      /\.root:not\(\[data-theme="light"\]\)\s*\.eventCard\[data-venue-operational-ambient="true"\]\s*\{([^}]+)\}/,
    )?.[1];
    expect(darkOperationalOutline ?? "").toContain("border-top-color:");
    expect(darkOperationalOutline ?? "").not.toMatch(/\bborder-color:/);
  });

  it("preserves card-level stripe width for the TIME column left edge", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.eventCard\s*\{[\s\S]*border-left:\s*var\(--ib-stripe-width\)\s+solid\s+transparent/,
    );
    expect(SCREEN1_CSS).toMatch(/--ib-stripe-width:\s*5px/);
  });

  it("keeps LIGHT theme stripe on the card left edge (TIME column geometry)", () => {
    expect(SCREEN1_CSS).toMatch(
      /\.root\[data-theme="light"\]\s*\.eventCard\s*\{[\s\S]*border-left:\s*var\(--ib-stripe-width\)/,
    );
    expect(SCREEN1_CSS).toMatch(/\.eventCard\[data-stripe="blue"\]\s*\{\s*border-left-color:\s*var\(--ib-training\)/);
  });

  it("does not reset current-row border-left when strengthening temporal emphasis", () => {
    const currentBlock = SCREEN1_CSS.match(/\.eventCard\[data-temporal="current"\]\s*\{([^}]+)\}/)?.[1];
    expect(currentBlock ?? "").toContain("border-top-color:");
    expect(currentBlock ?? "").not.toMatch(/\bborder-color:/);
  });
});

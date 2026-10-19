import { expect } from "vitest";

/** Canonical DOM order: NAME A → CREST A → VS → CREST B → NAME B */
export function expectCanonicalFixtureIdentityOrder(container: ParentNode) {
  const segments = container.querySelectorAll("[data-fixture-identity-segment]");
  expect(Array.from(segments).map((el) => el.getAttribute("data-fixture-identity-segment"))).toEqual([
    "name",
    "crest",
    "vs",
    "crest",
    "name",
  ]);
}

/** Canonical stacked match identity — home left, away right, crest above name per side. */
export function expectCanonicalStackedFixtureIdentity(container: ParentNode) {
  const fixture = container.querySelector('[data-sce-match-region="fixture"]');
  expect(fixture).toBeTruthy();
  const sides = fixture!.querySelectorAll("[data-sce-match-side]");
  expect(Array.from(sides).map((el) => el.getAttribute("data-sce-match-side"))).toEqual([
    "home",
    "away",
  ]);
  expect(fixture!.querySelector('[data-testid="sce-match-vs"]')).toBeTruthy();
  expect(fixture!.querySelector('[data-sce-match-region="home-crest"]')).toBeTruthy();
  expect(fixture!.querySelector('[data-sce-match-region="away-crest"]')).toBeTruthy();
  expect(fixture!.querySelector('[data-sce-match-region="home-name"]')).toBeTruthy();
  expect(fixture!.querySelector('[data-sce-match-region="away-name"]')).toBeTruthy();
}

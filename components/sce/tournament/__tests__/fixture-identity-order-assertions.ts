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

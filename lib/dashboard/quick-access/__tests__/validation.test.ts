import { describe, expect, it } from "vitest";
import {
  filterStoredKeysToAuthorized,
  validatePinnedKeysInput,
} from "../validation";

const ALLOWED = new Set(["navigation.aufgaben", "action.create-match"]);

describe("DASHBOARD-04 — quick access validation", () => {
  it("rejects unknown, duplicate, empty, and over-max payloads", () => {
    expect(validatePinnedKeysInput([], ALLOWED).ok).toBe(false);
    expect(validatePinnedKeysInput(["navigation.aufgaben"], ALLOWED).ok).toBe(true);
    expect(validatePinnedKeysInput(["unknown.key"], ALLOWED).ok).toBe(false);
    expect(
      validatePinnedKeysInput(["navigation.aufgaben", "navigation.aufgaben"], ALLOWED).ok,
    ).toBe(false);
    expect(
      validatePinnedKeysInput(
        Array.from({ length: 9 }, (_, i) => `navigation.aufgaben.${i}`),
        new Set(Array.from({ length: 9 }, (_, i) => `navigation.aufgaben.${i}`)),
      ).ok,
    ).toBe(false);
  });

  it("preserves relative order while dropping stale keys", () => {
    const filtered = filterStoredKeysToAuthorized(
      ["navigation.aufgaben", "navigation.removed", "action.create-match"],
      ALLOWED,
    );
    expect(filtered).toEqual(["navigation.aufgaben", "action.create-match"]);
  });
});

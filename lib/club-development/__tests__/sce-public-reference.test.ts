import { describe, expect, it } from "vitest";
import {
  formatScePublicReference,
  parseScePublicReference,
  scePublicReferenceFromNumber,
} from "../sce-public-reference";

describe("sce-public-reference", () => {
  it("formats at least six digits without truncation for longer numbers", () => {
    expect(formatScePublicReference(42)).toBe("SCE-000042");
    expect(formatScePublicReference(1_042)).toBe("SCE-001042");
    expect(formatScePublicReference(12_345_678)).toBe("SCE-12345678");
  });

  it("parses canonical references case-insensitively", () => {
    expect(parseScePublicReference("SCE-001042")).toEqual({ sequenceNumber: 1042 });
    expect(parseScePublicReference("sce-42")).toEqual({ sequenceNumber: 42 });
    expect(parseScePublicReference("M-2026-000001")).toBeNull();
  });

  it("maps stored numbers to display references", () => {
    expect(scePublicReferenceFromNumber(null)).toBeNull();
    expect(scePublicReferenceFromNumber(1042)).toBe("SCE-001042");
  });
});
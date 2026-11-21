import { describe, expect, it } from "vitest";
import {
  formatScePublicReference,
  parseScePublicReference,
  SCE_PUBLIC_SEQUENCE_MAX,
  scePublicReferenceFromNumber,
} from "../sce-public-reference";

describe("sce-public-reference", () => {
  it("formats at least six digits without truncation for longer numbers", () => {
    expect(formatScePublicReference(42)).toBe("SCE-000042");
    expect(formatScePublicReference(1_042)).toBe("SCE-001042");
    expect(formatScePublicReference(12_345_678)).toBe("SCE-12345678");
    expect(formatScePublicReference(2_147_483_647)).toBe("SCE-2147483647");
    expect(formatScePublicReference(9_007_199_254_741_000n)).toBe(
      "SCE-9007199254741000",
    );
  });

  it("parses canonical references case-insensitively", () => {
    expect(parseScePublicReference("SCE-001042")).toEqual({ sequenceNumber: 1042n });
    expect(parseScePublicReference("sce-42")).toEqual({ sequenceNumber: 42n });
    expect(parseScePublicReference("M-2026-000001")).toBeNull();
  });

  it("parses and formats beyond JavaScript Number.MAX_SAFE_INTEGER", () => {
    const beyondSafe = 9_007_199_254_741_000n;
    const ref = formatScePublicReference(beyondSafe);
    expect(parseScePublicReference(ref)).toEqual({ sequenceNumber: beyondSafe });
  });

  it("rejects references above supported BIGINT storage range", () => {
    const overflow = (SCE_PUBLIC_SEQUENCE_MAX + 1n).toString();
    expect(parseScePublicReference(`SCE-${overflow}`)).toBeNull();
  });

  it("maps stored numbers to display references", () => {
    expect(scePublicReferenceFromNumber(null)).toBeNull();
    expect(scePublicReferenceFromNumber(1042)).toBe("SCE-001042");
    expect(scePublicReferenceFromNumber(1042n)).toBe("SCE-001042");
  });
});
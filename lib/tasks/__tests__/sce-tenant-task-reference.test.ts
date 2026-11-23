import { describe, expect, it } from "vitest";
import {
  formatTenantPublicReference,
  normalizeTenantPublicReferenceShortCode,
  parseTenantPublicReference,
  resolveTenantPublicReferenceDisplay,
} from "@/lib/tenant-public-reference/sce-tenant-public-reference";

describe("tenant public reference (Aufgabe / shared foundation)", () => {
  it("uses {code}-{number} without zero padding", () => {
    expect(formatTenantPublicReference("FCA", 123)).toBe("FCA-123");
    expect(formatTenantPublicReference("fca", 1)).toBe("FCA-1");
  });

  it("parses tenant references case-insensitively", () => {
    expect(parseTenantPublicReference("FCA-123")).toEqual({
      shortCode: "FCA",
      tenantPublicNumber: 123n,
    });
    expect(parseTenantPublicReference("fca-99")).toEqual({
      shortCode: "FCA",
      tenantPublicNumber: 99n,
    });
    expect(parseTenantPublicReference("SCE-000123")).toBeNull();
  });

  it("normalizes short codes and rejects invalid codes", () => {
    expect(normalizeTenantPublicReferenceShortCode("fca")).toBe("FCA");
    expect(() => normalizeTenantPublicReferenceShortCode("A")).toThrow();
  });

  it("prefers tenant reference over legacy SCE when both exist", () => {
    expect(
      resolveTenantPublicReferenceDisplay({
        tenantShortCode: "FCA",
        tenantPublicNumber: 42n,
        legacyScePublicNumber: 900n,
      }),
    ).toBe("FCA-42");
  });
});
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-PERF-01 request-scoped metadata cache", () => {
  it("wraps shared tenant metadata loaders with React cache()", () => {
    const source = readFileSync(join(process.cwd(), "lib/server/request-cache.ts"), "utf8");
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("getCurrentTenantContextByIdCached");
    expect(source).toContain("getFacilitiesForTenantCached");
    expect(source).toContain("getTeamsListDataCached");
    expect(source).toContain("getPersonProfileByUserIdCached");
  });

  it("keys cached loaders by tenantId or userId (tenant-safe partitions)", () => {
    const source = readFileSync(join(process.cwd(), "lib/server/request-cache.ts"), "utf8");
    expect(source).toMatch(/cache\(\(tenantId: string\)/);
    expect(source).toMatch(/cache\(\(userId: string\)/);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  collectPerf01aRegionProof,
  isPerf01aRegionProofEnvironment,
  parseNeonDatabaseRegion,
  SCE_PERF_01A_REGION_SELECT1_SAMPLES,
} from "@/lib/diagnostics/sce-perf-01a-region-proof";

describe("sce-perf-01a-region-proof", () => {
  it("allows STAGE and Preview only", () => {
    expect(
      isPerf01aRegionProofEnvironment({
        isProd: false,
        isPreview: false,
        isStage: true,
      }),
    ).toBe(true);
    expect(
      isPerf01aRegionProofEnvironment({
        isProd: false,
        isPreview: true,
        isStage: false,
      }),
    ).toBe(true);
    expect(
      isPerf01aRegionProofEnvironment({
        isProd: true,
        isPreview: false,
        isStage: false,
      }),
    ).toBe(false);
    expect(
      isPerf01aRegionProofEnvironment({
        isProd: false,
        isPreview: false,
        isStage: false,
      }),
    ).toBe(false);
  });

  it("parses Neon AWS region without returning hostname", () => {
    const region = parseNeonDatabaseRegion(
      "postgresql://user:secret@ep-test-123.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(region).toBe("eu-central-1");
  });

  it("runs SELECT 1 warm samples only via shared prisma client", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ ok: 1 }]);
    const prisma = { $queryRaw: queryRaw } as unknown as import("@prisma/client").PrismaClient;

    const payload = await collectPerf01aRegionProof(
      prisma,
      {
        NODE_ENV: "production",
        DATABASE_URL:
          "postgresql://user:secret@ep-test.eu-central-1.aws.neon.tech/neondb",
        VERCEL_REGION: "fra1",
      },
      3,
    );

    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(payload.vercelRegion).toBe("fra1");
    expect(payload.databaseRegion).toBe("eu-central-1");
    expect(payload.select1.samplesMs).toHaveLength(3);
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("defaults to five SELECT 1 samples", () => {
    expect(SCE_PERF_01A_REGION_SELECT1_SAMPLES).toBe(5);
  });
});

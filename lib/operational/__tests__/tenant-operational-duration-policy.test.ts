import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mapTenantOperationalDurationPolicyRow,
  getTenantOperationalDurationPolicy,
  upsertTenantOperationalDurationPolicy,
} from "../tenant-operational-duration-policy-service";
import {
  SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
} from "../defaults";
import { validateTenantOperationalDurationMinutes } from "../validation";
import { resolveMatchOperationalInterval } from "@/lib/match/resolve-match-operational-interval";
import { operationalPolicyToMatchResolved } from "@/lib/match/tenant-operational-policy-service";
import { getPublishingEffectiveEndAt } from "@/lib/publishing/time/publishing-effective-end-at";
import { resolveTypeOperationalEndAt } from "../resolve-type-operational-end-at";

const prismaMock = vi.hoisted(() => ({
  tenantMatchOperationalPolicy: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("tenant operational duration policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses platform defaults when no tenant configuration exists", () => {
    expect(mapTenantOperationalDurationPolicyRow(null)).toEqual({
      MATCH: {
        durationMinutes: SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
        isClubConfigured: false,
      },
      TRAINING: {
        durationMinutes: SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES,
        isClubConfigured: false,
      },
      TOURNAMENT: {
        durationMinutes: SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES,
        isClubConfigured: false,
      },
    });
  });

  it("allows independent tenant overrides per kind", () => {
    const mapped = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 90,
      defaultTrainingDurationMinutes: 75,
      defaultTournamentDurationMinutes: 180,
    });
    expect(mapped.MATCH).toEqual({ durationMinutes: 90, isClubConfigured: true });
    expect(mapped.TRAINING).toEqual({ durationMinutes: 75, isClubConfigured: true });
    expect(mapped.TOURNAMENT).toEqual({ durationMinutes: 180, isClubConfigured: true });
  });

  it("preserves SCE-OPS-01A match-only rows with platform training/tournament fallbacks", () => {
    const mapped = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 105,
      defaultTrainingDurationMinutes: null,
      defaultTournamentDurationMinutes: null,
    });
    expect(mapped.MATCH).toEqual({ durationMinutes: 105, isClubConfigured: true });
    expect(mapped.TRAINING.isClubConfigured).toBe(false);
    expect(mapped.TRAINING.durationMinutes).toBe(SCE_PLATFORM_DEFAULT_TRAINING_DURATION_MINUTES);
    expect(mapped.TOURNAMENT.isClubConfigured).toBe(false);
    expect(mapped.TOURNAMENT.durationMinutes).toBe(SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES);
  });

  it("isolates tenants at the database boundary", async () => {
    prismaMock.tenantMatchOperationalPolicy.findUnique.mockResolvedValueOnce({
      defaultMatchDurationMinutes: 100,
      defaultTrainingDurationMinutes: 80,
      defaultTournamentDurationMinutes: 150,
    });
    const tenantA = await getTenantOperationalDurationPolicy("tenant-a");
    expect(tenantA.MATCH.durationMinutes).toBe(100);

    prismaMock.tenantMatchOperationalPolicy.findUnique.mockResolvedValueOnce(null);
    const tenantB = await getTenantOperationalDurationPolicy("tenant-b");
    expect(tenantB.MATCH.durationMinutes).toBe(SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES);
    expect(prismaMock.tenantMatchOperationalPolicy.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-b" } }),
    );
  });

  it("rejects invalid duration values", () => {
    expect(() => validateTenantOperationalDurationMinutes(0)).toThrow();
    expect(() => validateTenantOperationalDurationMinutes(-5)).toThrow();
    expect(() => validateTenantOperationalDurationMinutes(481)).toThrow();
    expect(() => validateTenantOperationalDurationMinutes(Number.NaN)).toThrow();
  });

  it("keeps authoritative provider match end when meaningful", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const providerEnd = new Date("2026-09-19T11:30:00.000Z");
    const interval = resolveMatchOperationalInterval({
      startAt: start,
      authoritativeEndAt: providerEnd,
      tenantPolicy: operationalPolicyToMatchResolved(
        mapTenantOperationalDurationPolicyRow({
          defaultMatchDurationMinutes: 60,
          defaultTrainingDurationMinutes: null,
          defaultTournamentDurationMinutes: null,
        }),
      ),
    });
    expect(interval.endAt).toEqual(providerEnd);
    expect(interval.durationSource).toBe("AUTHORITATIVE");
  });

  it("uses tenant match default when provider end is missing", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const policy = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 105,
      defaultTrainingDurationMinutes: null,
      defaultTournamentDurationMinutes: null,
    });
    const interval = resolveMatchOperationalInterval({
      startAt: start,
      authoritativeEndAt: null,
      tenantPolicy: operationalPolicyToMatchResolved(policy),
    });
    expect(interval.durationMinutes).toBe(105);
    expect(interval.durationSource).toBe("CLUB_DEFAULT");
  });

  it("honours manual match operational override", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const overrideEnd = new Date("2026-09-19T11:15:00.000Z");
    const interval = resolveMatchOperationalInterval({
      startAt: start,
      authoritativeEndAt: null,
      operationalEndAtOverride: overrideEnd,
      tenantPolicy: operationalPolicyToMatchResolved(mapTenantOperationalDurationPolicyRow(null)),
    });
    expect(interval.endAt).toEqual(overrideEnd);
    expect(interval.endSource).toBe("SCE_OVERRIDE");
  });

  it("keeps valid training end unchanged", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const end = new Date("2026-09-19T11:00:00.000Z");
    const policy = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 120,
      defaultTrainingDurationMinutes: 45,
      defaultTournamentDurationMinutes: 120,
    });
    expect(
      resolveTypeOperationalEndAt({ startAt: start, endAt: end, type: "TRAINING" }, "TRAINING", policy),
    ).toEqual(end);
  });

  it("uses training tenant fallback when end is missing", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const policy = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 120,
      defaultTrainingDurationMinutes: 75,
      defaultTournamentDurationMinutes: 120,
    });
    const end = resolveTypeOperationalEndAt(
      { startAt: start, endAt: null, type: "TRAINING" },
      "TRAINING",
      policy,
    );
    expect(end.getTime()).toBe(start.getTime() + 75 * 60_000);
  });

  it("uses tournament tenant fallback when end is missing", () => {
    const start = new Date("2026-09-19T10:00:00.000Z");
    const policy = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 120,
      defaultTrainingDurationMinutes: 90,
      defaultTournamentDurationMinutes: 150,
    });
    const end = resolveTypeOperationalEndAt(
      { startAt: start, endAt: null, type: "TOURNAMENT" },
      "TOURNAMENT",
      policy,
    );
    expect(end.getTime()).toBe(start.getTime() + 150 * 60_000);
  });

  it("wires publishing effective end for training with tenant policy", () => {
    const start = new Date("2026-09-19T05:30:00.000Z");
    const policy = mapTenantOperationalDurationPolicyRow({
      defaultMatchDurationMinutes: 120,
      defaultTrainingDurationMinutes: 75,
      defaultTournamentDurationMinutes: 120,
    });
    const end = getPublishingEffectiveEndAt(
      { startAt: start, endAt: null, type: "TRAINING" },
      { operationalDurationPolicy: policy },
    );
    expect(end.getTime()).toBe(start.getTime() + 75 * 60_000);
  });

  it("persists all three durations on upsert", async () => {
    prismaMock.tenantMatchOperationalPolicy.upsert.mockResolvedValue({
      defaultMatchDurationMinutes: 90,
      defaultTrainingDurationMinutes: 100,
      defaultTournamentDurationMinutes: 110,
    });
    const result = await upsertTenantOperationalDurationPolicy("tenant-1", {
      defaultMatchDurationMinutes: 90,
      defaultTrainingDurationMinutes: 100,
      defaultTournamentDurationMinutes: 110,
    });
    expect(result.MATCH.durationMinutes).toBe(90);
    expect(result.TRAINING.durationMinutes).toBe(100);
    expect(result.TOURNAMENT.durationMinutes).toBe(110);
    expect(prismaMock.tenantMatchOperationalPolicy.upsert).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tournamentPitch: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tournament-scheduling/internal/require-tournament", () => ({
  requireTournamentEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db/prisma";
import { listTournamentPitches } from "@/lib/tournament-scheduling/tournament-pitch-service";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";
import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";

/**
 * Regression for STAGE UAT blocker: 02B app code + Prisma client selecting
 * TournamentPitch.playersPerSide without the 02B migration applied causes
 * P2022 and a full server failure on tournament edit (planung preload).
 */
describe("Tournament edit page — 02B schema coupling", () => {
  it("edit route preloads planung for tenant-organised tournaments", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx"),
      "utf8",
    );
    expect(page).toContain("loadTournamentPlanungViewModel");
  });

  it("planung load lists tournament pitches via service that selects playersPerSide", () => {
    const load = readFileSync(
      join(process.cwd(), "lib/tournaments/planung/load-tournament-planung.server.ts"),
      "utf8",
    );
    expect(load).toContain("listTournamentPitches");

    const service = readFileSync(
      join(process.cwd(), "lib/tournament-scheduling/tournament-pitch-service.ts"),
      "utf8",
    );
    expect(service).toMatch(/playersPerSide:\s*true/);
  });

  it("02B migration adds nullable playersPerSide without data rewrite", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261019120000_sce_tournament_planner_02b_playing_format/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain('"playersPerSide"');
    expect(sql).not.toMatch(/UPDATE\s+"TournamentPitch"/i);
  });

  it("documents guarded STAGE migration apply script for 02B", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/sce-tournament-planner-02b-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
  });

  describe("planung preload pitch query (edit-page failure path)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("reads legacy pitches with playersPerSide NULL via Prisma select", async () => {
      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue([
        {
          id: "pitch-legacy",
          eventId: "event-1",
          displayOrder: 0,
          label: "Feld 1",
          playersPerSide: null,
        },
      ] as never);

      const rows = await listTournamentPitches("tenant-1", "event-1");
      expect(rows[0]?.playersPerSide).toBeNull();
      expect(prisma.tournamentPitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ playersPerSide: true }),
        }),
      );
    });

    it("reads configured playersPerSide via the same list path used by planung preload", async () => {
      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue([
        {
          id: "pitch-configured",
          eventId: "event-1",
          displayOrder: 0,
          label: "Feld 1",
          playersPerSide: 6,
        },
      ] as never);

      const rows = await listTournamentPitches("tenant-1", "event-1");
      expect(rows[0]?.playersPerSide).toBe(6);
    });

    it("maps listTournamentPitches rows into planung view-model pitch columns", () => {
      const minimalSnapshot: PlanungDomainSnapshot = {
        tournamentId: "event-1",
        ownership: "TENANT_ORGANISED",
        timezone: "Europe/Zurich",
        windowStartUtc: null,
        windowEndUtc: null,
        scheduleVersionId: null,
        scheduleRevision: null,
        schedulingConfig: {
          matchDurationMinutes: 20,
          transitionMinutes: 5,
          minRestMinutes: 10,
        },
        pitches: [
          { id: "p-null", displayOrder: 0, label: "Feld A", playersPerSide: null },
          { id: "p-six", displayOrder: 1, label: "Feld B", playersPerSide: 6 },
        ],
        breaks: [],
        fixtures: [],
        assignments: [],
        participants: [],
        participantCount: 0,
        fixtureCount: 0,
        feasibility: { status: "FEASIBLE", diagnostics: [], metrics: {} as never, suggestions: [] },
        smartTiming: null,
        optimisation: { status: "FEASIBLE_NOT_PROVEN_OPTIMAL" } as never,
        fixtureResults: [],
        groups: [],
        rankingConfiguration: null,
        scheduleConsistencyStatus: "MATCHES",
        fixtureHomeAwayRelevance: "OFF",
      };

      const vm = buildTournamentPlanungViewModel(minimalSnapshot);
      expect(vm.pitches).toEqual([
        expect.objectContaining({
          pitchId: "p-null",
          playersPerSide: null,
          formatHint: null,
        }),
        expect.objectContaining({
          pitchId: "p-six",
          playersPerSide: 6,
          formatHint: "6v6",
        }),
      ]);
    });
  });
});

const MIGRATION_NAME = "20261019120000_sce_tournament_planner_02b_playing_format";

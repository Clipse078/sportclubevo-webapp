/**
 * SCE-TOURNAMENT-PLANNER-02B — optional playersPerSide on TournamentPitch.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    tournamentPitch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../internal/require-tournament", () => ({
  requireTournamentEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db/prisma";
import {
  createTournamentPitch,
  listTournamentPitches,
  updateTournamentPitch,
} from "../tournament-pitch-service";
import { parsePlayersPerSideInput } from "../validate-tournament-pitch-playing-format";
import { TournamentSchedulingError } from "../errors";
import {
  formatPlayingFormatAccessibleLabel,
  resolvePlayingFormatCompactLabel,
} from "../playing-format-presentation";
import { resolveTournamentPitchColumnPresentation } from "@/lib/tournaments/planung/tournament-pitch-presentation";

const TENANT = "tenant-1";
const EVENT = "event-1";

const pitchRow = (overrides?: Partial<{ playersPerSide: number | null }>) => ({
  id: "pitch-1",
  eventId: EVENT,
  displayOrder: 0,
  label: "Feld 1",
  playersPerSide: null as number | null,
  ...overrides,
});

describe("SCE-TOURNAMENT-PLANNER-02B playing format", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("presentation", () => {
    it("formats compact and accessible labels from playersPerSide", () => {
      expect(resolvePlayingFormatCompactLabel(3)).toBe("3v3");
      expect(formatPlayingFormatAccessibleLabel(5)).toBe("5 gegen 5");
      expect(resolvePlayingFormatCompactLabel(null)).toBeNull();
    });

    it("omits format hint when unspecified", () => {
      expect(
        resolveTournamentPitchColumnPresentation({ label: "Feld 1", playersPerSide: null }),
      ).toEqual({ label: "Feld 1", formatHint: null });
      expect(
        resolveTournamentPitchColumnPresentation({ label: "Feld 1", playersPerSide: 6 }),
      ).toEqual({ label: "Feld 1", formatHint: "6v6" });
    });
  });

  describe("validation", () => {
    it("accepts null, omitted, and valid integers", () => {
      expect(parsePlayersPerSideInput(null)).toBeNull();
      expect(parsePlayersPerSideInput(undefined)).toBeNull();
      expect(parsePlayersPerSideInput(7)).toBe(7);
    });

    it("rejects out-of-band values", () => {
      expect(() => parsePlayersPerSideInput(0)).toThrow(TournamentSchedulingError);
      expect(() => parsePlayersPerSideInput(23)).toThrow(TournamentSchedulingError);
    });
  });

  describe("persistence service", () => {
    it("creates pitch without PlayingFormat", async () => {
      vi.mocked(prisma.tournamentPitch.aggregate).mockResolvedValue({ _max: { displayOrder: null } } as never);
      vi.mocked(prisma.tournamentPitch.create).mockResolvedValue(pitchRow() as never);

      const created = await createTournamentPitch(TENANT, EVENT, { label: "Feld 1" });
      expect(created.playersPerSide).toBeNull();
      expect(prisma.tournamentPitch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ playersPerSide: null }),
        }),
      );
    });

    it("creates pitch with generic playersPerSide values", async () => {
      vi.mocked(prisma.tournamentPitch.aggregate).mockResolvedValue({ _max: { displayOrder: 0 } } as never);
      for (const n of [3, 4, 5, 6, 7, 8]) {
        vi.mocked(prisma.tournamentPitch.create).mockResolvedValueOnce(
          pitchRow({ playersPerSide: n }) as never,
        );
        const created = await createTournamentPitch(TENANT, EVENT, {
          label: `Feld ${n}`,
          playersPerSide: n,
        });
        expect(created.playersPerSide).toBe(n);
      }
    });

    it("updates and clears format without touching other fields", async () => {
      vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue({ id: "pitch-1" } as never);
      vi.mocked(prisma.tournamentPitch.update).mockResolvedValue(
        pitchRow({ playersPerSide: 5 }) as never,
      );

      await updateTournamentPitch(TENANT, EVENT, "pitch-1", { playersPerSide: 5 });
      expect(prisma.tournamentPitch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { playersPerSide: 5 } }),
      );

      vi.mocked(prisma.tournamentPitch.update).mockResolvedValue(pitchRow() as never);
      await updateTournamentPitch(TENANT, EVENT, "pitch-1", { playersPerSide: null });
      expect(prisma.tournamentPitch.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { playersPerSide: null } }),
      );
    });

    it("lists legacy null pitches as valid", async () => {
      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue([pitchRow()] as never);
      const rows = await listTournamentPitches(TENANT, EVENT);
      expect(rows[0]?.playersPerSide).toBeNull();
    });
  });

  describe("CREATE → edit contract (02B R1)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(prisma.tournamentPitch.findFirst).mockResolvedValue({ id: "pitch-1" } as never);
    });

    it("A — create/read pitch without PlayingFormat keeps playersPerSide NULL", async () => {
      vi.mocked(prisma.tournamentPitch.aggregate).mockResolvedValue({ _max: { displayOrder: null } } as never);
      vi.mocked(prisma.tournamentPitch.create).mockResolvedValue(pitchRow() as never);
      const created = await createTournamentPitch(TENANT, EVENT, { label: "Feld 1" });
      expect(created.playersPerSide).toBeNull();

      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue([pitchRow()] as never);
      const listed = await listTournamentPitches(TENANT, EVENT);
      expect(listed[0]?.playersPerSide).toBeNull();
    });

    it("B — create/read pitch with playersPerSide = 3", async () => {
      vi.mocked(prisma.tournamentPitch.aggregate).mockResolvedValue({ _max: { displayOrder: null } } as never);
      vi.mocked(prisma.tournamentPitch.create).mockResolvedValue(
        pitchRow({ playersPerSide: 3 }) as never,
      );
      const created = await createTournamentPitch(TENANT, EVENT, {
        label: "Feld 1",
        playersPerSide: 3,
      });
      expect(created.playersPerSide).toBe(3);

      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue(
        [pitchRow({ playersPerSide: 3 })] as never,
      );
      const listed = await listTournamentPitches(TENANT, EVENT);
      expect(listed[0]?.playersPerSide).toBe(3);
    });

    it("C — change 3 → 6 on edit/read", async () => {
      vi.mocked(prisma.tournamentPitch.update).mockResolvedValue(
        pitchRow({ playersPerSide: 6 }) as never,
      );
      const updated = await updateTournamentPitch(TENANT, EVENT, "pitch-1", { playersPerSide: 6 });
      expect(updated.playersPerSide).toBe(6);

      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue(
        [pitchRow({ playersPerSide: 6 })] as never,
      );
      const listed = await listTournamentPitches(TENANT, EVENT);
      expect(listed[0]?.playersPerSide).toBe(6);
    });

    it("D — change 6 → unspecified clears playersPerSide to NULL", async () => {
      vi.mocked(prisma.tournamentPitch.update).mockResolvedValue(pitchRow() as never);
      const updated = await updateTournamentPitch(TENANT, EVENT, "pitch-1", {
        playersPerSide: null,
      });
      expect(updated.playersPerSide).toBeNull();

      vi.mocked(prisma.tournamentPitch.findMany).mockResolvedValue([pitchRow()] as never);
      const listed = await listTournamentPitches(TENANT, EVENT);
      expect(listed[0]?.playersPerSide).toBeNull();
    });
  });
});

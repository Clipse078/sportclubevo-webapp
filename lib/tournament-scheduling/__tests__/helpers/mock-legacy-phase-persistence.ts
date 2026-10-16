import { vi } from "vitest";
import { prisma } from "@/lib/db/prisma";

/** Mocks 01E3A legacy phase bootstrap used by generateTournamentFixturesForEvent. */
export function mockLegacyGroupMixPhaseBootstrap(
  tournamentId: string,
  phaseId = "phase-main",
): void {
  vi.mocked(prisma.tournamentPhase.findFirst).mockResolvedValue({
    id: phaseId,
    eventId: tournamentId,
    displayOrder: 1,
    phaseType: "GROUP_MIX",
    label: "Gruppen-/Mixspiele",
    stageKey: "MAIN",
    groupMixStrategy: null,
    smartMixTargetMatchesPerParticipant: null,
  } as never);
  vi.mocked(prisma.tournamentCompetitionConfiguration.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.tournamentCompetitionConfiguration.create).mockResolvedValue({
    id: "comp-config",
    eventId: tournamentId,
    competitionFormat: "GROUP_MIX_ONLY",
  } as never);
  vi.mocked(prisma.tournamentPhase.create).mockResolvedValue({
    id: phaseId,
    eventId: tournamentId,
    displayOrder: 1,
    phaseType: "GROUP_MIX",
    label: "Gruppen-/Mixspiele",
    stageKey: "MAIN",
    groupMixStrategy: null,
    smartMixTargetMatchesPerParticipant: null,
  } as never);
  vi.mocked(prisma.tournamentFixture.updateMany).mockResolvedValue({ count: 0 } as never);
  vi.mocked(prisma.tournamentFixtureSide.createMany).mockResolvedValue({ count: 2 } as never);
}

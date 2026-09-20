import { describe, expect, it, vi, beforeEach } from "vitest";
import { ParticipationValidationError } from "../errors";
import {
  PARTICIPATION_EVENT_START_ERROR,
  PARTICIPATION_TRAINING_START_ERROR,
  assertParticipationDueBeforeEventStart,
  assertParticipationDueBeforeTrainingStart,
} from "../participation-start-invariant";

const prismaMocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  trainingSessionFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: prismaMocks.eventFindFirst, update: vi.fn() },
    trainingSession: { findFirst: prismaMocks.trainingSessionFindFirst, update: vi.fn() },
  },
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: vi.fn(),
}));

describe("participation reschedule invariant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sync event guard uses canonical copy", () => {
    const due = new Date("2026-09-26T10:00:00.000Z");
    const start = new Date("2026-09-26T09:00:00.000Z");
    expect(() => assertParticipationDueBeforeEventStart(due, start)).toThrow(
      ParticipationValidationError,
    );
    try {
      assertParticipationDueBeforeEventStart(due, start);
    } catch (e) {
      expect((e as Error).message).toBe(PARTICIPATION_EVENT_START_ERROR);
    }
  });

  it("sync training guard uses canonical copy", () => {
    const due = new Date("2026-09-26T10:00:00.000Z");
    const start = new Date("2026-09-26T09:00:00.000Z");
    expect(() => assertParticipationDueBeforeTrainingStart(due, start)).toThrow(
      ParticipationValidationError,
    );
    try {
      assertParticipationDueBeforeTrainingStart(due, start);
    } catch (e) {
      expect((e as Error).message).toBe(PARTICIPATION_TRAINING_START_ERROR);
    }
  });

  it("assertEventStartCompatibleWithParticipationDue rejects invalid reschedule", async () => {
    prismaMocks.eventFindFirst.mockResolvedValue({
      participationResponseDueAt: new Date("2026-09-25T18:00:00.000Z"),
      type: "MATCH",
    });
    const { assertEventStartCompatibleWithParticipationDue } = await import(
      "../participation-request-config-service"
    );
    await expect(
      assertEventStartCompatibleWithParticipationDue(
        "tenant-1",
        "event-1",
        new Date("2026-09-25T12:00:00.000Z"),
      ),
    ).rejects.toThrow(PARTICIPATION_EVENT_START_ERROR);
  });

  it("assertTrainingSessionStartCompatibleWithParticipationDue accepts valid start", async () => {
    prismaMocks.trainingSessionFindFirst.mockResolvedValue({
      participationResponseDueAt: new Date("2026-09-25T12:00:00.000Z"),
    });
    const { assertTrainingSessionStartCompatibleWithParticipationDue } = await import(
      "../participation-request-config-service"
    );
    await expect(
      assertTrainingSessionStartCompatibleWithParticipationDue(
        "tenant-1",
        "session-1",
        new Date("2026-09-26T12:00:00.000Z"),
      ),
    ).resolves.toBeUndefined();
  });
});

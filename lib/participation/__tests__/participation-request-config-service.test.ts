import { describe, expect, it, vi, beforeEach } from "vitest";
import { ParticipationEventNotFoundError, ParticipationValidationError } from "../errors";

const prismaMocks = vi.hoisted(() => ({
  trainingSessionFindFirst: vi.fn(),
  trainingSessionUpdate: vi.fn(),
  eventFindFirst: vi.fn(),
  eventUpdate: vi.fn(),
  trainingSeriesFindFirst: vi.fn(),
  trainingSeriesUpdate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    trainingSession: {
      findFirst: prismaMocks.trainingSessionFindFirst,
      update: prismaMocks.trainingSessionUpdate,
    },
    event: {
      findFirst: prismaMocks.eventFindFirst,
      update: prismaMocks.eventUpdate,
    },
    trainingSeries: {
      findFirst: prismaMocks.trainingSeriesFindFirst,
      update: prismaMocks.trainingSeriesUpdate,
    },
  },
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: vi.fn(),
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

describe("participation-request-config-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.trainingSessionUpdate.mockResolvedValue({});
    prismaMocks.eventUpdate.mockResolvedValue({});
    prismaMocks.trainingSeriesUpdate.mockResolvedValue({});
  });

  it("N47/N23 — clearing deadline nulls all reminder fields on training session", async () => {
    prismaMocks.trainingSessionFindFirst.mockResolvedValue({
      id: "session-1",
      startAt: new Date("2026-09-30T15:00:00.000Z"),
      overrideStartAt: null,
      timezone: "Europe/Zurich",
      status: "SCHEDULED",
      participationResponseDueAt: new Date("2026-09-29T16:00:00.000Z"),
      participationReminder1At: new Date("2026-09-28T08:00:00.000Z"),
      participationReminder2At: new Date("2026-09-29T08:00:00.000Z"),
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: "DAYS_1",
    });

    const { updateTrainingSessionParticipationRequestConfig } = await import(
      "../participation-request-config-service"
    );
    await updateTrainingSessionParticipationRequestConfig(
      TENANT_A,
      "session-1",
      { participationResponseDueAt: null },
      "actor-1",
    );

    expect(prismaMocks.trainingSessionUpdate).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        participationResponseDueAt: null,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
      },
    });
  });

  it("N23 — MATCH round-trip persists computed schedule from mutation", async () => {
    const start = new Date("2026-09-30T15:00:00.000Z");
    const due = new Date("2026-09-29T16:00:00.000Z");
    prismaMocks.eventFindFirst.mockResolvedValue({
      id: "match-1",
      type: "MATCH",
      startAt: start,
      status: "SCHEDULED",
      participationResponseDueAt: null,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: null,
      participationReminder2PresetKey: null,
      tenant: { timezone: "Europe/Zurich" },
    });

    const { updateEventParticipationRequestConfig } = await import(
      "../participation-request-config-service"
    );
    await updateEventParticipationRequestConfig(
      TENANT_A,
      "match-1",
      {
        participationResponseDueAt: due,
        participationReminder1PresetKey: "DAYS_1",
      },
      "actor-1",
    );

    const updateArg = prismaMocks.eventUpdate.mock.calls[0][0];
    expect(updateArg.data.participationResponseDueAt).toEqual(due);
    expect(updateArg.data.participationReminder1At).not.toBeNull();
    expect(updateArg.data.participationReminder1At!.getTime()).toBeLessThan(due.getTime());
  });

  it("N56 — foreign tenant cannot update training session config", async () => {
    prismaMocks.trainingSessionFindFirst.mockResolvedValue(null);
    const { updateTrainingSessionParticipationRequestConfig } = await import(
      "../participation-request-config-service"
    );
    await expect(
      updateTrainingSessionParticipationRequestConfig(
        TENANT_B,
        "session-in-tenant-a",
        { participationResponseDueAt: new Date("2026-09-29T16:00:00.000Z") },
        "actor-foreign",
      ),
    ).rejects.toBeInstanceOf(ParticipationEventNotFoundError);
    expect(prismaMocks.trainingSessionUpdate).not.toHaveBeenCalled();
  });

  it("N49 — invalid event start after RSVP deadline rejected at schedule layer", async () => {
    const start = new Date("2026-09-30T15:00:00.000Z");
    prismaMocks.eventFindFirst.mockResolvedValue({
      id: "match-1",
      type: "MATCH",
      startAt: start,
      status: "SCHEDULED",
      participationResponseDueAt: new Date("2026-09-29T16:00:00.000Z"),
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: null,
      participationReminder2PresetKey: null,
      tenant: { timezone: "Europe/Zurich" },
    });

    const { updateEventParticipationRequestConfig } = await import(
      "../participation-request-config-service"
    );
    await expect(
      updateEventParticipationRequestConfig(TENANT_A, "match-1", {
        participationResponseDueAt: start,
      }),
    ).rejects.toBeInstanceOf(ParticipationValidationError);
  });
});

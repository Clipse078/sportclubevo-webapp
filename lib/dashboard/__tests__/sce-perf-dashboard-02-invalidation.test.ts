import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceBackgroundJobType } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  tenantMembership: { findMany: vi.fn() },
  person: { findMany: vi.fn(), findFirst: vi.fn() },
  teamSeason: { findFirst: vi.fn(), findMany: vi.fn() },
  playerSquadMember: { findMany: vi.fn() },
  trainerTeamMember: { findMany: vi.fn() },
  trainingSession: { findFirst: vi.fn() },
  event: { findFirst: vi.fn() },
  eventParticipationAudienceEntry: { findMany: vi.fn() },
  workspaceBackgroundJob: { create: vi.fn(), findFirst: vi.fn() },
}));

const enqueueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/workspace/background-jobs/job-enqueue", () => ({
  enqueueWorkspaceBackgroundJob: enqueueMock,
}));

describe("SCE-PERF-DASHBOARD-02 invalidation audience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueMock.mockResolvedValue({ id: "job-1", created: true });
    prismaMock.tenantMembership.findMany.mockResolvedValue([{ userId: "user-a" }]);
  });

  it("enqueues rebuild for active tenant user on person mutation", async () => {
    prismaMock.person.findMany.mockResolvedValue([{ userId: "user-a" }]);
    const { notifyPersonalDashboardForPersonIds } = await import(
      "@/lib/dashboard/read-model/invalidate-audience"
    );

    await notifyPersonalDashboardForPersonIds("tenant-a", ["person-1"]);

    expect(enqueueMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-a",
        type: WorkspaceBackgroundJobType.PERSONAL_DASHBOARD_REBUILD,
        payload: { v: 1, userId: "user-a" },
      }),
    );
  });

  it("does not enqueue cross-tenant inactive users", async () => {
    prismaMock.person.findMany.mockResolvedValue([{ userId: "user-b" }]);
    prismaMock.tenantMembership.findMany.mockResolvedValue([]);
    const { notifyPersonalDashboardForPersonIds } = await import(
      "@/lib/dashboard/read-model/invalidate-audience"
    );

    await notifyPersonalDashboardForPersonIds("tenant-a", ["person-2"]);

    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("dedupes team season squad and trainer users", async () => {
    prismaMock.teamSeason.findFirst.mockResolvedValue({ id: "ts-1" });
    prismaMock.playerSquadMember.findMany.mockResolvedValue([
      { person: { userId: "user-a" } },
    ]);
    prismaMock.trainerTeamMember.findMany.mockResolvedValue([
      { person: { userId: "user-a" } },
    ]);

    const { notifyPersonalDashboardForTeamSeason } = await import(
      "@/lib/dashboard/read-model/invalidate-audience"
    );

    await notifyPersonalDashboardForTeamSeason("tenant-a", "ts-1");

    expect(enqueueMock).toHaveBeenCalledTimes(1);
  });

  it("training session invalidation resolves team season", async () => {
    prismaMock.trainingSession.findFirst.mockResolvedValue({ teamSeasonId: "ts-1" });
    prismaMock.teamSeason.findFirst.mockResolvedValue({ id: "ts-1" });
    prismaMock.playerSquadMember.findMany.mockResolvedValue([]);
    prismaMock.trainerTeamMember.findMany.mockResolvedValue([]);

    const { notifyPersonalDashboardForTrainingSession } = await import(
      "@/lib/dashboard/read-model/invalidate-audience"
    );

    await notifyPersonalDashboardForTrainingSession("tenant-a", "session-1");

    expect(prismaMock.trainingSession.findFirst).toHaveBeenCalled();
  });
});

describe("SCE-PERF-DASHBOARD-02 domain hook wiring", () => {
  it("training lifecycle service references dashboard invalidation", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(
        `${process.cwd()}/lib/training/session-lifecycle-service.ts`,
        "utf8",
      ),
    );
    expect(source).toContain("notifyPersonalDashboardForTrainingSession");
  });

  it("task service schedules rebuild on create path", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(`${process.cwd()}/lib/tasks/task-service.ts`, "utf8"),
    );
    expect(source).toContain("schedulePersonalDashboardRebuildForTaskUsers");
    expect(source).toContain("notifyPersonalDashboardDomainMutation");
  });

  it("requirement activation notifies audience persons", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(`${process.cwd()}/lib/requirements/requirement-service.ts`, "utf8"),
    );
    expect(source).toContain("notifyPersonalDashboardForPersonIds");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getInitiativeById: vi.fn(),
  listInitiativeTargetLinks: vi.fn(),
  getTaskServiceContext: vi.fn(),
  buildTaskReadWhere: vi.fn(() => ({})),
  taskFindMany: vi.fn(),
  taskCount: vi.fn(),
  milestoneFindMany: vi.fn(),
  meetingAgendaItemFindMany: vi.fn(),
  meetingDecisionFindMany: vi.fn(),
}));

vi.mock("@/lib/initiatives/queries", () => ({
  getInitiativeById: mocks.getInitiativeById,
}));

vi.mock("@/lib/club-development/initiative-target-links", () => ({
  listInitiativeTargetLinks: mocks.listInitiativeTargetLinks,
}));

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: mocks.getTaskServiceContext,
}));

vi.mock("@/lib/tasks/visibility", () => ({
  buildTaskReadWhere: mocks.buildTaskReadWhere,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findMany: mocks.taskFindMany, count: mocks.taskCount },
    initiativeMilestone: { findMany: mocks.milestoneFindMany },
    meetingAgendaItem: { findMany: mocks.meetingAgendaItemFindMany },
    meetingDecision: { findMany: mocks.meetingDecisionFindMany },
  },
}));

import { loadVorhabenWorkspacePanel } from "../vorhaben-workspace-card";

function actorWith(perms: string[]): ActorContext {
  return {
    userId: "user-1",
    tenantId: "tenant-1",
    permissionKeys: perms,
    orgUnitIds: [],
    roleKeys: [],
    teamIds: [],
    personId: null,
  } as ActorContext;
}

describe("loadVorhabenWorkspacePanel root tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInitiativeById.mockResolvedValue({
      id: "init-1",
      slug: "alpha",
      reviewStage: null,
    });
    mocks.listInitiativeTargetLinks.mockResolvedValue([]);
    mocks.milestoneFindMany.mockResolvedValue([]);
    mocks.meetingAgendaItemFindMany.mockResolvedValue([]);
    mocks.meetingDecisionFindMany.mockResolvedValue([]);
    mocks.getTaskServiceContext.mockResolvedValue({ tenantId: "tenant-1" });
  });

  it("discloses truncation when more than 40 authorised root tasks exist", async () => {
    const displayed = Array.from({ length: 40 }, (_, i) => ({
      id: `t${i}`,
      title: `Task ${i}`,
      status: TaskStatus.OPEN,
    }));
    mocks.taskFindMany.mockResolvedValue(displayed);
    mocks.taskCount.mockResolvedValue(55);

    const panel = await loadVorhabenWorkspacePanel(
      actorWith([PERMISSIONS.INITIATIVES_VIEW, PERMISSIONS.TASKS_VIEW]),
      "init-1",
    );

    expect(panel?.rootTasks).toHaveLength(40);
    expect(panel?.rootTaskTotalCount).toBe(55);
    expect(panel?.rootTasksTruncated).toBe(true);
    expect(panel?.allRootTasksHref).toContain("initiativeId=init-1");
    expect(panel?.allRootTasksHref).toContain("ansicht=aufgaben");
  });
});
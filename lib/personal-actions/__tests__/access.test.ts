import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../sources/requirement-obligations", () => ({
  countOpenRequirementObligationsForUser: vi.fn().mockResolvedValue(0),
}));

import { prisma } from "@/lib/db/prisma";
import {
  resolvePersonalActionsModuleCapabilities,
  resolvePersonalParticipationNavCapability,
} from "../access";

function mockParticipationCapable(capable: boolean) {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ capable }] as never);
}

describe("AUFGABEN-05-UI — personal actions access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — parent-only participation capability without tasks.view", async () => {
    mockParticipationCapable(true);

    const capable = await resolvePersonalParticipationNavCapability({
      tenantId: "tenant-a",
      userId: "guardian-user",
    });

    expect(capable).toBe(true);

    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: "tenant-a",
      userId: "guardian-user",
      permissionKeys: [],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });

    expect(caps.taskManagement).toBe(false);
    expect(caps.personalInbox).toBe(true);
    expect(caps.moduleAccess).toBe(true);
  });

  it("F — vice president + trainer + parent composes capabilities", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: "tenant-a",
      userId: "vp-user",
      permissionKeys: [
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TASKS_VIEW_ALL,
        PERMISSIONS.TASKS_MANAGE,
        PERMISSIONS.TRAININGS_MANAGE,
      ],
      participationNavCapable: true,
      requirementRecipientCapable: false,
    });

    expect(caps.taskManagement).toBe(true);
    expect(caps.personalInbox).toBe(true);
    expect(caps.moduleAccess).toBe(true);
  });

  it("I — guardian capability remains when zero open obligations (nav question only)", async () => {
    mockParticipationCapable(true);

    const capable = await resolvePersonalParticipationNavCapability({
      tenantId: "tenant-a",
      userId: "guardian-user",
    });
    expect(capable).toBe(true);
  });

  it("N — cross-tenant guardian relationship does not grant tenant-a nav capability", async () => {
    mockParticipationCapable(false);

    const capable = await resolvePersonalParticipationNavCapability({
      tenantId: "tenant-a",
      userId: "user-with-tenant-b-guardian-only",
    });
    expect(capable).toBe(false);
  });

  it("O — cross-tenant squad membership does not grant tenant-a nav capability", async () => {
    mockParticipationCapable(false);

    const capable = await resolvePersonalParticipationNavCapability({
      tenantId: "tenant-a",
      userId: "player-tenant-b-only",
    });
    expect(capable).toBe(false);
  });

  it("S — user without task or participation capability has no module access", () => {
    const caps = resolvePersonalActionsModuleCapabilities({
      tenantId: "tenant-a",
      userId: "plain-user",
      permissionKeys: [PERMISSIONS.EVENTS_VIEW],
      participationNavCapable: false,
      requirementRecipientCapable: false,
    });

    expect(caps.moduleAccess).toBe(false);
  });
});

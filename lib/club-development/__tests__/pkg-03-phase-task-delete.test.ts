import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteDevelopmentSprintPermanently,
  getDevelopmentSprintDeletionImpact,
} from "@/lib/club-development/sprints/sprint-delete-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const sprintFindFirst = vi.fn();
const sprintDelete = vi.fn();
const membershipCount = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    developmentSprint: {
      findFirst: (...args: unknown[]) => sprintFindFirst(...args),
      delete: (...args: unknown[]) => sprintDelete(...args),
    },
    developmentSprintTaskMembership: {
      count: (...args: unknown[]) => membershipCount(...args),
    },
  },
}));

describe("PKG-03 — Umsetzungsphase & Aufgabe deletion (isolated fixtures)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes deletion permissions and inline confirm surfaces (no Dialog)", () => {
    expect(PERMISSIONS.TASKS_DELETE).toBe("tasks.delete");
    expect(PERMISSIONS.INITIATIVES_DELETE).toBe("initiatives.delete");
    expect(readSrc("app/api/club-development/sprints/[id]/permanent/route.ts")).toContain(
      "INITIATIVES_DELETE",
    );
    expect(readSrc("app/api/club-development/sprints/[id]/permanent/route.ts")).toContain(
      "hasTenantDeletionAuthority",
    );
    expect(readSrc("app/api/tasks/[taskId]/permanent/route.ts")).toContain("TASKS_DELETE");
    expect(readSrc("components/sce/club-development/SceInlineDestructiveConfirm.tsx")).not.toMatch(
      /from ["']@\/components\/ui\/Dialog/,
    );
    expect(readSrc("components/admin/club-development/DevelopmentSprintSecondaryDelete.tsx")).toContain(
      "buildVorhabenUndUmsetzungHref",
    );
    expect(readSrc("components/admin/aufgaben/TaskDeleteControl.tsx")).toContain("returnTo");
    expect(readSrc("lib/tasks/task-workspace-page.ts")).toContain("parseTaskWorkspaceReturnTo");
    expect(readSrc("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("hasOverflowMenu");
    expect(readSrc("components/admin/aufgaben/TaskWorkspace.tsx")).toContain(
      "task-delete-permission-gap-hint",
    );
    expect(readSrc("lib/tasks/task-deletion-workspace-policy.ts")).toContain(
      "resolveTaskDeletionWorkspaceSignals",
    );
    expect(readSrc("prisma/seed.ts")).toContain('"tasks.delete"');
  });

  it("phase deletion impact reports tasks preserved", async () => {
    sprintFindFirst.mockResolvedValue({ id: "sprint-1" });
    membershipCount.mockResolvedValue(3);

    const impact = await getDevelopmentSprintDeletionImpact("sprint-1", "tenant-1");
    expect(impact).toEqual({ activeMembershipCount: 3, tasksPreserved: true });
  });

  it("rejects cross-tenant sprint delete (tenant-bound query)", async () => {
    sprintFindFirst.mockResolvedValue(null);

    const result = await deleteDevelopmentSprintPermanently("sprint-1", "tenant-other");
    expect(result).toBeNull();
    expect(sprintDelete).not.toHaveBeenCalled();
    expect(sprintFindFirst).toHaveBeenCalledWith({
      where: { id: "sprint-1", tenantId: "tenant-other" },
      select: { title: true },
    });
  });

  it("deleteDevelopmentSprintPermanently removes sprint only", async () => {
    sprintFindFirst.mockResolvedValue({ title: "Phase A" });
    membershipCount.mockResolvedValue(2);
    sprintDelete.mockResolvedValue({ id: "sprint-1" });

    const result = await deleteDevelopmentSprintPermanently("sprint-1", "tenant-1");
    expect(sprintDelete).toHaveBeenCalledWith({ where: { id: "sprint-1", tenantId: "tenant-1" } });
    expect(result?.impact.tasksPreserved).toBe(true);
  });
});
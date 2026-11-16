import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { VisibilityScope } from "@prisma/client";
import type { ActorContext } from "@/lib/visibility/actor-context";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

const prismaMocks = vi.hoisted(() => ({
  meetingFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meeting: {
      findFirst: (...args: unknown[]) => prismaMocks.meetingFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/visibility/visibility-filter", () => ({
  canSeeEntity: vi.fn(() => true),
  buildVisibilityWhere: vi.fn(() => ({})),
  applyVisibilityFilter: vi.fn((rows: unknown[]) => rows),
}));

const actorWithAccess = (tenantId = "tenant-fixture-1"): ActorContext => ({
  userId: "user-1",
  roleKeys: ["board_member"],
  permissionKeys: [PERMISSIONS.MEETINGS_VIEW],
  tenantId,
  orgUnitIds: [],
  targetGroupIds: [],
});

describe("meeting detail loader regression (SCE-CD-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("page calls notFound when getMeetingBySlug returns null — never legacy mock layout", () => {
    const page = readSrc("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx");
    expect(page).toContain("if (!dbMeeting) notFound()");
    expect(page).toContain("requireActiveTenantId");
    expect(page).not.toMatch(/dbMeeting\?\.title \?\? "Sitzung"/);
    expect(page).not.toContain("xl:grid-cols-[minmax(0,1.85fr)_360px]");
  });

  it("VereinsleitungMeetingDetail only mounts MeetingWorkspace", () => {
    const detail = readSrc("components/admin/vereinsleitung/VereinsleitungMeetingDetail.tsx");
    expect(detail).toContain("MeetingWorkspace");
    expect(detail).not.toContain("VereinsleitungMeetingAgendaCard");
    expect(detail).not.toContain("xl:grid-cols-[minmax(0,1.85fr)_360px]");
  });

  it("legacy meeting detail cards omit April 2024 and Michael Weber sample copy", () => {
    for (const file of [
      "components/admin/vereinsleitung/VereinsleitungMeetingInfoCard.tsx",
      "components/admin/vereinsleitung/VereinsleitungMeetingParticipantsCard.tsx",
      "components/admin/vereinsleitung/VereinsleitungMeetingAgendaCard.tsx",
      "components/admin/vereinsleitung/VereinsleitungMeetingDecisionsCard.tsx",
      "components/admin/vereinsleitung/VereinsleitungMeetingActionsCard.tsx",
    ]) {
      const src = readSrc(file);
      expect(src).not.toContain("16. April 2024");
      expect(src).not.toContain("Michael Weber");
      expect(src).not.toContain("MOCK_");
    }
  });

  describe("getMeetingBySlug", () => {
    it("returns null without tenant on actor", async () => {
      const { getMeetingBySlug } = await import("@/lib/meetings/queries");
      const actor: ActorContext = { ...actorWithAccess(), tenantId: undefined };
      const result = await getMeetingBySlug("fixture-board-sitzung", actor);
      expect(result).toBeNull();
      expect(prismaMocks.meetingFindFirst).not.toHaveBeenCalled();
    });

    it("returns null without meetings.view/manage permission", async () => {
      const { getMeetingBySlug } = await import("@/lib/meetings/queries");
      const actor: ActorContext = {
        ...actorWithAccess(),
        permissionKeys: [PERMISSIONS.TASKS_VIEW],
      };
      const result = await getMeetingBySlug("fixture-board-sitzung", actor);
      expect(result).toBeNull();
      expect(prismaMocks.meetingFindFirst).not.toHaveBeenCalled();
    });

    it("returns null when slug not in tenant", async () => {
      const { getMeetingBySlug } = await import("@/lib/meetings/queries");
      prismaMocks.meetingFindFirst.mockResolvedValue(null);
      const result = await getMeetingBySlug("missing-slug", actorWithAccess());
      expect(result).toBeNull();
    });

    it("returns meeting row when actor may see it", async () => {
      const { getMeetingBySlug } = await import("@/lib/meetings/queries");
      prismaMocks.meetingFindFirst.mockResolvedValue({
        id: "m1",
        slug: "fixture-board-sitzung",
        title: "Fixture Vorstandssitzung",
        visibilityScope: VisibilityScope.ORGANISATION,
        createdByUserId: "user-1",
        visibleRoleRefs: [],
        visibleUserRefs: [],
        visibleTeamRefs: [],
        visibleOrgUnitRefs: [],
        visiblePersonRefs: [],
      });
      const result = await getMeetingBySlug("fixture-board-sitzung", actorWithAccess());
      expect(result?.title).toBe("Fixture Vorstandssitzung");
    });
  });
});
/**
 * AUFGABEN-06G9 — personal Requirement execution UX (R1–R14).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskStatus } from "@prisma/client";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const mocks = vi.hoisted(() => ({
  authorizedPersonIds: vi.fn(),
  recipientFindFirst: vi.fn(),
  recipientFindMany: vi.fn(),
  personFindFirst: vi.fn(),
  acknowledge: vi.fn(),
  recipientCount: vi.fn(),
  creatorLabel: vi.fn(),
  taskList: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: mocks.authorizedPersonIds,
  assertActorCanRespondForPerson: vi.fn().mockResolvedValue({ actorPersonId: "person-self" }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: { findFirst: mocks.personFindFirst },
    requirementRecipient: {
      findFirst: mocks.recipientFindFirst,
      findMany: mocks.recipientFindMany,
      count: mocks.recipientCount,
    },
  },
}));

vi.mock("@/lib/requirements/management-service", () => ({
  resolveRequirementCreatorLabel: mocks.creatorLabel,
}));

vi.mock("@/lib/tasks/task-service", () => ({
  listMyTasks: mocks.taskList,
  countMyOpenTasks: vi.fn().mockResolvedValue(0),
}));

import { requirementPersonalActionSource } from "@/lib/personal-actions/sources/requirement-source";
import { loadPersonalActions } from "@/lib/personal-actions/load-personal-actions";
import { mapPersonalActionToListItem } from "@/lib/personal-actions/presentation";
import { submitRequirementPersonalAction } from "@/lib/personal-actions/submit-requirement-response";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";
import { personalRequirementExecutionHref } from "@/lib/requirements/personal-navigation";
import { loadPersonalRequirementExecutionView } from "@/lib/requirements/personal-execution-service";
import {
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
} from "@/lib/requirements/requirement-authorization";
import { resolveRequirementRecipientManagementStatus } from "@/lib/requirements/recipient-progress-presentation";
import { requirementPersonalExecutionHref } from "@/lib/notifications/deduplication";

vi.mock("@/lib/requirements/requirement-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/requirements/requirement-service")>();
  return {
    ...actual,
    acknowledgeRequirementRecipient: mocks.acknowledge,
  };
});

vi.mock("@/lib/personal-actions/sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: vi.fn().mockResolvedValue([]),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn().mockResolvedValue({ platform: [], tenant: [] }),
}));

const TENANT = "tenant-a";
const USER_SELF = "user-self";
const USER_OTHER = "user-other";
const USER_GUARDIAN = "user-guardian";
const PERSON_SELF = "person-self";
const PERSON_CHILD = "person-child";
const RECIP_ID = "recip-1";
const REQ_ID = "req-1";
const NOW = new Date("2026-09-22T12:00:00.000Z");

const ctx = {
  tenantId: TENANT,
  userId: USER_SELF,
  permissionKeys: [] as string[],
};

function openRecipientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RECIP_ID,
    tenantId: TENANT,
    requirementId: REQ_ID,
    subjectPersonId: PERSON_SELF,
    resolutionStatus: "OPEN",
    responseValue: null,
    respondedAt: null,
    respondedByUserId: null,
    responseActorPersonId: null,
    removedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    requirement: {
      id: REQ_ID,
      title: "Handbuch bestätigen",
      description: "Bitte lesen und bestätigen.",
      status: "ACTIVE",
      responseMode: "ACKNOWLEDGE",
      dueAt: new Date("2026-09-30T00:00:00.000Z"),
      createdAt: NOW,
      activatedAt: NOW,
      createdByUserId: "creator-user",
    },
    subjectPerson: {
      id: PERSON_SELF,
      displayName: "Alex",
      firstName: "Alex",
      lastName: "Member",
    },
    responseActorPerson: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizedPersonIds.mockResolvedValue([PERSON_SELF]);
  mocks.personFindFirst.mockResolvedValue({ id: PERSON_SELF });
  mocks.creatorLabel.mockResolvedValue("Trainer Admin");
  mocks.recipientFindFirst.mockImplementation(async () => openRecipientRow());
  mocks.recipientFindMany.mockResolvedValue([
    {
      id: RECIP_ID,
      requirementId: REQ_ID,
      subjectPersonId: PERSON_SELF,
      requirement: {
        title: "Handbuch bestätigen",
        description: null,
        dueAt: new Date("2026-09-30T00:00:00.000Z"),
      },
      subjectPerson: {
        id: PERSON_SELF,
        displayName: "Alex",
        firstName: "Alex",
        lastName: "Member",
      },
    },
  ]);
  mocks.recipientCount.mockResolvedValue(1);
  mocks.taskList.mockResolvedValue([]);
});

describe("AUFGABEN-06G9 — personal inbox & navigation", () => {
  it("R1 — direct recipient sees open Requirement with personal execution href", async () => {
    const actions = await requirementPersonalActionSource.loadActionable(ctx);
    expect(actions).toHaveLength(1);
    expect(actions[0].href).toBe(personalRequirementExecutionHref(RECIP_ID));
    expect(actions[0].href).not.toContain("/anforderungen/");
  });

  it("R11 — overdue display is derived in list presentation", async () => {
    mocks.recipientFindMany.mockResolvedValue([
      {
        id: RECIP_ID,
        requirementId: REQ_ID,
        subjectPersonId: PERSON_SELF,
        requirement: {
          title: "Handbuch",
          description: null,
          dueAt: new Date("2026-09-01T00:00:00.000Z"),
        },
        subjectPerson: {
          id: PERSON_SELF,
          displayName: "Alex",
          firstName: "Alex",
          lastName: "Member",
        },
      },
    ]);

    const actions = await requirementPersonalActionSource.loadActionable({
      ...ctx,
      now: NOW,
    });
    const item = mapPersonalActionToListItem(
      actions[0],
      { locale: "de-CH", timezone: "Europe/Zurich" },
      "de-CH",
      "Europe/Zurich",
    );
    expect(item.metaLine).toMatch(/Überfällig/);
    expect(item.inlineRequirementReady).toBe(false);
    expect(item.href).toBeTruthy();
  });
});

describe("AUFGABEN-06G9 — personal execution read model", () => {
  it("R1/R4 — execution view exposes open status and creator", async () => {
    const view = await loadPersonalRequirementExecutionView(
      ctx,
      RECIP_ID,
      "de-CH",
      "Europe/Zurich",
      NOW,
    );
    expect(view.canRespond).toBe(true);
    expect(view.creatorLabel).toBe("Trainer Admin");
    expect(view.managementStatus).toBe("OPEN");
    expect(view.personalActionId).toBe(buildRequirementPersonalActionId(RECIP_ID));
  });

  it("R11 — overdue derived in execution view", async () => {
    mocks.recipientFindFirst.mockResolvedValue(
      openRecipientRow({
        requirement: {
          ...openRecipientRow().requirement,
          dueAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      }),
    );
    const view = await loadPersonalRequirementExecutionView(
      ctx,
      RECIP_ID,
      "de-CH",
      "Europe/Zurich",
      NOW,
    );
    expect(view.managementStatus).toBe("OVERDUE");
  });

  it("completed view shows response state without respond action", async () => {
    mocks.recipientFindFirst.mockResolvedValue(
      openRecipientRow({
        resolutionStatus: "RESOLVED",
        responseValue: "ACKNOWLEDGED",
        respondedAt: NOW,
        respondedByUserId: USER_SELF,
        responseActorPersonId: PERSON_SELF,
        responseActorPerson: {
          id: PERSON_SELF,
          displayName: "Alex",
          firstName: "Alex",
          lastName: "Member",
        },
      }),
    );
    const view = await loadPersonalRequirementExecutionView(
      ctx,
      RECIP_ID,
      "de-CH",
      "Europe/Zurich",
      NOW,
    );
    expect(view.canRespond).toBe(false);
    expect(view.responseLabel).toBe("Bestätigt");
    expect(view.managementStatus).toBe("COMPLETED");
  });
});

describe("AUFGABEN-06G9 — acknowledgement & consistency", () => {
  it("R2/R3/R4/R5 — recipient acknowledges via canonical service", async () => {
    mocks.acknowledge.mockResolvedValue({
      id: RECIP_ID,
      resolutionStatus: "RESOLVED",
      respondedAt: NOW.toISOString(),
      respondedByUserId: USER_SELF,
      responseActorPersonId: PERSON_SELF,
    });

    const result = await submitRequirementPersonalAction(ctx, {
      personalActionId: buildRequirementPersonalActionId(RECIP_ID),
      requirementRecipientId: RECIP_ID,
    });
    expect(result.ok).toBe(true);
    expect(mocks.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_SELF }),
      RECIP_ID,
    );
  });

  it("R12 — completed Requirement no longer actionable in PersonalAction source", async () => {
    mocks.recipientFindMany.mockResolvedValue([]);
    const actions = await requirementPersonalActionSource.loadActionable(ctx);
    expect(actions).toHaveLength(0);
  });

  it("R13 — guardian path uses canonical ack adapter", async () => {
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.acknowledge.mockResolvedValue({
      id: RECIP_ID,
      respondedByUserId: USER_GUARDIAN,
      responseActorPersonId: "guardian-person",
    });
    await submitRequirementPersonalAction(
      { tenantId: TENANT, userId: USER_GUARDIAN, permissionKeys: [] },
      {
        personalActionId: buildRequirementPersonalActionId(RECIP_ID),
        requirementRecipientId: RECIP_ID,
      },
    );
    expect(mocks.acknowledge).toHaveBeenCalled();
  });
});

describe("AUFGABEN-06G9 — authorization", () => {
  it("R7 — unrelated same-tenant person cannot read/respond", () => {
    const recipient = {
      tenantId: TENANT,
      requirementId: REQ_ID,
      subjectPersonId: PERSON_SELF,
      removedAt: null,
    };
    expect(
      canReadOwnRequirementRecipient(
        { tenantId: TENANT, userId: USER_OTHER, permissionKeys: [] },
        recipient,
        [],
      ),
    ).toBe(false);
    expect(
      canRespondToRequirementRecipient(
        { tenantId: TENANT, userId: USER_OTHER, permissionKeys: [] },
        recipient,
        [],
      ),
    ).toBe(false);
  });

  it("R8 — cross-tenant recipient id is not visible", async () => {
    mocks.recipientFindFirst.mockResolvedValue(null);
    await expect(
      loadPersonalRequirementExecutionView(ctx, RECIP_ID, "de-CH", "Europe/Zurich", NOW),
    ).rejects.toMatchObject({ name: "RequirementRecipientNotFoundError" });
  });

  it("R9 — removed recipient cannot access execution surface", async () => {
    mocks.recipientFindFirst.mockResolvedValue(
      openRecipientRow({ removedAt: NOW }),
    );
    await expect(
      loadPersonalRequirementExecutionView(ctx, RECIP_ID, "de-CH", "Europe/Zurich", NOW),
    ).rejects.toMatchObject({ name: "RequirementForbiddenError" });
  });

  it("R10 — closed requirement blocks respond", async () => {
    mocks.recipientFindFirst.mockResolvedValue(
      openRecipientRow({
        requirement: { ...openRecipientRow().requirement, status: "CLOSED" },
      }),
    );
    const view = await loadPersonalRequirementExecutionView(
      ctx,
      RECIP_ID,
      "de-CH",
      "Europe/Zurich",
      NOW,
    );
    expect(view.canRespond).toBe(false);
    expect(view.respondBlockedMessage).toMatch(/abgeschlossen/);
  });
});

describe("AUFGABEN-06G9 — tasks regression & static contracts", () => {
  it("R14 — task PersonalAction behaviour unchanged in combined load", async () => {
    mocks.taskList.mockResolvedValue([
      {
        id: "task-1",
        title: "Meine Aufgabe",
        status: TaskStatus.OPEN,
        dueAt: null,
        assigneeUserId: USER_SELF,
      },
    ]);
    const actions = await loadPersonalActions({
      tenantId: TENANT,
      userId: USER_SELF,
      permissionKeys: [PERMISSIONS.TASKS_VIEW],
      now: NOW,
    });
    expect(actions.some((a) => a.sourceType === "TASK")).toBe(true);
  });

  it("personal route exists and management matrix stays separate", () => {
    expect(read("app/(admin)/dashboard/aufgaben/anforderung/[recipientId]/page.tsx")).toMatch(
      /PersonalRequirementExecutionWorkspace/,
    );
    expect(read("components/admin/aufgaben/RequirementDetailWorkspace.tsx")).not.toMatch(
      /PersonalRequirementExecutionWorkspace/,
    );
  });

  it("notification execution href avoids management routes", () => {
    const href = requirementPersonalExecutionHref(RECIP_ID);
    expect(href).toContain("/anforderung/");
    expect(href).not.toContain("/anforderungen/");
  });

  it("management aggregate uses canonical recipient resolution status", () => {
    expect(
      resolveRequirementRecipientManagementStatus({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2026-09-30"),
        resolutionStatus: "RESOLVED",
        removedAt: null,
        now: NOW,
      }),
    ).toBe("COMPLETED");
  });
});

describe("AUFGABEN-06G9 — workspace boundary", () => {
  it("WORKSPACE_DEPENDENCY — no document execution invented in personal surface", () => {
    const workspace = read("components/admin/aufgaben/PersonalRequirementExecutionWorkspace.tsx");
    expect(workspace).not.toMatch(/WorkspaceDocument|documentVersion/i);
    expect(read("prisma/schema.prisma")).not.toMatch(/requirementDocument/i);
  });
});

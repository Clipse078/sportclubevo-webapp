/**
 * AUFGABEN-06G1 — Requirements foundation acceptance (R1–R38, scale).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const mocks = vi.hoisted(() => ({
  requirementFindFirst: vi.fn(),
  requirementFindMany: vi.fn(),
  requirementCreate: vi.fn(),
  requirementUpdate: vi.fn(),
  requirementUpdateMany: vi.fn(),
  draftDeleteMany: vi.fn(),
  draftCreateMany: vi.fn(),
  recipientFindFirst: vi.fn(),
  recipientFindMany: vi.fn(),
  recipientCreateMany: vi.fn(),
  recipientUpdate: vi.fn(),
  recipientCount: vi.fn(),
  personFindMany: vi.fn(),
  taskCreate: vi.fn(),
  participationCreate: vi.fn(),
  transaction: vi.fn(),
  assertActor: vi.fn(),
  authorizedPersonIds: vi.fn(),
}));

vi.mock("@/lib/participation/authorization", () => ({
  assertActorCanRespondForPerson: mocks.assertActor,
  getAuthorizedPersonIdsForUser: mocks.authorizedPersonIds,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    requirement: {
      findFirst: mocks.requirementFindFirst,
      findMany: mocks.requirementFindMany,
      create: mocks.requirementCreate,
      update: mocks.requirementUpdate,
      updateMany: mocks.requirementUpdateMany,
    },
    requirementDraftAudiencePerson: {
      deleteMany: mocks.draftDeleteMany,
      createMany: mocks.draftCreateMany,
    },
    requirementRecipient: {
      findFirst: mocks.recipientFindFirst,
      findMany: mocks.recipientFindMany,
      createMany: mocks.recipientCreateMany,
      update: mocks.recipientUpdate,
      count: mocks.recipientCount,
    },
    person: { findMany: mocks.personFindMany },
    task: { create: mocks.taskCreate },
    participationResponse: { create: mocks.participationCreate },
    $transaction: mocks.transaction,
  },
}));

import {
  canCreateRequirement,
  canManageRequirement,
  canReadRequirement,
  canReadRequirementAggregate,
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
  taskPermissionsGrantRequirementManagement,
} from "../requirement-authorization";
import {
  acknowledgeRequirementRecipient,
  activateRequirement,
  assertValidRequirementStatusTransition,
  cancelRequirement,
  closeRequirement,
  createRequirementDraft,
  getRequirementAggregate,
  getOwnRequirementRecipient,
  listRequirementRecipients,
  setRequirementDraftAudience,
  updateRequirementDraft,
} from "../requirement-service";
import { isRequirementRecipientOverdue } from "../requirement-aggregate";
import {
  RequirementForbiddenError,
  RequirementValidationError,
} from "../errors";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const MANAGER = "user-manager";
const MEMBER = "user-member";
const REQ_ID = "req-1";
const RECIP_ID = "recip-1";
const PERSON_A = "person-a";
const PERSON_B = "person-b";

function managerCtx(overrides: Partial<{ tenantId: string; userId: string; permissionKeys: string[] }> = {}) {
  return {
    tenantId: TENANT_A,
    userId: MANAGER,
    permissionKeys: [
      PERMISSIONS.REQUIREMENTS_VIEW,
      PERMISSIONS.REQUIREMENTS_CREATE,
      PERMISSIONS.REQUIREMENTS_MANAGE,
      PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
    ],
    ...overrides,
  };
}

function memberCtx() {
  return { tenantId: TENANT_A, userId: MEMBER, permissionKeys: [] as string[] };
}

function tasksOnlyCtx() {
  return {
    tenantId: TENANT_A,
    userId: MEMBER,
    permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_MANAGE],
  };
}

function requirementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REQ_ID,
    tenantId: TENANT_A,
    title: "Handbuch bestätigen",
    description: null,
    status: "DRAFT",
    responseMode: "ACKNOWLEDGE",
    dueAt: null,
    activatedAt: null,
    closedAt: null,
    cancelledAt: null,
    createdByUserId: MANAGER,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    draftAudience: [{ personId: PERSON_A }],
    ...overrides,
  };
}

function recipientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RECIP_ID,
    tenantId: TENANT_A,
    requirementId: REQ_ID,
    subjectPersonId: PERSON_A,
    resolutionStatus: "OPEN",
    responseValue: null,
    respondedAt: null,
    respondedByUserId: null,
    responseActorPersonId: null,
    removedAt: null,
    createdAt: new Date("2026-09-01T11:00:00.000Z"),
    updatedAt: new Date("2026-09-01T11:00:00.000Z"),
    requirement: { status: "ACTIVE", responseMode: "ACKNOWLEDGE", tenantId: TENANT_A },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({
      requirement: {
        findFirst: mocks.requirementFindFirst,
        updateMany: mocks.requirementUpdateMany,
        update: mocks.requirementUpdate,
      },
      requirementRecipient: { createMany: mocks.recipientCreateMany },
      requirementDraftAudiencePerson: {
        deleteMany: mocks.draftDeleteMany,
        createMany: mocks.draftCreateMany,
      },
    }),
  );
  mocks.personFindMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    where.id.in.map((id) => ({ id })),
  );
});

describe("AUFGABEN-06G1 schema (R1–R7 foundation)", () => {
  it("R1 Requirement models and enums are present", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model Requirement\b/);
    expect(schema).toMatch(/model RequirementRecipient\b/);
    expect(schema).toMatch(/enum RequirementStatus/);
    expect(schema).toMatch(/enum RequirementResponseMode/);
  });

  it("R4/R6 draft audience uses relational Person rows", () => {
    expect(read("prisma/schema.prisma")).toMatch(/model RequirementDraftAudiencePerson/);
  });

  it("R7 unique requirementId + subjectPersonId", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /@@unique\(\[requirementId, subjectPersonId\]\)/,
    );
  });

  it("migration is additive", () => {
    const sql = read(
      "prisma/migrations/20260922120000_aufgaben_06g1_requirements_foundation/migration.sql",
    );
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN/);
    expect(sql).toMatch(/RequirementRecipient_requirementId_subjectPersonId_key/);
  });
});

describe("AUFGABEN-06G1 authorization & privacy (R2–R3, R12–R18)", () => {
  const record = { tenantId: TENANT_A, createdByUserId: MANAGER };

  it("R1/R2 manager can create; unauthorized cannot", () => {
    expect(canCreateRequirement(managerCtx())).toBe(true);
    expect(canCreateRequirement(memberCtx())).toBe(false);
  });

  it("R15 aggregate requires requirements.view_aggregate", () => {
    expect(canReadRequirementAggregate(managerCtx(), record)).toBe(true);
    expect(
      canReadRequirementAggregate(
        { ...managerCtx(), permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW] },
        record,
      ),
    ).toBe(false);
  });

  it("R16–R18 tasks.* does not grant requirement aggregate", () => {
    expect(canReadRequirementAggregate(tasksOnlyCtx(), record)).toBe(false);
    expect(canManageRequirement(tasksOnlyCtx(), record)).toBe(false);
    expect(taskPermissionsGrantRequirementManagement(tasksOnlyCtx())).toBe(true);
  });

  it("R12/R13 recipient can read own obligation only", () => {
    const recipient = {
      tenantId: TENANT_A,
      requirementId: REQ_ID,
      subjectPersonId: PERSON_A,
      removedAt: null,
    };
    expect(canReadOwnRequirementRecipient(memberCtx(), recipient, [PERSON_A])).toBe(true);
    expect(canReadOwnRequirementRecipient(memberCtx(), recipient, [PERSON_B])).toBe(false);
  });

  it("R3 foreign tenant denied at read", () => {
    expect(canReadRequirement(managerCtx(), { tenantId: TENANT_B, createdByUserId: MANAGER })).toBe(
      false,
    );
  });
});

describe("AUFGABEN-06G1 draft & activation (R4–R11, R29, R35–R36)", () => {
  it("R1 creates DRAFT requirement", async () => {
    mocks.requirementCreate.mockImplementation(async ({ data }: { data: { title: string } }) =>
      requirementRow({ title: data.title, draftAudience: [] }),
    );
    const dto = await createRequirementDraft(managerCtx(), { title: "  Campaign  " });
    expect(dto.title).toBe("Campaign");
    expect(mocks.taskCreate).not.toHaveBeenCalled();
  });

  it("R2 unauthorized cannot create", async () => {
    await expect(createRequirementDraft(memberCtx(), { title: "X" })).rejects.toBeInstanceOf(
      RequirementForbiddenError,
    );
  });

  it("R5 foreign tenant person rejected on audience set", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow());
    mocks.personFindMany.mockResolvedValue([]);
    await expect(
      setRequirementDraftAudience(managerCtx(), REQ_ID, [PERSON_A]),
    ).rejects.toBeInstanceOf(Error);
  });

  it("R6 deduplicates person ids", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ draftAudience: [] }));
    mocks.draftDeleteMany.mockResolvedValue({ count: 0 });
    mocks.draftCreateMany.mockResolvedValue({ count: 1 });
    mocks.requirementFindFirst.mockResolvedValueOnce(requirementRow()).mockResolvedValueOnce(
      requirementRow({ draftAudience: [{ personId: PERSON_A }] }),
    );
    await setRequirementDraftAudience(managerCtx(), REQ_ID, [PERSON_A, PERSON_A]);
    expect(mocks.draftCreateMany).toHaveBeenCalledWith({
      data: [{ tenantId: TENANT_A, requirementId: REQ_ID, personId: PERSON_A }],
    });
  });

  it("R7 empty audience cannot activate", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ draftAudience: [] }));
    await expect(activateRequirement(managerCtx(), REQ_ID)).rejects.toBeInstanceOf(
      RequirementValidationError,
    );
  });

  it("R8–R11 activation creates recipients and sets ACTIVE atomically", async () => {
    mocks.requirementFindFirst
      .mockResolvedValueOnce(requirementRow())
      .mockResolvedValueOnce({ status: "DRAFT" })
      .mockResolvedValueOnce(requirementRow({ status: "ACTIVE", activatedAt: new Date(), draftAudience: [] }));
    mocks.requirementUpdateMany.mockResolvedValue({ count: 1 });
    mocks.recipientCreateMany.mockResolvedValue({ count: 1 });
    mocks.draftDeleteMany.mockResolvedValue({ count: 1 });

    const result = await activateRequirement(managerCtx(), REQ_ID);
    expect(mocks.recipientCreateMany).toHaveBeenCalled();
    expect(mocks.participationCreate).not.toHaveBeenCalled();
    expect(result.status).toBe("ACTIVE");
  });

  it("scale path deduplicates 501 person ids to 500 recipient rows", async () => {
    const personIds = Array.from({ length: 500 }, (_, i) => `person-${i}`);
    const withDup = [...personIds, personIds[0]!];
    mocks.requirementFindFirst
      .mockResolvedValueOnce(
        requirementRow({
          draftAudience: withDup.map((personId) => ({ personId })),
        }),
      )
      .mockResolvedValueOnce({ status: "DRAFT" })
      .mockResolvedValueOnce(
        requirementRow({ status: "ACTIVE", activatedAt: new Date(), draftAudience: [] }),
      );
    mocks.requirementUpdateMany.mockResolvedValue({ count: 1 });
    mocks.recipientCreateMany.mockResolvedValue({ count: 500 });
    mocks.draftDeleteMany.mockResolvedValue({ count: 1 });
    mocks.personFindMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({ id })),
    );
    await activateRequirement(managerCtx(), REQ_ID);
    const payload = mocks.recipientCreateMany.mock.calls[0]?.[0]?.data as
      | { subjectPersonId: string }[]
      | undefined;
    expect(payload?.length).toBe(500);
  });

  it("R11 repeated activation is idempotent", async () => {
    mocks.requirementFindFirst.mockResolvedValue(
      requirementRow({ status: "ACTIVE", activatedAt: new Date(), draftAudience: [] }),
    );
    const result = await activateRequirement(managerCtx(), REQ_ID);
    expect(result.status).toBe("ACTIVE");
    expect(mocks.recipientCreateMany).not.toHaveBeenCalled();
  });

  it("R29 ACTIVE audience cannot change via draft API", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    await expect(
      setRequirementDraftAudience(managerCtx(), REQ_ID, [PERSON_A]),
    ).rejects.toBeInstanceOf(RequirementValidationError);
  });
});

describe("AUFGABEN-06G1 response & lifecycle (R20–R31)", () => {
  it("R20–R25 acknowledge sets audit fields and is idempotent", async () => {
    const open = recipientRow();
    mocks.recipientFindFirst.mockResolvedValueOnce(open);
    mocks.assertActor.mockResolvedValue({ source: "PLAYER", actorPersonId: PERSON_A });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_A]);
    mocks.recipientUpdate.mockResolvedValue({
      ...open,
      resolutionStatus: "RESOLVED",
      responseValue: "ACKNOWLEDGED",
      respondedAt: new Date("2026-09-02T12:00:00.000Z"),
      respondedByUserId: MEMBER,
      responseActorPersonId: PERSON_A,
    });

    const resolved = await acknowledgeRequirementRecipient(memberCtx(), RECIP_ID);
    expect(resolved.resolutionStatus).toBe("RESOLVED");
    expect(resolved.responseValue).toBe("ACKNOWLEDGED");

    const prior = {
      ...open,
      resolutionStatus: "RESOLVED",
      responseValue: "ACKNOWLEDGED",
      respondedAt: new Date("2026-09-02T12:00:00.000Z"),
      respondedByUserId: MEMBER,
      responseActorPersonId: PERSON_A,
    };
    mocks.recipientFindFirst.mockResolvedValue(prior);
    mocks.assertActor.mockResolvedValue({ source: "PLAYER", actorPersonId: PERSON_A });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_A]);
    const replay = await acknowledgeRequirementRecipient(memberCtx(), RECIP_ID);
    expect(mocks.recipientUpdate).toHaveBeenCalledTimes(1);
    expect(replay.respondedAt).toBe(prior.respondedAt.toISOString());
  });

  it("R21 unrelated user cannot ACK", async () => {
    mocks.recipientFindFirst.mockResolvedValue(recipientRow());
    mocks.assertActor.mockRejectedValue(new Error("unauthorized"));
    await expect(acknowledgeRequirementRecipient(memberCtx(), RECIP_ID)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("R26 CLOSED rejects ACK", async () => {
    mocks.recipientFindFirst.mockResolvedValue(
      recipientRow({ requirement: { status: "CLOSED", responseMode: "ACKNOWLEDGE", tenantId: TENANT_A } }),
    );
    mocks.assertActor.mockResolvedValue({ source: "PLAYER", actorPersonId: PERSON_A });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_A]);
    await expect(acknowledgeRequirementRecipient(memberCtx(), RECIP_ID)).rejects.toBeInstanceOf(
      RequirementValidationError,
    );
  });

  it("R28 removed recipient rejects ACK", async () => {
    mocks.recipientFindFirst.mockResolvedValue(recipientRow({ removedAt: new Date() }));
    mocks.assertActor.mockResolvedValue({ source: "PLAYER", actorPersonId: PERSON_A });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_A]);
    await expect(acknowledgeRequirementRecipient(memberCtx(), RECIP_ID)).rejects.toBeInstanceOf(
      RequirementForbiddenError,
    );
  });

  it("R30/R31 close and cancel preserve recipient rows", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    mocks.requirementUpdate.mockResolvedValue(requirementRow({ status: "CLOSED", closedAt: new Date() }));
    await closeRequirement(managerCtx(), REQ_ID);
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    mocks.requirementUpdate.mockResolvedValue(
      requirementRow({ status: "CANCELLED", cancelledAt: new Date() }),
    );
    await cancelRequirement(managerCtx(), REQ_ID);
    expect(mocks.recipientUpdate).not.toHaveBeenCalled();
  });

  it("invalid lifecycle transitions rejected", () => {
    expect(() => assertValidRequirementStatusTransition("CLOSED", "ACTIVE")).toThrow(
      RequirementValidationError,
    );
    expect(() => assertValidRequirementStatusTransition("ACTIVE", "DRAFT")).toThrow(
      RequirementValidationError,
    );
  });

  it("R32 overdue is derived", () => {
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: new Date("2020-01-01"),
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
        now: new Date("2026-01-01"),
      }),
    ).toBe(true);
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "CLOSED",
        dueAt: new Date("2020-01-01"),
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
      }),
    ).toBe(false);
  });
});

describe("AUFGABEN-06G1 aggregate & list privacy (R14, R33–R34)", () => {
  it("R14 recipient cannot read aggregate", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    await expect(getRequirementAggregate(memberCtx(), REQ_ID)).rejects.toBeInstanceOf(
      RequirementForbiddenError,
    );
  });

  it("R33 aggregate counts via query-level counts", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    mocks.recipientCount
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(6);
    const agg = await getRequirementAggregate(managerCtx(), REQ_ID);
    expect(agg.totalRecipients).toBe(10);
    expect(agg.openCount).toBe(4);
    expect(agg.resolvedCount).toBe(6);
    expect(agg.resolvedPercent).toBe(60);
  });

  it("R34 zero-recipient aggregate safe", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    mocks.recipientCount.mockResolvedValue(0);
    const agg = await getRequirementAggregate(managerCtx(), REQ_ID);
    expect(agg.resolvedPercent).toBe(0);
  });

  it("R13 peer list denied for recipient context", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    await expect(
      listRequirementRecipients(memberCtx(), { requirementId: REQ_ID }),
    ).rejects.toBeInstanceOf(RequirementForbiddenError);
  });
});

describe("AUFGABEN-06G1 guardian authorization seam (G1–G10)", () => {
  const PERSON_CHILD = "person-child";
  const GUARDIAN_PERSON = "person-guardian";
  const GUARDIAN_USER = "user-guardian";

  it("G3 authorized guardian may ACK for child subject", async () => {
    const open = recipientRow({ subjectPersonId: PERSON_CHILD });
    mocks.recipientFindFirst.mockResolvedValueOnce(open);
    mocks.assertActor.mockResolvedValue({ source: "PARENT", actorPersonId: GUARDIAN_PERSON });
    mocks.authorizedPersonIds.mockResolvedValue([GUARDIAN_PERSON, PERSON_CHILD]);
    mocks.recipientUpdate.mockResolvedValue({
      ...open,
      resolutionStatus: "RESOLVED",
      responseValue: "ACKNOWLEDGED",
      respondedAt: new Date("2026-09-02T12:00:00.000Z"),
      respondedByUserId: GUARDIAN_USER,
      responseActorPersonId: GUARDIAN_PERSON,
    });

    const resolved = await acknowledgeRequirementRecipient(
      { tenantId: TENANT_A, userId: GUARDIAN_USER, permissionKeys: [] },
      RECIP_ID,
    );
    expect(resolved.subjectPersonId).toBe(PERSON_CHILD);
    expect(resolved.responseActorPersonId).toBe(GUARDIAN_PERSON);
    expect(resolved.respondedByUserId).toBe(GUARDIAN_USER);
  });

  it("G4 unrelated parent cannot ACK (participation seam fail-closed)", async () => {
    mocks.recipientFindFirst.mockResolvedValue(recipientRow({ subjectPersonId: PERSON_CHILD }));
    mocks.assertActor.mockRejectedValue(new Error("ParticipationUnauthorizedError"));
    await expect(
      acknowledgeRequirementRecipient(
        { tenantId: TENANT_A, userId: "unrelated-parent", permissionKeys: [] },
        RECIP_ID,
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(mocks.recipientUpdate).not.toHaveBeenCalled();
  });

  it("G7 audit actor records guardian Person while subject remains child", async () => {
    const open = recipientRow({ subjectPersonId: PERSON_CHILD });
    mocks.recipientFindFirst.mockResolvedValueOnce(open);
    mocks.assertActor.mockResolvedValue({ source: "PARENT", actorPersonId: GUARDIAN_PERSON });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    mocks.recipientUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...open,
      ...data,
    }));

    await acknowledgeRequirementRecipient(
      { tenantId: TENANT_A, userId: GUARDIAN_USER, permissionKeys: [] },
      RECIP_ID,
    );
    expect(mocks.recipientUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          responseActorPersonId: GUARDIAN_PERSON,
          respondedByUserId: GUARDIAN_USER,
        }),
      }),
    );
  });

  it("G8/G9 guardian ACK resolves single child recipient; replay is idempotent", async () => {
    const open = recipientRow({ subjectPersonId: PERSON_CHILD });
    mocks.recipientFindFirst.mockResolvedValueOnce(open);
    mocks.assertActor.mockResolvedValue({ source: "PARENT", actorPersonId: GUARDIAN_PERSON });
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_CHILD]);
    const resolvedRow = {
      ...open,
      resolutionStatus: "RESOLVED",
      responseValue: "ACKNOWLEDGED",
      respondedAt: new Date("2026-09-02T12:00:00.000Z"),
      respondedByUserId: GUARDIAN_USER,
      responseActorPersonId: GUARDIAN_PERSON,
    };
    mocks.recipientUpdate.mockResolvedValue(resolvedRow);

    await acknowledgeRequirementRecipient(
      { tenantId: TENANT_A, userId: GUARDIAN_USER, permissionKeys: [] },
      RECIP_ID,
    );

    mocks.recipientFindFirst.mockResolvedValue(resolvedRow);
    mocks.assertActor.mockResolvedValue({ source: "PARENT", actorPersonId: GUARDIAN_PERSON });
    const replay = await acknowledgeRequirementRecipient(
      { tenantId: TENANT_A, userId: GUARDIAN_USER, permissionKeys: [] },
      RECIP_ID,
    );
    expect(mocks.recipientUpdate).toHaveBeenCalledTimes(1);
    expect(replay.resolutionStatus).toBe("RESOLVED");
  });
});

describe("AUFGABEN-06G1 Matrix Z additive capabilities", () => {
  it("management and recipient response capabilities are independent", () => {
    const matrixCtx = {
      tenantId: TENANT_A,
      userId: "matrix-z",
      permissionKeys: [
        PERMISSIONS.REQUIREMENTS_MANAGE,
        PERMISSIONS.TASKS_VIEW,
        PERMISSIONS.TRAININGS_MANAGE,
      ],
    };
    expect(canManageRequirement(matrixCtx)).toBe(true);
    expect(
      canReadOwnRequirementRecipient(
        { tenantId: TENANT_A, userId: "matrix-z", permissionKeys: [] },
        {
          tenantId: TENANT_A,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_A,
          removedAt: null,
        },
        [PERSON_A],
      ),
    ).toBe(true);
    expect(
      canRespondToRequirementRecipient(
        { tenantId: TENANT_A, userId: "matrix-z", permissionKeys: [] },
        {
          tenantId: TENANT_A,
          requirementId: REQ_ID,
          subjectPersonId: PERSON_A,
          removedAt: null,
        },
        [PERSON_A],
      ),
    ).toBe(true);
  });
});

describe("AUFGABEN-06G1 isolation sentinels (R35–R38)", () => {
  it("R37/R38 PersonalAction sources unchanged", () => {
    expect(read("lib/personal-actions/types.ts")).not.toMatch(/REQUIREMENT/);
    expect(read("lib/tasks/inbox-adapter.ts")).not.toMatch(/RequirementRecipient/);
  });

  it("R12 getOwnRequirementRecipient enforces subject relationship", async () => {
    mocks.recipientFindFirst.mockResolvedValue(recipientRow());
    mocks.authorizedPersonIds.mockResolvedValue([PERSON_A]);
    const own = await getOwnRequirementRecipient(memberCtx(), RECIP_ID);
    expect(own.subjectPersonId).toBe(PERSON_A);
    mocks.authorizedPersonIds.mockResolvedValue([]);
    await expect(getOwnRequirementRecipient(memberCtx(), RECIP_ID)).rejects.toBeInstanceOf(
      RequirementForbiddenError,
    );
  });

  it("ACTIVE responseMode frozen on update", async () => {
    mocks.requirementFindFirst.mockResolvedValue(requirementRow({ status: "ACTIVE" }));
    await expect(
      updateRequirementDraft(managerCtx(), REQ_ID, { responseMode: "ACKNOWLEDGE" }),
    ).resolves.toBeDefined();
    mocks.requirementFindFirst.mockResolvedValue(
      requirementRow({ status: "ACTIVE", responseMode: "ACKNOWLEDGE" }),
    );
    await expect(
      updateRequirementDraft(managerCtx(), REQ_ID, { responseMode: "ACKNOWLEDGE" as never }),
    ).resolves.toBeDefined();
  });
});



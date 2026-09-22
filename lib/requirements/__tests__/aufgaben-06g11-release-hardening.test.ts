/**
 * AUFGABEN-06G11 — End-to-end release hardening (lifecycle, tenant, security seams).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createSafeTestPrismaClient } from "@/lib/test/safe-test-prisma";
import { requirementPersonalActionSource } from "@/lib/personal-actions/sources/requirement-source";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";
import { personalRequirementExecutionHref } from "@/lib/requirements/personal-navigation";
import { requirementPersonalExecutionHref } from "@/lib/notifications/deduplication";
import { processRequirementDeadlineNotifications } from "@/lib/notifications/requirement-deadline-processor";
import { loadPersonalRequirementExecutionView } from "@/lib/requirements/personal-execution-service";
import {
  RequirementForbiddenError,
  RequirementNotFoundError,
  RequirementRecipientNotFoundError,
  RequirementValidationError,
} from "../errors";
import {
  acknowledgeRequirementRecipient,
  activateRequirement,
  createRequirementDraft,
  getRequirement,
  getRequirementAggregate,
  setRequirementDraftAudience,
} from "../requirement-service";
import {
  cleanupRequirementFixture,
  createRequirementTestPerson,
  createRequirementTestTenant,
  createRequirementTestUser,
} from "./test-helpers";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const hasSafeTestDb = Boolean(process.env.TEST_DATABASE_URL?.trim());

describe("AUFGABEN-06G11 — contract map (canonical paths)", () => {
  it("documents creation → activation → obligation → execution → resolve seams", () => {
    expect(read("lib/requirements/requirement-service.ts")).toMatch(/createRequirementDraft\(/);
    expect(read("lib/requirements/requirement-audience.ts")).toMatch(
      /resolveRequirementAudiencePersonIds/,
    );
    expect(read("lib/requirements/requirement-service.ts")).toMatch(/activateRequirement\(/);
    expect(read("lib/notifications/requirement-producer.ts")).toMatch(
      /emitRequirementAssignedNotifications/,
    );
    expect(read("lib/personal-actions/sources/requirement-obligations.ts")).toMatch(
      /loadRequirementObligationCandidates/,
    );
    expect(read("lib/requirements/personal-execution-service.ts")).toMatch(
      /loadPersonalRequirementExecutionView/,
    );
    expect(read("lib/personal-actions/submit-requirement-response.ts")).toMatch(
      /acknowledgeRequirementRecipient/,
    );
    expect(read("lib/requirements/management-service.ts")).toMatch(/listRequirementRecipientMatrix/);
    expect(read("lib/notifications/requirement-deadline-processor.ts")).toMatch(
      /processRequirementDeadlineNotifications/,
    );
    expect(read("lib/requirements/requirement-deadlines.ts")).toMatch(
      /openRequirementRecipientOverdueWhere/,
    );
  });
});

describe("AUFGABEN-06G11 — security & identity static review", () => {
  it("server actions derive tenant/user from session context, not client body", () => {
    const actions = read("app/(admin)/dashboard/aufgaben/requirement-actions.ts");
    expect(actions).toMatch(/getRequirementServiceContext\(/);
    expect(actions).not.toMatch(/createdByUserId.*formData/);
    const personal = read("app/(admin)/dashboard/aufgaben/personal-requirement-actions.ts");
    expect(personal).toMatch(/getRequirementServiceContext\(/);
    expect(personal).not.toMatch(/responseActorPersonId.*formData/);
  });

  it("acknowledge persists actor from participation seam, not arbitrary client ids", () => {
    const svc = read("lib/requirements/requirement-service.ts");
    expect(svc).toMatch(/assertActorCanRespondForPerson/);
    expect(svc).toMatch(/responseActorPersonId: actorContext\.actorPersonId/);
    expect(svc).toMatch(/respondedByUserId: ctx\.userId/);
  });

  it("queries scope tenantId on requirement and recipient loads", () => {
    expect(read("lib/requirements/requirement-service.ts")).toMatch(
      /where: \{ id: requirementId, tenantId \}/,
    );
    expect(read("lib/requirements/personal-execution-service.ts")).toMatch(
      /where: \{ id: recipientId, tenantId: ctx\.tenantId \}/,
    );
    expect(read("lib/requirements/requirement-authorization.ts")).toMatch(
      /record\.tenantId !== ctx\.tenantId/,
    );
  });

  it("notification hrefs stay on personal execution routes", () => {
    expect(requirementPersonalExecutionHref("recip-x")).toBe(
      personalRequirementExecutionHref("recip-x"),
    );
    expect(requirementPersonalExecutionHref("recip-x")).not.toMatch(/anforderungen/);
  });
});

describe("AUFGABEN-06G11 — workspace seam & deferred capabilities", () => {
  it("WORKSPACE_DEPENDENCY — text/ack Requirements operational without document execution", () => {
    const personal = read("components/admin/aufgaben/PersonalRequirementExecutionWorkspace.tsx");
    expect(personal).not.toMatch(/WorkspaceDocument|documentVersion|RequirementDocumentReferencesSection/i);
    expect(read("prisma/schema.prisma")).toMatch(/model RequirementWorkspaceDocumentVersionReference/);
    expect(read("prisma/schema.prisma")).toMatch(/model RequirementRecipient/);
  });

  it("manual manager reminder remains deferred (no domain operation)", () => {
    const mgmt = read("lib/requirements/management-service.ts");
    expect(mgmt).not.toMatch(/manualReminder|triggerManualReminder|sendManualReminder/i);
  });
});

describe("AUFGABEN-06G11 — performance / query review (static)", () => {
  it("deadline processor uses recipient snapshots, not live audience resolution", () => {
    const processor = read("lib/notifications/requirement-deadline-processor.ts");
    expect(processor).toMatch(/requirementRecipient\.findMany/);
    expect(processor).not.toMatch(/resolveRequirementAudiencePersonIds/);
  });

  it("management recipient matrix retains batched person loading (06G8)", () => {
    expect(read("lib/requirements/management-service.ts")).toMatch(/loadRequirementPersonNameMap/);
    expect(read("lib/requirements/management-service.ts")).toMatch(/REQUIREMENT_MANAGEMENT_PAGE_SIZE/);
  });
});

describe.skipIf(!hasSafeTestDb)("AUFGABEN-06G11 — end-to-end lifecycle (real DB)", () => {
  let prisma: ReturnType<typeof createSafeTestPrismaClient>["prisma"];
  const fixture: {
    tenantIds: string[];
    userIds: string[];
    personIds: string[];
    requirementIds: string[];
  } = { tenantIds: [], userIds: [], personIds: [], requirementIds: [] };

  beforeAll(() => {
    prisma = createSafeTestPrismaClient().prisma;
  });

  afterAll(async () => {
    for (const requirementId of fixture.requirementIds) {
      await prisma.notification.deleteMany({
        where: { entityType: "REQUIREMENT", entityId: requirementId },
      });
      await prisma.requirementRecipient.deleteMany({ where: { requirementId } });
    }
    await cleanupRequirementFixture({
      tenantIds: fixture.tenantIds,
      userIds: fixture.userIds,
      personIds: fixture.personIds,
      requirementIds: fixture.requirementIds,
    });
  });

  function managerCtx(tenantId: string, userId: string) {
    return {
      tenantId,
      userId,
      permissionKeys: [
        PERMISSIONS.REQUIREMENTS_CREATE,
        PERMISSIONS.REQUIREMENTS_MANAGE,
        PERMISSIONS.REQUIREMENTS_VIEW,
        PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE,
      ],
    };
  }

  it("L1–L15 — create → activate → notify → personal action → execute → aggregate → reminder suppression", async () => {
    const tenant = await createRequirementTestTenant("e2e");
    const manager = await createRequirementTestUser("e2e-mgr");
    const member = await createRequirementTestUser("e2e-member");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id, member.id);

    const memberPerson = await createRequirementTestPerson(tenant.id, "member", member.id);
    fixture.personIds.push(memberPerson.id);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { locale: "de-CH", timezone: "Europe/Zurich" },
    });

    const mgrCtx = managerCtx(tenant.id, manager.id);
    const dueAt = new Date("2026-09-20T12:00:00.000Z");

    const draft = await createRequirementDraft(mgrCtx, {
      title: "06G11 E2E Handbuch",
      description: "Bitte bestätigen.",
      dueAt,
    });
    fixture.requirementIds.push(draft.id);
    expect(draft.createdByUserId).toBe(manager.id);
    expect(draft.status).toBe("DRAFT");

    await setRequirementDraftAudience(mgrCtx, draft.id, [memberPerson.id]);

    const activated = await activateRequirement(mgrCtx, draft.id);
    expect(activated.status).toBe("ACTIVE");

    const recipients = await prisma.requirementRecipient.findMany({
      where: { tenantId: tenant.id, requirementId: draft.id },
    });
    expect(recipients).toHaveLength(1);
    const recipient = recipients[0]!;
    expect(recipient.subjectPersonId).toBe(memberPerson.id);
    expect(recipient.resolutionStatus).toBe("OPEN");

    const assignedNotifications = await prisma.notification.count({
      where: {
        tenantId: tenant.id,
        type: NotificationTypeEnum.REQUIREMENT_ASSIGNED,
        entityId: draft.id,
      },
    });
    expect(assignedNotifications).toBeGreaterThanOrEqual(1);

    const memberCtx = { tenantId: tenant.id, userId: member.id, permissionKeys: [] as string[] };
    const personalActions = await requirementPersonalActionSource.loadActionable(memberCtx);
    expect(personalActions.map((a) => a.id)).toContain(
      buildRequirementPersonalActionId(recipient.id),
    );
    expect(personalActions[0]?.href).toBe(personalRequirementExecutionHref(recipient.id));

    const executionView = await loadPersonalRequirementExecutionView(
      memberCtx,
      recipient.id,
      "de-CH",
      "Europe/Zurich",
    );
    expect(executionView.recipient.id).toBe(recipient.id);
    expect(executionView.requirement.title).toBe("06G11 E2E Handbuch");

    const resolved = await acknowledgeRequirementRecipient(memberCtx, recipient.id);
    expect(resolved.resolutionStatus).toBe("RESOLVED");
    expect(resolved.respondedByUserId).toBe(member.id);
    expect(resolved.responseActorPersonId).toBe(memberPerson.id);
    expect(resolved.respondedAt).toBeTruthy();

    const afterAckActions = await requirementPersonalActionSource.loadActionable(memberCtx);
    expect(afterAckActions.some((a) => a.sourceId === recipient.id)).toBe(false);

    const aggregate = await getRequirementAggregate(mgrCtx, draft.id);
    expect(aggregate.totalRecipients).toBe(1);
    expect(aggregate.openCount).toBe(0);
    expect(aggregate.resolvedCount).toBe(1);

    const replayActivate = await activateRequirement(mgrCtx, draft.id);
    expect(replayActivate.status).toBe("ACTIVE");
    expect(
      await prisma.requirementRecipient.count({
        where: { tenantId: tenant.id, requirementId: draft.id },
      }),
    ).toBe(1);

    const assignedAfterReplay = await prisma.notification.count({
      where: {
        tenantId: tenant.id,
        type: NotificationTypeEnum.REQUIREMENT_ASSIGNED,
        entityId: draft.id,
      },
    });
    expect(assignedAfterReplay).toBe(assignedNotifications);

    const replayAck = await acknowledgeRequirementRecipient(memberCtx, recipient.id);
    expect(replayAck.resolutionStatus).toBe("RESOLVED");

    const overdueNow = new Date("2026-09-25T12:00:00.000Z");
    const deadlineResult = await processRequirementDeadlineNotifications(overdueNow);
    expect(deadlineResult.overdueCreated).toBe(0);
    expect(deadlineResult.reminderCreated).toBe(0);
  });

  it("T1–T8 — tenant isolation on read, manage, execute, and guessed ids", async () => {
    const tenantA = await createRequirementTestTenant("iso-a");
    const tenantB = await createRequirementTestTenant("iso-b");
    const mgrA = await createRequirementTestUser("iso-mgr-a");
    const mgrB = await createRequirementTestUser("iso-mgr-b");
    const memberB = await createRequirementTestUser("iso-member-b");
    fixture.tenantIds.push(tenantA.id, tenantB.id);
    fixture.userIds.push(mgrA.id, mgrB.id, memberB.id);

    const personA = await createRequirementTestPerson(tenantA.id, "iso-a-person");
    const personB = await createRequirementTestPerson(tenantB.id, "iso-b-person", memberB.id);
    fixture.personIds.push(personA.id, personB.id);

    const ctxA = managerCtx(tenantA.id, mgrA.id);
    const draftA = await createRequirementDraft(ctxA, { title: "Tenant A req" });
    fixture.requirementIds.push(draftA.id);
    await setRequirementDraftAudience(ctxA, draftA.id, [personA.id]);
    await activateRequirement(ctxA, draftA.id);

    const recipientA = await prisma.requirementRecipient.findFirstOrThrow({
      where: { requirementId: draftA.id },
    });

    const ctxBMgr = managerCtx(tenantB.id, mgrB.id);
    await expect(getRequirement(ctxBMgr, draftA.id)).rejects.toBeInstanceOf(
      RequirementNotFoundError,
    );
    await expect(getRequirementAggregate(ctxBMgr, draftA.id)).rejects.toBeInstanceOf(
      RequirementNotFoundError,
    );

    const ctxBMember = { tenantId: tenantB.id, userId: memberB.id, permissionKeys: [] as string[] };
    await expect(
      loadPersonalRequirementExecutionView(ctxBMember, recipientA.id, "de-CH", "Europe/Zurich"),
    ).rejects.toBeInstanceOf(RequirementRecipientNotFoundError);

    await expect(
      acknowledgeRequirementRecipient(ctxBMember, recipientA.id),
    ).rejects.toBeInstanceOf(RequirementRecipientNotFoundError);
  });

  it("S1–S6 — invalid lifecycle transitions are server-enforced", async () => {
    const tenant = await createRequirementTestTenant("state");
    const manager = await createRequirementTestUser("state-mgr");
    const member = await createRequirementTestUser("state-member");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id, member.id);

    const person = await createRequirementTestPerson(tenant.id, "state-person", member.id);
    fixture.personIds.push(person.id);

    const mgrCtx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(mgrCtx, { title: "Draft only" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudience(mgrCtx, draft.id, [person.id]);

    const memberCtx = { tenantId: tenant.id, userId: member.id, permissionKeys: [] as string[] };
    await expect(
      acknowledgeRequirementRecipient(memberCtx, "nonexistent-recipient"),
    ).rejects.toBeInstanceOf(RequirementRecipientNotFoundError);

    await expect(activateRequirement(mgrCtx, draft.id)).resolves.toMatchObject({ status: "ACTIVE" });
    const recipient = await prisma.requirementRecipient.findFirstOrThrow({
      where: { requirementId: draft.id },
    });

    await prisma.requirement.update({
      where: { id: draft.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await expect(acknowledgeRequirementRecipient(memberCtx, recipient.id)).rejects.toBeInstanceOf(
      RequirementValidationError,
    );

    await prisma.requirementRecipient.update({
      where: { id: recipient.id },
      data: { removedAt: new Date() },
    });

    await prisma.requirement.update({
      where: { id: draft.id },
      data: { status: "ACTIVE", cancelledAt: null },
    });

    await expect(acknowledgeRequirementRecipient(memberCtx, recipient.id)).rejects.toBeInstanceOf(
      RequirementForbiddenError,
    );
  });

  it("U1 — unrelated same-tenant person cannot execute another recipient", async () => {
    const tenant = await createRequirementTestTenant("unrelated");
    const manager = await createRequirementTestUser("unrelated-mgr");
    const subject = await createRequirementTestUser("subject-user");
    const bystander = await createRequirementTestUser("bystander-user");
    fixture.tenantIds.push(tenant.id);
    fixture.userIds.push(manager.id, subject.id, bystander.id);

    const subjectPerson = await createRequirementTestPerson(tenant.id, "subject", subject.id);
    await createRequirementTestPerson(tenant.id, "bystander", bystander.id);
    fixture.personIds.push(subjectPerson.id);

    const mgrCtx = managerCtx(tenant.id, manager.id);
    const draft = await createRequirementDraft(mgrCtx, { title: "Private ack" });
    fixture.requirementIds.push(draft.id);
    await setRequirementDraftAudience(mgrCtx, draft.id, [subjectPerson.id]);
    await activateRequirement(mgrCtx, draft.id);

    const recipient = await prisma.requirementRecipient.findFirstOrThrow({
      where: { requirementId: draft.id },
    });

    const bystanderCtx = { tenantId: tenant.id, userId: bystander.id, permissionKeys: [] as string[] };
    await expect(acknowledgeRequirementRecipient(bystanderCtx, recipient.id)).rejects.toThrow(
      /Berechtigung|authorized|Unauthorized/i,
    );
  });
});

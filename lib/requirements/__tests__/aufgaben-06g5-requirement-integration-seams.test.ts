/**
 * AUFGABEN-06G5 — Requirement integration contract tests (I01–I40).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TASK_DUE_SOON_LEAD_MS } from "@/lib/notifications/constants";
import {
  collectUserIdsAuthorizedToRespondForSubjectPerson,
  isGuardianResponderUser,
} from "@/lib/participation/subject-responder-users";
import { getUserIdsAuthorizedToRespondForPerson } from "@/lib/participation/authorization";
import {
  isRequirementDueAtInReminderWindow,
  isRequirementDueAtOverdue,
  isRequirementRecipientOverdue,
} from "@/lib/requirements/requirement-deadlines";
import {
  resolveRequirementAudiencePersonIdsFromDraftRows,
} from "@/lib/requirements/requirement-audience";
import { openAcknowledgeableRequirementRecipientWhere } from "@/lib/requirements/requirement-eligibility";
import {
  canManageRequirement,
  canReadOwnRequirementRecipient,
  canRespondToRequirementRecipient,
  taskPermissionsGrantRequirementManagement,
} from "@/lib/requirements/requirement-authorization";
import { computeRequirementAggregate } from "@/lib/requirements/requirement-aggregate";
import { buildRequirementPersonalActionId } from "@/lib/personal-actions/identity";
import {
  resolveNotificationUserIdsForSubject,
  isGuardianNotificationRecipient,
} from "@/lib/notifications/requirement-recipient-resolution";
import * as requirementPlatform from "@/lib/requirements/platform";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const TENANT = "tenant-a";
const NOW = new Date("2026-09-22T12:00:00.000Z");

describe("AUFGABEN-06G5 — canonical contracts", () => {
  it("I01/I02 — PersonalAction id maps to RequirementRecipient without duplicate persistence", () => {
    const recipientId = "recip-canonical";
    expect(buildRequirementPersonalActionId(recipientId)).toBe(`requirement:${recipientId}`);
    expect(read("lib/personal-actions/submit-requirement-response.ts")).toMatch(
      /acknowledgeRequirementRecipient/,
    );
    expect(read("lib/personal-actions/sources/requirement-source.ts")).not.toMatch(
      /requirementRecipient\.create/,
    );
    expect(read("prisma/schema.prisma")).not.toMatch(/RequirementPersonalAction/);
  });

  it("I03/I04/I05 — notification preferences do not gate obligation or ack authority", () => {
    const deadline = read("lib/notifications/requirement-deadline-processor.ts");
    expect(deadline).toMatch(/loadEffectivePreferencesForUsers/);
    expect(read("lib/personal-actions/sources/requirement-obligations.ts")).not.toMatch(
      /preference/,
    );
    expect(read("lib/requirements/requirement-service.ts")).not.toMatch(/preference/);
  });

  it("I06–I12 — tasks and management permissions do not grant personal execution", () => {
    const tasksCtx = {
      tenantId: TENANT,
      userId: "tasks-user",
      permissionKeys: [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_MANAGE],
    };
    expect(taskPermissionsGrantRequirementManagement(tasksCtx)).toBe(true);
    expect(
      canRespondToRequirementRecipient(
        tasksCtx,
        {
          tenantId: TENANT,
          requirementId: "req",
          subjectPersonId: "person-child",
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);

    const manageCtx = {
      tenantId: TENANT,
      userId: "club-admin",
      permissionKeys: [PERMISSIONS.REQUIREMENTS_MANAGE, PERMISSIONS.REQUIREMENTS_VIEW_AGGREGATE],
    };
    expect(canManageRequirement(manageCtx)).toBe(true);
    expect(
      canReadOwnRequirementRecipient(
        manageCtx,
        {
          tenantId: TENANT,
          requirementId: "req",
          subjectPersonId: "person-child",
          removedAt: null,
        },
        [],
      ),
    ).toBe(false);
  });

  it("I13–I19 — shared subject/responder relationship semantics", () => {
    const subjectRow = {
      userId: "user-self",
      guardianRelationshipsAsChild: [
        { guardianPerson: { userId: "guardian-a" } },
        { guardianPerson: { userId: "guardian-b" } },
      ],
    };
    const fromHelper = collectUserIdsAuthorizedToRespondForSubjectPerson(subjectRow);
    expect(fromHelper).toEqual(["user-self", "guardian-a", "guardian-b"]);

    const notificationContext = {
      personId: "person-child",
      displayName: "Child",
      selfUserId: "user-self",
      guardianUserIds: ["guardian-a", "guardian-b"],
    };
    expect(resolveNotificationUserIdsForSubject(notificationContext).sort()).toEqual(
      fromHelper.sort(),
    );
    expect(isGuardianNotificationRecipient("guardian-a", notificationContext)).toBe(true);
    expect(isGuardianResponderUser("guardian-a", "user-self")).toBe(true);

    expect(
      canRespondToRequirementRecipient(
        { tenantId: TENANT, userId: "guardian-a", permissionKeys: [] },
        {
          tenantId: TENANT,
          requirementId: "req",
          subjectPersonId: "person-child",
          removedAt: null,
        },
        ["person-child"],
      ),
    ).toBe(true);

    expect(
      canReadOwnRequirementRecipient(
        { tenantId: TENANT, userId: "other", permissionKeys: [] },
        {
          tenantId: TENANT_B,
          requirementId: "req",
          subjectPersonId: "person-child",
          removedAt: null,
        },
        ["person-child"],
      ),
    ).toBe(false);
  });

  it("I20–I24 — canonical deadline and lifecycle actionability", () => {
    const dueExactlyNow = new Date(NOW);
    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: dueExactlyNow,
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: null,
        now: NOW,
      }),
    ).toBe(true);
    expect(isRequirementDueAtOverdue(dueExactlyNow, NOW)).toBe(true);

    expect(
      isRequirementDueAtInReminderWindow(
        new Date(NOW.getTime() + TASK_DUE_SOON_LEAD_MS),
        NOW,
      ),
    ).toBe(true);
    expect(
      isRequirementDueAtInReminderWindow(new Date(NOW.getTime() - 1000), NOW),
    ).toBe(false);

    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: dueExactlyNow,
        recipientResolutionStatus: "RESOLVED",
        recipientRemovedAt: null,
        now: NOW,
      }),
    ).toBe(false);

    for (const status of ["CLOSED", "CANCELLED"] as const) {
      expect(
        isRequirementRecipientOverdue({
          requirementStatus: status,
          dueAt: dueExactlyNow,
          recipientResolutionStatus: "OPEN",
          recipientRemovedAt: null,
          now: NOW,
        }),
      ).toBe(false);
    }

    expect(
      isRequirementRecipientOverdue({
        requirementStatus: "ACTIVE",
        dueAt: dueExactlyNow,
        recipientResolutionStatus: "OPEN",
        recipientRemovedAt: new Date(),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("I25 — aggregate derives progress without persisted counters", async () => {
    const counts = vi.fn()
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    const db = { requirementRecipient: { count: counts } } as never;
    const aggregate = await computeRequirementAggregate(db, TENANT, "req-1");
    expect(aggregate).toEqual({
      totalRecipients: 4,
      openCount: 2,
      resolvedCount: 2,
      acknowledgedCount: 2,
      overdueCount: 1,
      resolvedPercent: 50,
    });
    expect(read("prisma/schema.prisma")).not.toMatch(/resolvedCount|openCount/);
  });

  it("I26/I27 — consumers import shared deadline helpers", () => {
    expect(read("lib/notifications/requirement-deadline-processor.ts")).toMatch(
      /openRequirementRecipientOverdueWhere/,
    );
    expect(read("lib/requirements/management-service.ts")).toMatch(/isRequirementDueAtOverdue/);
    expect(read("lib/personal-actions/sources/requirement-obligations.ts")).toMatch(
      /openAcknowledgeableRequirementRecipientForPersons/,
    );
  });

  it("I28–I30 — explicit draft audience resolver seam", () => {
    const ids = resolveRequirementAudiencePersonIdsFromDraftRows([
      { personId: "p1" },
      { personId: "p2" },
      { personId: "p1" },
    ]);
    expect(ids).toEqual(["p1", "p2"]);
    expect(read("lib/requirements/requirement-service.ts")).toMatch(
      /resolveRequirementAudiencePersonIds\(/,
    );
    expect(read("lib/requirements/requirement-audience.ts")).toMatch(
      /resolveRequirementAudiencePersonIdsFromSnapshot/,
    );
  });

  it("I31 — management server actions delegate to domain service", () => {
    const actions = read("app/(admin)/dashboard/aufgaben/requirement-actions.ts");
    expect(actions).toMatch(/activateRequirement\(/);
    expect(actions).not.toMatch(/requirementRecipient\.createMany/);
  });

  it("I32 — PersonalAction ack delegates canonical mutation", () => {
    expect(read("lib/personal-actions/submit-requirement-response.ts")).toMatch(
      /acknowledgeRequirementRecipient\(/,
    );
    expect(read("app/(admin)/dashboard/aufgaben/personal-requirement-actions.ts")).toMatch(
      /submitRequirementPersonalAction/,
    );
  });

  it("I33 — platform surface exports domain operations for non-UI callers", () => {
    expect(typeof requirementPlatform.activateRequirement).toBe("function");
    expect(typeof requirementPlatform.acknowledgeRequirementRecipient).toBe("function");
    expect(typeof requirementPlatform.resolveRequirementAudiencePersonIds).toBe("function");
    expect(read("lib/requirements/platform.ts")).not.toMatch(/from \"react\"/);
  });

  it("I34 — semantic notification producers stay delivery-channel independent", () => {
    expect(read("lib/notifications/requirement-producer.ts")).not.toMatch(/resend/i);
    expect(read("lib/notifications/requirement-deadline-processor.ts")).toMatch(
      /createNotificationIdempotent/,
    );
  });

  it("I35–I38 — forbidden scope not introduced", () => {
    const repoScan = [
      "lib/requirements/requirement-audience.ts",
      "lib/requirements/requirement-eligibility.ts",
      "lib/requirements/requirement-deadlines.ts",
    ]
      .map(read)
      .join("\n");
    expect(repoScan).not.toMatch(/PUSH|Workspace|Mobile/i);
  });

  it("I39 — no duplicate requirement-specific preference model", () => {
    expect(read("prisma/schema.prisma")).not.toMatch(/RequirementNotificationPreference/);
  });

  it("I40 — open obligation where remains additive eligibility only", () => {
    expect(openAcknowledgeableRequirementRecipientWhere).toMatchObject({
      removedAt: null,
      resolutionStatus: "OPEN",
      requirement: {
        status: "ACTIVE",
        responseMode: "ACKNOWLEDGE",
      },
    });
  });
});

describe("AUFGABEN-06G5 — inverse responder lookup uses shared collector", () => {
  it("getUserIdsAuthorizedToRespondForPerson delegates to subject-responder-users", () => {
    expect(read("lib/participation/authorization.ts")).toMatch(
      /collectUserIdsAuthorizedToRespondForSubjectPerson/,
    );
    expect(read("lib/notifications/requirement-recipient-resolution.ts")).toMatch(
      /collectUserIdsAuthorizedToRespondForSubjectPerson/,
    );
    void getUserIdsAuthorizedToRespondForPerson;
  });
});

const TENANT_B = "tenant-b";

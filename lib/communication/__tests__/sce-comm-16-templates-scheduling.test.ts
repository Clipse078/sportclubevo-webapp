import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseTenantLocalDateTimeInput,
  resolveTenantEventTimezone,
  utcInstantToDateTimeLocalValue,
} from "@/lib/events/tenant-local-datetime";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  archivePlatformCommunicationTemplate,
  assertTemplateTenantMatch,
  createDraftFromPlatformTemplate,
  createPlatformCommunicationTemplate,
  duplicatePlatformCommunicationTemplate,
  updatePlatformCommunicationTemplate,
} from "@/lib/communication/templates/platform-template-service";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";
import {
  cancelPlatformCommunicationPublicationSchedule,
  consumeActivePublicationScheduleForImmediatePublish,
  createPlatformCommunicationPublicationSchedule,
  parseScheduleInstant,
  reschedulePlatformCommunicationPublication,
} from "@/lib/communication/scheduling/publication-schedule-service";
import { processDuePlatformCommunicationPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-processor";
import { claimDuePlatformCommunicationPublicationSchedules } from "@/lib/communication/scheduling/publication-schedule-claim";
import { publishScheduledPlatformCommunication } from "@/lib/communication/scheduling/publication-schedule-publish-bridge";
import { TeamCommunicationForbiddenError, TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

const mocks = vi.hoisted(() => ({
  platformCommunicationTemplate: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationPublicationSchedule: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  platformCommunication: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  tenant: { findUnique: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  getEffectivePermissions: vi.fn(),
  logAction: vi.fn(),
  createCampaignDraft: vi.fn(),
  createClubCommunicationDraft: vi.fn(),
  publishCampaign: vi.fn(),
  publishClubCommunication: vi.fn(),
  targetGroup: { findMany: vi.fn() },
  orgUnit: { count: vi.fn() },
  team: { count: vi.fn() },
  role: { count: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunicationTemplate: mocks.platformCommunicationTemplate,
    platformCommunicationPublicationSchedule: mocks.platformCommunicationPublicationSchedule,
    platformCommunication: mocks.platformCommunication,
    tenant: mocks.tenant,
    targetGroup: mocks.targetGroup,
    orgUnit: mocks.orgUnit,
    team: mocks.team,
    role: mocks.role,
    $queryRaw: mocks.$queryRaw,
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn(async () => false),
  isTenantClubAdmin: vi.fn(async () => false),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/communication/campaign/campaign-service", () => ({
  createCampaignDraft: (...args: unknown[]) => mocks.createCampaignDraft(...args),
  publishCampaign: (...args: unknown[]) => mocks.publishCampaign(...args),
}));

vi.mock("@/lib/communication/club/club-communication-service", () => ({
  createClubCommunicationDraft: (...args: unknown[]) => mocks.createClubCommunicationDraft(...args),
  publishClubCommunication: (...args: unknown[]) => mocks.publishClubCommunication(...args),
}));

describe("SCE-COMM-16 templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.targetGroup.findMany.mockResolvedValue([{ id: "tg-1", status: "ACTIVE" }]);
    mocks.orgUnit.count.mockResolvedValue(1);
    mocks.team.count.mockResolvedValue(0);
    mocks.role.count.mockResolvedValue(0);
  });

  it("creates and updates a platform template without recipient snapshots", async () => {
    mocks.platformCommunicationTemplate.create.mockResolvedValue({ id: "tpl-1" });
    const created = await createPlatformCommunicationTemplate({
      tenantId: "tenant-a",
      actorUserId: "user-1",
      name: "Frühjahr",
      kind: "CAMPAIGN",
      bodyText: "Hallo Verein",
      audienceSpec: {
        composition: "UNION",
        components: [{ savedTargetGroupIds: ["tg-1"] }],
      },
    });
    expect(created.id).toBe("tpl-1");
    expect(mocks.platformCommunicationTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audienceSpecJson: expect.any(Object),
        }),
      }),
    );

    mocks.platformCommunicationTemplate.findFirst.mockResolvedValue({
      id: "tpl-1",
      tenantId: "tenant-a",
      status: "DRAFT",
      kind: "CAMPAIGN",
      updatedAt: new Date(),
    });
    mocks.platformCommunicationTemplate.update.mockResolvedValue({});
    await updatePlatformCommunicationTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
      name: "Frühjahr 2026",
    });
    expect(mocks.platformCommunicationTemplate.update).toHaveBeenCalled();
  });

  it("duplicates and archives templates", async () => {
    mocks.platformCommunicationTemplate.findFirst.mockResolvedValue({
      id: "tpl-1",
      tenantId: "tenant-a",
      name: "Base",
      description: null,
      kind: "ANNOUNCEMENT",
      status: "ACTIVE",
      internalName: null,
      subject: "Hi",
      bodyText: "Body",
      audienceSpecJson: null,
      orchestrationMetaJson: null,
      updatedAt: new Date(),
    });
    mocks.platformCommunicationTemplate.create.mockResolvedValue({ id: "tpl-2" });
    const dup = await duplicatePlatformCommunicationTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
    });
    expect(dup.id).toBe("tpl-2");

    mocks.platformCommunicationTemplate.update.mockResolvedValue({});
    await archivePlatformCommunicationTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
    });
    expect(mocks.platformCommunicationTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ARCHIVED" }) }),
    );
  });

  it("use template creates independent draft with source traceability", async () => {
    const templateUpdatedAt = new Date("2026-09-01T10:00:00.000Z");
    mocks.platformCommunicationTemplate.findFirst.mockResolvedValue({
      id: "tpl-1",
      tenantId: "tenant-a",
      name: "Tpl",
      kind: "CAMPAIGN",
      status: "ACTIVE",
      internalName: "Internal",
      subject: "Subj",
      bodyText: "Body",
      audienceSpecJson: {
        composition: "UNION",
        components: [{ savedTargetGroupIds: ["tg-1"] }],
      },
      orchestrationMetaJson: {
        schemaVersion: 1,
        channels: { inApp: true, push: true, email: true },
        scheduling: { mode: "IMMEDIATE", scheduledAt: null },
      },
      updatedAt: templateUpdatedAt,
    });
    mocks.createCampaignDraft.mockResolvedValue({ id: "comm-1" });
    mocks.platformCommunication.update.mockResolvedValue({});

    const draft = await createDraftFromPlatformTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
    });

    expect(draft.id).toBe("comm-1");
    expect(mocks.platformCommunication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourcePlatformTemplateId: "tpl-1",
          sourcePlatformTemplateVersion: templateUpdatedAt,
        }),
      }),
    );
  });

  it("enforces template tenant isolation", () => {
    expect(() => assertTemplateTenantMatch("tenant-a", "tenant-b")).toThrow(
      TeamCommunicationForbiddenError,
    );
  });

  it("template authorization respects communication.templates.* permissions", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW],
    });
    const viewOnly = await resolvePlatformTemplateAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc",
      userId: "user-1",
    });
    expect(viewOnly.canView).toBe(true);
    expect(viewOnly.canManage).toBe(false);

    mocks.getEffectivePermissions.mockResolvedValue({
      tenant: [PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE],
    });
    const manage = await resolvePlatformTemplateAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc",
      userId: "user-1",
    });
    expect(manage.canManage).toBe(true);
  });
});

describe("SCE-COMM-16 scheduling", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenant.findUnique.mockResolvedValue({ timezone: "Europe/Zurich" });
  });

  it("rejects past schedule times", () => {
    expect(() =>
      parseScheduleInstant({
        scheduledAtLocal: "2020-01-01T08:00",
        timezone: "Europe/Zurich",
        now: new Date(),
      }),
    ).toThrow(TeamCommunicationValidationError);
  });

  it("parses tenant-local datetime with DST-aware timezone helpers", () => {
    const tz = resolveTenantEventTimezone("Europe/Zurich");
    const instant = parseTenantLocalDateTimeInput("2026-10-26T08:00", tz);
    expect(instant).not.toBeNull();
    expect(utcInstantToDateTimeLocalValue(instant!, tz)).toBe("2026-10-26T08:00");
  });

  it("creates,reschedules and cancels schedules", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      tenantId: "tenant-a",
      kind: "CAMPAIGN",
      status: "DRAFT",
      orchestrationMetaJson: {},
    });
    mocks.platformCommunicationPublicationSchedule.findUnique.mockResolvedValue(null);
    mocks.platformCommunicationPublicationSchedule.create.mockResolvedValue({
      id: "sched-1",
    });
    mocks.platformCommunication.update.mockResolvedValue({});

    const created = await createPlatformCommunicationPublicationSchedule({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      actorUserId: "user-1",
      scheduledAtLocal: utcInstantToDateTimeLocalValue(future, "Europe/Zurich"),
      now: new Date(),
    });
    expect(created.scheduleId).toBe("sched-1");

    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue({
      id: "sched-1",
      tenantId: "tenant-a",
      communicationId: "comm-1",
      status: "SCHEDULED",
      timezone: "Europe/Zurich",
    });
    mocks.platformCommunicationPublicationSchedule.update.mockResolvedValue({});
    await reschedulePlatformCommunicationPublication({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      actorUserId: "user-1",
      scheduledAtLocal: utcInstantToDateTimeLocalValue(
        new Date(future.getTime() + 3600000),
        "Europe/Zurich",
      ),
      now: new Date(),
    });

    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue({
      id: "sched-1",
      tenantId: "tenant-a",
      communicationId: "comm-1",
      status: "SCHEDULED",
    });
    mocks.platformCommunication.findFirst.mockResolvedValue({
      kind: "CAMPAIGN",
      orchestrationMetaJson: {},
    });
    await cancelPlatformCommunicationPublicationSchedule({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      actorUserId: "user-1",
    });
    expect(mocks.platformCommunicationPublicationSchedule.update).toHaveBeenCalled();
  });

  it("consumes active schedule before immediate publish", async () => {
    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue({
      id: "sched-1",
      tenantId: "tenant-a",
      communicationId: "comm-1",
      status: "SCHEDULED",
    });
    mocks.platformCommunicationPublicationSchedule.updateMany.mockResolvedValue({ count: 1 });

    const consumed = await consumeActivePublicationScheduleForImmediatePublish({
      tenantId: "tenant-a",
      communicationId: "comm-1",
      actorUserId: "user-1",
    });
    expect(consumed).toBe(true);
  });

  it("processor publishes due schedules via canonical publish bridge", async () => {
    const scheduleRow = {
      id: "sched-1",
      tenantId: "tenant-a",
      communicationId: "comm-1",
      scheduledAt: new Date(Date.now() - 1000),
      timezone: "Europe/Zurich",
      status: "PROCESSING" as const,
      claimedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60000),
      executedAt: null,
      cancelledAt: null,
      cancelledByUserId: null,
      attemptCount: 1,
      maxAttempts: 5,
      lastFailureReason: null,
      createdByUserId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mocks.$queryRaw.mockResolvedValue([scheduleRow]);
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-1",
      kind: "CAMPAIGN",
      status: "READY",
    });
    mocks.publishCampaign.mockResolvedValue({ recipientCount: 10, alreadyPublished: false });
    mocks.platformCommunicationPublicationSchedule.update.mockResolvedValue({});

    const summary = await processDuePlatformCommunicationPublicationSchedules();
    expect(summary.published).toBe(1);
    expect(mocks.publishCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: "comm-1", senderUserId: "user-1" }),
    );
  });

  it("claimDuePlatformCommunicationPublicationSchedules delegates to prisma query", async () => {
    mocks.$queryRaw.mockResolvedValue([]);
    const rows = await claimDuePlatformCommunicationPublicationSchedules(
      { $queryRaw: mocks.$queryRaw } as never,
      { now: new Date() },
    );
    expect(rows).toEqual([]);
    expect(mocks.$queryRaw).toHaveBeenCalled();
  });

  it("publish bridge routes campaign and club kinds", async () => {
    mocks.publishCampaign.mockResolvedValue({ recipientCount: 1, alreadyPublished: false });
    await publishScheduledPlatformCommunication({
      tenantId: "tenant-a",
      communicationId: "c1",
      kind: "CAMPAIGN",
      senderUserId: "u1",
    });
    mocks.publishClubCommunication.mockResolvedValue({ id: "c2", recipientCount: 2 });
    await publishScheduledPlatformCommunication({
      tenantId: "tenant-a",
      communicationId: "c2",
      kind: "ANNOUNCEMENT",
      senderUserId: "u1",
    });
    expect(mocks.publishCampaign).toHaveBeenCalled();
    expect(mocks.publishClubCommunication).toHaveBeenCalled();
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("blocks cancel and reschedule when schedule is not SCHEDULED", async () => {
    mocks.platformCommunicationPublicationSchedule.findFirst.mockResolvedValue({
      id: "sched-1",
      tenantId: "tenant-a",
      communicationId: "comm-1",
      status: "PROCESSING",
      timezone: "Europe/Zurich",
    });

    await expect(
      cancelPlatformCommunicationPublicationSchedule({
        tenantId: "tenant-a",
        communicationId: "comm-1",
        actorUserId: "user-1",
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);

    await expect(
      reschedulePlatformCommunicationPublication({
        tenantId: "tenant-a",
        communicationId: "comm-1",
        actorUserId: "user-1",
        scheduledAtLocal: "2099-01-01T10:00",
        now: new Date(),
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);
  });

  it("publish-now vs scheduler: only one consumer wins active schedule cancellation", async () => {
    let status: "SCHEDULED" | "CANCELLED" = "SCHEDULED";
    mocks.platformCommunicationPublicationSchedule.findFirst.mockImplementation(async () =>
      status === "SCHEDULED"
        ? {
            id: "sched-1",
            tenantId: "tenant-a",
            communicationId: "comm-1",
            status: "SCHEDULED",
          }
        : null,
    );
    mocks.platformCommunicationPublicationSchedule.updateMany.mockImplementation(async () => {
      if (status !== "SCHEDULED") return { count: 0 };
      status = "CANCELLED";
      return { count: 1 };
    });

    const results = await Promise.all([
      consumeActivePublicationScheduleForImmediatePublish({
        tenantId: "tenant-a",
        communicationId: "comm-1",
        actorUserId: "user-1",
      }),
      consumeActivePublicationScheduleForImmediatePublish({
        tenantId: "tenant-a",
        communicationId: "comm-1",
        actorUserId: "user-1",
      }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(mocks.platformCommunicationPublicationSchedule.updateMany).toHaveBeenCalledTimes(2);
  });

  it("processor marks schedule PUBLISHED without republishing when communication already published", async () => {
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
      status: "PUBLISHED",
    });
    mocks.platformCommunicationPublicationSchedule.update.mockResolvedValue({});

    const summary = await processDuePlatformCommunicationPublicationSchedules();
    expect(summary.published).toBe(1);
    expect(mocks.publishCampaign).not.toHaveBeenCalled();
    expect(mocks.platformCommunicationPublicationSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
  });

  it("processor retries transient failures by returning schedule to SCHEDULED until maxAttempts", async () => {
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
      attemptCount: 2,
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
    mocks.publishCampaign.mockRejectedValue(new Error("transient"));
    mocks.platformCommunicationPublicationSchedule.update.mockResolvedValue({});

    const summary = await processDuePlatformCommunicationPublicationSchedules();
    expect(summary.skipped).toBe(1);
    expect(mocks.platformCommunicationPublicationSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SCHEDULED",
          claimedAt: null,
          leaseExpiresAt: null,
        }),
      }),
    );
  });

  it("scheduling does not resolve audience at schedule time (execution-only COMM-03)", () => {
    const scheduleService = readFileSync(
      resolve(__dirname, "../scheduling/publication-schedule-service.ts"),
      "utf8",
    );
    const processor = readFileSync(
      resolve(__dirname, "../scheduling/publication-schedule-processor.ts"),
      "utf8",
    );
    expect(scheduleService).not.toMatch(/resolveCommunicationRecipientsForDispatch/);
    expect(processor).toMatch(/publishScheduledPlatformCommunication/);
    expect(processor).not.toMatch(/resolveCommunicationRecipientsForDispatch/);
  });

  it("claim SQL uses FOR UPDATE SKIP LOCKED in a single updating statement", () => {
    const claimSource = readFileSync(
      resolve(__dirname, "../scheduling/publication-schedule-claim.ts"),
      "utf8",
    );
    expect(claimSource).toMatch(/FOR UPDATE SKIP LOCKED/);
    expect(claimSource).toMatch(/UPDATE "PlatformCommunicationPublicationSchedule"/);
  });
});

describe("SCE-COMM-16 template draft independence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.targetGroup.findMany.mockResolvedValue([{ id: "tg-1", status: "ACTIVE" }]);
    mocks.orgUnit.count.mockResolvedValue(1);
  });

  it("template edits after draft creation do not mutate existing draft fields", async () => {
    const templateUpdatedAt = new Date("2026-09-01T10:00:00.000Z");
    const activeTemplate = {
      id: "tpl-1",
      tenantId: "tenant-a",
      name: "Tpl",
      kind: "CAMPAIGN" as const,
      status: "ACTIVE" as const,
      internalName: "Internal",
      subject: "Original subject",
      bodyText: "Original body",
      audienceSpecJson: {
        composition: "UNION" as const,
        components: [{ savedTargetGroupIds: ["tg-1"] }],
      },
      orchestrationMetaJson: defaultOrchestration(),
      updatedAt: templateUpdatedAt,
    };
    mocks.platformCommunicationTemplate.findFirst.mockResolvedValue({
      ...activeTemplate,
      subject: "Original subject",
      bodyText: "Original body",
      updatedAt: templateUpdatedAt,
    });

    mocks.createCampaignDraft.mockResolvedValue({ id: "comm-1" });
    mocks.platformCommunication.update.mockResolvedValue({});

    await createDraftFromPlatformTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
    });

    expect(mocks.createCampaignDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Original subject",
        bodyText: "Original body",
      }),
    );
    expect(mocks.platformCommunication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourcePlatformTemplateVersion: templateUpdatedAt,
        }),
      }),
    );

    mocks.platformCommunicationTemplate.update.mockResolvedValue({});
    await updatePlatformCommunicationTemplate({
      tenantId: "tenant-a",
      templateId: "tpl-1",
      actorUserId: "user-1",
      subject: "Changed subject",
      bodyText: "Changed body",
    });

    expect(mocks.platformCommunication.update).toHaveBeenCalledTimes(1);
  });

  it("archived templates cannot be used for new drafts", async () => {
    mocks.platformCommunicationTemplate.findFirst.mockResolvedValue({
      id: "tpl-1",
      tenantId: "tenant-a",
      status: "ARCHIVED",
      kind: "CAMPAIGN",
    });

    await expect(
      createDraftFromPlatformTemplate({
        tenantId: "tenant-a",
        templateId: "tpl-1",
        actorUserId: "user-1",
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);
  });
});

function defaultOrchestration() {
  return {
    schemaVersion: 1,
    channels: { inApp: true, push: true, email: true },
    scheduling: { mode: "IMMEDIATE", scheduledAt: null },
  };
}

describe("SCE-COMM-16 timezone / DST scheduling", () => {
  it("uses tenant timezone helper rather than hardcoding Zurich in schedule parsing", () => {
    const tz = resolveTenantEventTimezone("America/New_York");
    const instant = parseTenantLocalDateTimeInput("2026-08-30T09:00", tz);
    expect(instant?.toISOString()).toBe("2026-08-30T13:00:00.000Z");
  });

  it("DST spring-forward: rejects non-existent local wall times at schedule validation", () => {
    expect(() =>
      parseScheduleInstant({
        scheduledAtLocal: "2026-03-29T02:30",
        timezone: "Europe/Zurich",
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toThrow(TeamCommunicationValidationError);
  });

  it("DST fall-back: ambiguous local wall times resolve deterministically", () => {
    const tz = resolveTenantEventTimezone("Europe/Zurich");
    const first = parseTenantLocalDateTimeInput("2026-10-25T02:30", tz);
    const second = parseTenantLocalDateTimeInput("2026-10-25T02:30", tz);
    expect(first?.toISOString()).toBe("2026-10-25T01:30:00.000Z");
    expect(second?.toISOString()).toBe(first?.toISOString());
  });

  it("normal local time round-trips across DST end in Europe/Zurich", () => {
    const tz = resolveTenantEventTimezone("Europe/Zurich");
    const instant = parseTenantLocalDateTimeInput("2026-10-26T08:00", tz);
    expect(instant).not.toBeNull();
    expect(utcInstantToDateTimeLocalValue(instant!, tz)).toBe("2026-10-26T08:00");
  });
});

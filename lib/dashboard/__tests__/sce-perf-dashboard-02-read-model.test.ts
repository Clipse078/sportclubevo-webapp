import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { applyLiveAuthorizationToProjection } from "@/lib/dashboard/read-model/apply-live-authorization";
import type { PersonalDashboardReadModelPayloadV1 } from "@/lib/dashboard/read-model/types";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "@/lib/dashboard/read-model/constants";
import {
  personalCommandCenterUsesReadModelWarmPath,
  personalCommandCenterUsesSingleProgrammeLoader,
} from "@/lib/dashboard/personal-command-center";
import {
  parsePersonalDashboardReadModelPayload,
  encodePersonalDashboardReadModelPayload,
} from "@/lib/dashboard/read-model/payload-codec";

const personalCommandCenterSource = readFileSync(
  join(process.cwd(), "lib/dashboard/personal-command-center.ts"),
  "utf8",
);

const prismaMock = vi.hoisted(() => ({
  personalDashboardReadModel: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  person: { findFirst: vi.fn() },
  workspaceBackgroundJob: { create: vi.fn(), findFirst: vi.fn() },
  tenant: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("SCE-PERF-DASHBOARD-02 read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SCE_PERF_DASHBOARD_02;
    delete process.env.SCE_PERF_DASHBOARD_02_SYNC_REBUILD;
  });

  it("warm path prefers projection read over legacy aggregation", () => {
    expect(personalCommandCenterUsesReadModelWarmPath()).toBe(true);
    expect(personalCommandCenterSource).toContain("readPersonalDashboardProjection");
    expect(personalCommandCenterSource).toContain("loadPersonalCommandCenterViaLegacyAggregation");
    const warmPathSection = personalCommandCenterSource
      .split("export async function getPersonalCommandCenterData")[1]
      ?.split("return loadPersonalCommandCenterViaLegacyAggregation(args);")[0];
    expect(warmPathSection).toBeDefined();
    expect(warmPathSection!).not.toContain("loadPersonalProgramme(");
    expect(warmPathSection!).not.toContain("loadDashboardPersonalWork(");
    expect(personalCommandCenterUsesSingleProgrammeLoader()).toBe(true);
  });

  it("payload codec round-trips programme dates", () => {
    const payload: PersonalDashboardReadModelPayloadV1 = {
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      scopeHints: {
        participationNavCapable: true,
        requirementRecipientCapable: false,
        hasLinkedPerson: true,
        hasActiveTenantMembership: true,
      },
      programme: {
        supported: true,
        items: [
          {
            id: "event:abc",
            sourceType: "EVENT",
            startsAt: new Date("2026-10-02T10:00:00.000Z"),
            title: "Training",
            deepLink: "/events/abc",
            typeLabel: "Event",
            ariaLabel: "Training",
          },
        ],
      },
      personalWork: {
        attentionItems: [],
        attentionTotalCount: 0,
        viewAllHref: null,
        operationalSourcesDegraded: false,
        taskCount: 0,
        taskPreview: [],
      },
    };

    const encoded = encodePersonalDashboardReadModelPayload(payload);
    const parsed = parsePersonalDashboardReadModelPayload(encoded);
    expect(parsed?.programme.items[0]?.startsAt.toISOString()).toBe(
      "2026-10-02T10:00:00.000Z",
    );
  });

  it("live authorization does not trust stored authorized flags", () => {
    const payload: PersonalDashboardReadModelPayloadV1 = {
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      scopeHints: {
        participationNavCapable: false,
        requirementRecipientCapable: false,
        hasLinkedPerson: true,
        hasActiveTenantMembership: true,
      },
      programme: { supported: true, items: [] },
      personalWork: {
        attentionItems: [
          {
            id: "task-1",
            sourceType: "TASK",
            title: "Hidden",
            summary: null,
            dueAt: null,
            urgency: "action_required",
            contextLabel: null,
            deepLink: "/tasks/1",
            actionLabel: null,
            presentationStatus: null,
            urgent: false,
          },
        ],
        attentionTotalCount: 1,
        viewAllHref: "/aufgaben",
        operationalSourcesDegraded: false,
        taskCount: 1,
        taskPreview: [],
      },
    };

    const result = applyLiveAuthorizationToProjection({
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: [],
      payload,
    });

    expect(result.personalWork.attention.authorized).toBe(false);
    expect(result.personalWork.attention.items).toHaveLength(0);
  });

  it("projection read fails closed on missing row", async () => {
    const { readPersonalDashboardProjection } = await import(
      "@/lib/dashboard/read-model/read"
    );

    prismaMock.personalDashboardReadModel.findUnique.mockResolvedValue(null);

    const result = await readPersonalDashboardProjection({
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TRAINING_VIEW],
      fmtCfg: { locale: "de-CH", timezone: "Europe/Zurich" },
    });

    expect(result.status).toBe("miss");
    if (result.status === "miss") {
      expect(result.reason).toBe("not_found");
    }
  });

  it("legacy aggregation only when explicitly disabled", () => {
    process.env.SCE_PERF_DASHBOARD_02 = "0";
    expect(personalCommandCenterUsesReadModelWarmPath()).toBe(false);
  });
});

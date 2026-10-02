import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "@/lib/dashboard/read-model/constants";
import {
  buildTrainingActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import {
  encodePersonalDashboardReadModelPayload,
  parsePersonalDashboardReadModelPayload,
} from "@/lib/dashboard/read-model/payload-codec";
import { personalDashboardPayloadNeedsPresentationRefresh } from "@/lib/dashboard/read-model/read";

const prismaMock = vi.hoisted(() => ({
  personalDashboardReadModel: {
    findUnique: vi.fn(),
  },
}));

const rebuildMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/dashboard/read-model/rebuild", () => ({
  rebuildPersonalDashboardReadModel: rebuildMock,
}));

vi.mock("@/lib/dashboard/read-model/invalidate", () => ({
  schedulePersonalDashboardReadModelRebuild: vi.fn(),
}));

describe("SCE-ACTIVITY-UX-01R5 — personal dashboard presentation refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects legacy payloads missing activityPresentation", () => {
    const legacy = {
      v: 1 as const,
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
            id: "training:1",
            sourceType: "TRAINING" as const,
            startsAt: new Date("2026-10-05T15:00:00.000Z"),
            title: "Junioren F2 Training",
            typeLabel: "Training",
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

    expect(personalDashboardPayloadNeedsPresentationRefresh(legacy)).toBe(true);
  });

  it("synchronously rebuilds when stored payload lacks activityPresentation", async () => {
    const { readPersonalDashboardProjection } = await import(
      "@/lib/dashboard/read-model/read"
    );

    const legacyPayload = {
      v: 1,
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
            id: "training:1",
            sourceType: "TRAINING",
            startsAt: new Date("2026-10-05T15:00:00.000Z"),
            title: "Junioren F2 Training",
            typeLabel: "Training",
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

    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      clubName: "FC Allschwil",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      facilityName: "Im Brüel",
    });

    const refreshedPayload = {
      ...legacyPayload,
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      programme: {
        supported: true,
        items: [
          {
            ...legacyPayload.programme.items[0],
            activityPresentation,
          },
        ],
      },
    };

    const encodedLegacy = encodePersonalDashboardReadModelPayload(legacyPayload);
    const encodedRefreshed = encodePersonalDashboardReadModelPayload(refreshedPayload);

    prismaMock.personalDashboardReadModel.findUnique
      .mockResolvedValueOnce({
        tenantId: "tenant-a",
        updatedAt: new Date(),
        payloadJson: encodedLegacy,
      })
      .mockResolvedValueOnce({
        tenantId: "tenant-a",
        updatedAt: new Date(),
        payloadJson: encodedRefreshed,
      });

    rebuildMock.mockResolvedValue({ id: "rm-1", rebuilt: true });

    const result = await readPersonalDashboardProjection({
      tenantId: "tenant-a",
      userId: "user-a",
      permissionKeys: [PERMISSIONS.TRAININGS_VIEW],
      fmtCfg: { locale: "de-CH", timezone: "Europe/Zurich" },
    });

    expect(rebuildMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("hit");
    if (result.status === "hit" || result.status === "stale") {
      expect(result.data.programmeItems[0]?.activityPresentation?.location.hostOrOrganiser).toBe(
        "FC Allschwil",
      );
      expect(result.data.programmeItems[0]?.activityPresentation?.location.venueName).toBe(
        "Im Brüel",
      );
    }
  });

  it("payload codec round-trips activityPresentation for programme rows", () => {
    const activityPresentation = buildTournamentActivityPresentation({
      resourceKey: "event:t1",
      title: "PlayMore Turnier",
      typeLabel: "Turnier",
      organiserName: "FC Arisdorf",
      homeAway: "AWAY",
      location: "Gemeindesportplatz",
      startAt: new Date("2026-10-10T07:30:00.000Z"),
    });

    const payload = {
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
            id: "event:t1",
            sourceType: "TOURNAMENT" as const,
            startsAt: new Date("2026-10-10T07:30:00.000Z"),
            title: "PlayMore Turnier",
            typeLabel: "Turnier",
            ariaLabel: "Turnier",
            activityPresentation,
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

    const parsed = parsePersonalDashboardReadModelPayload(
      encodePersonalDashboardReadModelPayload(payload),
    );
    const item = parsed?.programme.items[0];
    expect(item?.activityPresentation?.location.hostOrOrganiser).toBe("FC Arisdorf");
    expect(item?.activityPresentation?.location.venueName).toBe("Gemeindesportplatz");
    expect(item?.activityPresentation?.context?.organiser).toBe("FC Arisdorf");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { evaluatePublication } from "@/lib/publishing/policy/publication-policy";
import { getPublicEvents } from "@/lib/events/public-event-feed";

const TENANT = "tenant-a";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("SCE-EVENTS-01B2 — Ausspielung / Infoboard semantics", () => {
  beforeEach(() => {
    vi.mocked(prisma.event.findMany).mockReset();
  });

  it("Training infoboard still requires infoboardVisible", () => {
    const hidden = {
      tenantId: TENANT,
      type: "TRAINING",
      status: "SCHEDULED",
      infoboardVisible: false,
      websiteVisible: true,
      trainingsplanVisible: true,
      homeAway: null,
    };
    expect(evaluatePublication(hidden, "INFOBOARD_SCREEN_1", TENANT).reason).toBe("INFOBOARD_HIDDEN");
  });

  it("Match infoboard still requires infoboardVisible", () => {
    const hidden = {
      tenantId: TENANT,
      type: "MATCH",
      status: "SCHEDULED",
      infoboardVisible: false,
      websiteVisible: true,
      trainingsplanVisible: false,
      homeAway: "HOME",
    };
    expect(evaluatePublication(hidden, "INFOBOARD_SCREEN_1", TENANT).reason).toBe("INFOBOARD_HIDDEN");
  });

  it("Tournament infoboard still requires infoboardVisible", () => {
    const hidden = {
      tenantId: TENANT,
      type: "TOURNAMENT",
      status: "SCHEDULED",
      infoboardVisible: false,
      websiteVisible: true,
      trainingsplanVisible: false,
      homeAway: null,
    };
    expect(evaluatePublication(hidden, "INFOBOARD_SCREEN_1", TENANT).reason).toBe("INFOBOARD_HIDDEN");
  });

  it("Veranstaltung (OTHER) is infoboard-eligible without infoboardVisible flag", () => {
    const clubEvent = {
      tenantId: TENANT,
      type: "OTHER",
      status: "SCHEDULED",
      infoboardVisible: false,
      websiteVisible: false,
      trainingsplanVisible: false,
      homeAway: null,
    };
    expect(evaluatePublication(clubEvent, "INFOBOARD_SCREEN_1", TENANT)).toEqual({
      eligible: true,
      reason: "ELIGIBLE",
    });
  });

  it("infoboard public feed includes OTHER without infoboardVisible", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt-club",
        title: "GV",
        type: "OTHER",
        infoboardVisible: false,
        websiteVisible: false,
        status: "SCHEDULED",
      },
    ] as never);

    await getPublicEvents({ surface: "infoboard", tenantId: TENANT });

    const where = vi.mocked(prisma.event.findMany).mock.calls[0]![0]!.where as Record<
      string,
      unknown
    >;
    expect(where.OR).toEqual([{ infoboardVisible: true }, { type: "OTHER" }]);
  });

  it("wochenplan surface still requires websiteVisible and wochenplanVisible", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);

    await getPublicEvents({ surface: "wochenplan", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = vi.mocked(prisma.event.findMany).mock.calls[0]![0]!.where as Record<
      string,
      unknown
    >;
    expect(where.websiteVisible).toBe(true);
    expect(where.wochenplanVisible).toBe(true);
  });

  it("website club-events surface requires websiteVisible only", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);

    await getPublicEvents({ surface: "all", tenantId: TENANT, eventTypes: ["OTHER"] });

    const where = vi.mocked(prisma.event.findMany).mock.calls[0]![0]!.where as Record<
      string,
      unknown
    >;
    expect(where.websiteVisible).toBe(true);
    expect(where.wochenplanVisible).toBeUndefined();
  });
});

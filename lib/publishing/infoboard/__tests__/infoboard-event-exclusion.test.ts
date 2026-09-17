/**
 * SCE-TRAININGS-UX-01H — club Veranstaltungen (OTHER) must never reach Infoboard feeds.
 */

import { describe, expect, it } from "vitest";
import {
  evaluatePublication,
  INFOBOARD_SUPPORTED_ACTIVITY_TYPES,
  type PublicationPolicyEvent,
} from "@/lib/publishing/policy/publication-policy";
import { selectEventsForPublication } from "@/lib/publishing/policy/event-selection";
import { buildInfoboardScreen1Feed } from "@/lib/publishing/infoboard/screen1-feed-builder";
import type { Screen1SourceEvent } from "@/lib/publishing/infoboard/screen1-event-mapper";

const TENANT = "tenant-fca";
const TZ = "Europe/Zurich";

function infoboardEvent(overrides: Partial<PublicationPolicyEvent> = {}): PublicationPolicyEvent {
  return {
    tenantId: TENANT,
    type: "TRAINING",
    status: "SCHEDULED",
    infoboardVisible: true,
    websiteVisible: true,
    trainingsplanVisible: true,
    homeAway: null,
    ...overrides,
  };
}

function makeSourceEvent(
  id: string,
  startAt: Date,
  endAt: Date,
  type: Screen1SourceEvent["type"],
  extra: Partial<Screen1SourceEvent> = {},
): Screen1SourceEvent {
  return {
    id,
    tenantId: TENANT,
    type,
    status: "SCHEDULED",
    infoboardVisible: true,
    websiteVisible: true,
    trainingsplanVisible: true,
    homeAway: type === "MATCH" || type === "TOURNAMENT" ? "HOME" : null,
    startAt,
    endAt,
    title: extra.title ?? id,
    seasonKey: "2025-26",
    ...extra,
  };
}

describe("Infoboard activity taxonomy", () => {
  it("documents supported types without OTHER / Veranstaltung", () => {
    expect(INFOBOARD_SUPPORTED_ACTIVITY_TYPES).toEqual(["TRAINING", "MATCH", "TOURNAMENT"]);
    expect(INFOBOARD_SUPPORTED_ACTIVITY_TYPES).not.toContain("OTHER");
  });
});

describe("publication policy — OTHER excluded from Infoboard", () => {
  it("rejects active club event on Screen 1", () => {
    const decision = evaluatePublication(
      infoboardEvent({ type: "OTHER", status: "LIVE", infoboardVisible: false }),
      "INFOBOARD_SCREEN_1",
      TENANT,
    );
    expect(decision).toEqual({ eligible: false, reason: "TYPE_MISMATCH" });
  });

  it("rejects upcoming club event on Screen 2", () => {
    const decision = evaluatePublication(
      infoboardEvent({ type: "OTHER", status: "SCHEDULED" }),
      "INFOBOARD_SCREEN_2",
      TENANT,
    );
    expect(decision).toEqual({ eligible: false, reason: "TYPE_MISMATCH" });
  });

  it("mixed loader keeps match and training but drops event", async () => {
    const training = makeSourceEvent(
      "t1",
      new Date("2026-09-17T15:00:00.000Z"),
      new Date("2026-09-17T16:30:00.000Z"),
      "TRAINING",
    );
    const match = makeSourceEvent(
      "m1",
      new Date("2026-09-17T17:00:00.000Z"),
      new Date("2026-09-17T18:30:00.000Z"),
      "MATCH",
    );
    const veranstaltung = makeSourceEvent(
      "v1",
      new Date("2026-09-17T14:00:00.000Z"),
      new Date("2026-09-17T18:00:00.000Z"),
      "OTHER",
      { title: "Bettagsbummel", infoboardVisible: false },
    );
    const tournament = makeSourceEvent(
      "to1",
      new Date("2026-09-17T19:00:00.000Z"),
      new Date("2026-09-17T21:00:00.000Z"),
      "TOURNAMENT",
    );

    const result = await selectEventsForPublication(
      async () => [veranstaltung, match, training, tournament],
      {
        tenantId: TENANT,
        channel: "INFOBOARD_SCREEN_1",
      },
    );

    expect(result.eligible.map((e) => e.id).sort()).toEqual(["m1", "t1", "to1"].sort());
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.event.id).toBe("v1");
    expect(result.rejected[0]?.decision.reason).toBe("TYPE_MISMATCH");
  });
});

describe("buildInfoboardScreen1Feed — rendered buckets exclude OTHER", () => {
  it("never surfaces OTHER in current/next/later even when active and mixed", async () => {
    const now = new Date("2026-09-17T15:30:00.000Z");
    const events = [
      makeSourceEvent(
        "club-event",
        new Date("2026-09-17T14:00:00.000Z"),
        new Date("2026-09-17T18:00:00.000Z"),
        "OTHER",
        { title: "Bettagsbummel", infoboardVisible: false },
      ),
      makeSourceEvent(
        "training",
        new Date("2026-09-17T15:00:00.000Z"),
        new Date("2026-09-17T16:30:00.000Z"),
        "TRAINING",
      ),
    ];

    const feed = await buildInfoboardScreen1Feed(async () => events, {
      tenant: { id: TENANT, key: "fca", name: "FC Allschwil", timezone: TZ },
      timeZone: TZ,
      now,
    });

    const allIds = [...feed.current, ...feed.next, ...feed.later].map((e) => e.id);
    expect(allIds).not.toContain("club-event");
    expect(allIds).toContain("training");
  });
});

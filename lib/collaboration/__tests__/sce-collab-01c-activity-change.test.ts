import { describe, expect, it } from "vitest";
import {
  buildClubEventActivityChangeSet,
  diffClubEventActivitySnapshots,
} from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { buildAudienceSpecFromEntries } from "@/lib/collaboration/club-event/resolve-club-event-audience";

function clubSnapshot(
  overrides: Partial<ClubEventActivitySnapshot> = {},
): ClubEventActivitySnapshot {
  return {
    eventId: "evt-1",
    tenantId: "tenant-1",
    teamId: null,
    teamSeasonId: null,
    title: "Trainerabend",
    status: "SCHEDULED",
    allDay: false,
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "19:00",
    endTime: "21:00",
    locationLabel: "Clubhaus",
    resourceLabel: null,
    playableVenueLabel: "Clubhaus",
    scheduleLine: "Montag · 19:00–21:00",
    ...overrides,
  };
}

describe("SCE-COLLAB-01C club event change detection", () => {
  it("unchanged save produces no change set", () => {
    const s = clubSnapshot();
    expect(buildClubEventActivityChangeSet(s, s)).toBeNull();
  });

  it("detects start time change", () => {
    const set = buildClubEventActivityChangeSet(
      clubSnapshot(),
      clubSnapshot({ startTime: "20:00" }),
    );
    expect(set?.entries.some((e) => e.field === "START_TIME")).toBe(true);
  });

  it("detects venue and resource independently", () => {
    const entries = diffClubEventActivitySnapshots(
      clubSnapshot(),
      clubSnapshot({
        locationLabel: "Mehrzweckraum",
        playableVenueLabel: "Mehrzweckraum",
        resourceLabel: "Saal A",
      }),
    );
    expect(entries.some((e) => e.field === "VENUE")).toBe(true);
    expect(entries.some((e) => e.field === "RESOURCE")).toBe(true);
  });

  it("ignores internal-only fields (not in snapshot diff)", () => {
    const set = buildClubEventActivityChangeSet(
      clubSnapshot({ title: "Trainerabend" }),
      clubSnapshot({ title: "Internal rename only" }),
    );
    expect(set).toBeNull();
  });

  it("cumulative net time original to latest", () => {
    const baseline = clubSnapshot({ startTime: "19:00" });
    const latest = clubSnapshot({ startTime: "20:00" });
    const set = buildClubEventActivityChangeSet(baseline, latest);
    const time = set?.entries.find((e) => e.field === "START_TIME");
    expect(time?.displayOld).toBe("19:00");
    expect(time?.displayNew).toBe("20:00");
  });

  it("revert to baseline clears net change", () => {
    const baseline = clubSnapshot({ startTime: "19:00", locationLabel: "Clubhaus" });
    const current = clubSnapshot({ startTime: "19:00", locationLabel: "Clubhaus" });
    expect(buildClubEventActivityChangeSet(baseline, current)).toBeNull();
  });
});

describe("SCE-COLLAB-01C club event audience spec", () => {
  it("builds UNION spec from participation audience entries", () => {
    const spec = buildAudienceSpecFromEntries([
      { id: "1", kind: "TEAM", referenceId: "team-a", label: "F2" },
      { id: "2", kind: "PERSON", referenceId: "p-1", label: "Max Muster" },
    ]);
    expect(spec?.composition).toBe("UNION");
    expect(spec?.components.length).toBe(2);
    const teamComponent = spec?.components.find((c) => c.structural?.teamIds?.length);
    const personComponent = spec?.components.find((c) => c.explicit?.includePersonIds?.length);
    expect(teamComponent?.structural?.teamIds).toEqual(["team-a"]);
    expect(personComponent?.explicit?.includePersonIds).toEqual(["p-1"]);
  });
});

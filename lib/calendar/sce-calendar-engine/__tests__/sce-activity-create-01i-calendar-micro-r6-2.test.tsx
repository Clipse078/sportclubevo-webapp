/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { ProgrammeCalendarMicroEntry } from "@/components/programme/ProgrammeCalendarMicroEntry";
import {
  buildCalendarMicroAccessibleLabel,
  visibleCalendarMicroSemanticValues,
} from "../calendar-micro-semantics";
import {
  buildPersonalCalendarMicroEntry,
} from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import {
  buildProgrammeCalendarMicroEntry,
} from "@/lib/programme-engine/programme-calendar-presentation";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { normalizePersonalProgrammeItem } from "@/lib/personal-agenda/normalize-calendar-item";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/facilities/display-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/facilities/display-helpers")>();
  return {
    ...actual,
    batchGetEventAllocationDisplayForTenant: vi.fn(async (events: unknown[]) =>
      events.map(() => ({
        pitchLabel: null,
        homeDressingRoomLabel: null,
        awayDressingRoomLabel: null,
      })),
    ),
  };
});

vi.mock("@/lib/website/public-matches-identity", () => ({
  loadMatchEventPoliciesByEventId: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/server/request-cache", () => ({
  getTenantClubCrestUrlCached: vi.fn(async () => "https://cdn.example/fca-tenant.png"),
}));

vi.mock("@/lib/tournaments/organizer-club-resolver", () => ({
  resolveOrganizerClubsByName: vi.fn(async () => new Map()),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveOrganizerClubsByName } from "@/lib/tournaments/organizer-club-resolver";
import { loadTeamEventProgrammeItems } from "@/lib/personal-agenda/adapters/team-event-programme-adapter";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const TENANT_LOGO = "https://cdn.example/fca.png";

function microDomOrder(container: HTMLElement): string[] {
  const link = container.querySelector("a");
  if (!link) return [];
  const slots: string[] = [];
  for (const child of link.children) {
    const testId = child.getAttribute("data-testid");
    if (testId === "sce-calendar-micro-identity") slots.push("IDENTITY");
    else if (testId === "sce-calendar-micro-time") slots.push("TIME");
    else if (testId === "sce-calendar-micro-location") slots.push("LOCATION");
    else if (!testId && child.textContent?.trim()) {
      const text = child.textContent.trim();
      if (text === child.textContent?.trim() && child.className.includes("uppercase")) {
        slots.push("TYPE");
      }
    }
  }
  const typeSpan = link.querySelector("span.font-bold.uppercase");
  if (typeSpan && slots[0] !== "TYPE") {
    return ["TYPE", ...slots];
  }
  return slots.length ? slots : ["TYPE", ...slots];
}

describe("SCE-ACTIVITY-CREATE-01I-R6.2 — identity-first MICRO hierarchy", () => {
  it("shared renderer DOM order: TYPE → IDENTITY → TIME → LOCATION", () => {
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "TRAINING:tr1",
        kind: "TRAINING",
        domainId: "tr1",
        resourceKey: "training:tr1",
        startsAt: new Date("2026-10-20T16:45:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: {
          ...createSceTrainingCardFixtureSession({
            team: { name: "Junioren B1" },
            location: buildSportingActivityLocation({
              mode: "HOME",
              hostOrOrganiser: "FC Allschwil",
              venueName: "Kunstrasen 2",
              facilityResource: "Kunstrasen 2 B",
            }),
          }),
          tenantClub: buildClubIdentity({
            displayName: "FC Allschwil",
            logoUrl: TENANT_LOGO,
          }),
        },
        teamId: "team-1",
        teamSeasonId: "ts",
        orgUnitId: null,
        navigationTarget: "/training/tr1",
      },
      FMT,
    );

    const { container } = render(<ProgrammeCalendarMicroEntry entry={entry} />);
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    const children = Array.from(link!.children);
    expect(children[0].textContent).toBe("TRAINING");
    expect(children[1].getAttribute("data-testid")).toBe("sce-calendar-micro-identity");
    expect(children[2].getAttribute("data-testid")).toBe("sce-calendar-micro-time");
    expect(children[3].getAttribute("data-testid")).toBe("sce-calendar-micro-location");
    expect(microDomOrder(container)).toEqual(["TYPE", "IDENTITY", "TIME", "LOCATION"]);
  });

  it("accessible label order: TYPE, IDENTITY, TIME, LOCATION", () => {
    const label = buildCalendarMicroAccessibleLabel({
      typeLabel: "Turnier",
      identityLabel: "PlayMore Turnier",
      accessibleIdentityPhrase: "PlayMore Turnier, organisiert von FC Arisdorf",
      timeLabel: "09:30",
      locationLabel: "Gemeindesportplatz",
    });
    expect(label).toBe(
      "Turnier, PlayMore Turnier, organisiert von FC Arisdorf, 09:30, Gemeindesportplatz",
    );
  });

  it("visible semantic values follow identity-first order", () => {
    const values = visibleCalendarMicroSemanticValues({
      typeLabel: "SPIEL",
      identityLabel: "FC Concordia Basel b",
      timeLabel: "15:00",
      locationLabel: "Sportanlagen St. Jakob",
    });
    expect(values).toEqual(["SPIEL", "FC Concordia Basel b", "15:00", "Sportanlagen St. Jakob"]);
  });

  it("training MICRO: crest + team, then time, then compact location", () => {
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "TRAINING:tr1",
        kind: "TRAINING",
        domainId: "tr1",
        resourceKey: "training:tr1",
        startsAt: new Date("2026-10-20T16:45:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: {
          ...createSceTrainingCardFixtureSession({
            team: { name: "Junioren B1" },
            location: buildSportingActivityLocation({
              mode: "HOME",
              hostOrOrganiser: "FC Allschwil",
              venueName: "Kunstrasen 2",
              facilityResource: "Kunstrasen 2 B",
            }),
          }),
          tenantClub: buildClubIdentity({
            displayName: "FC Allschwil",
            logoUrl: TENANT_LOGO,
          }),
        },
        teamId: "team-1",
        teamSeasonId: "ts",
        orgUnitId: null,
        navigationTarget: "/training/tr1",
      },
      FMT,
    );
    expect(entry.typeLabel).toBe("TRAINING");
    expect(entry.identityLabel).toBe("Junioren B1");
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.locationLabel).toBe("Kunstrasen 2 B");
    expect(entry.locationLabel).not.toContain("Kunstrasen 2 ·");
  });

  it("tournament without organiser logo: title visible, no visualIdentity", () => {
    const personalEntry = buildPersonalCalendarMicroEntry(
      {
        id: "event:t-no-logo",
        sourceType: "event",
        sourceId: "t-no-logo",
        semanticType: "TOURNAMENT",
        title: "PlayMore Turnier",
        startAt: new Date("2026-10-09T07:30:00.000Z"),
        endAt: null,
        allDay: false,
        location: "Gemeindesportplatz",
        deepLink: "/tournament/t-no-logo",
        iconKey: "tournament",
        typeLabel: "Turnier",
        ariaLabel: "Turnier",
        activityPresentation: {
          identity: {
            resourceKey: "event:t-no-logo",
            title: "PlayMore Turnier",
            typeLabel: "Turnier",
            activityKind: "TOURNAMENT",
          },
          schedule: {
            startAt: new Date("2026-10-09T07:30:00.000Z").toISOString(),
            endAt: null,
            allDay: false,
          },
          location: buildSportingActivityLocation({
            mode: "AWAY",
            hostOrOrganiser: "Unknown Club",
            venueName: "Gemeindesportplatz",
          }),
          context: {
            organiser: "Unknown Club",
            organiserLogoUrl: null,
          },
        },
      },
      FMT,
      {},
    );
    expect(personalEntry.identityLabel).toBe("PlayMore Turnier");
    expect(personalEntry.visualIdentity).toBeUndefined();
    const { container } = render(<ProgrammeCalendarMicroEntry entry={personalEntry} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R6.2 — personal tournament organiser crest path", () => {
  function buildContext(): PersonalContext {
    return {
      tenantId: "tenant-a",
      userId: "user-a",
      personId: "person-a",
      hasLinkedPerson: true,
      hasActiveTenantMembership: true,
      teams: [
        {
          teamId: "team-1",
          teamName: "Junioren B1",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
          teamSeasonIds: ["ts-team-1"],
        },
      ],
      orgUnits: [],
      assignments: [],
    };
  }

  const adapterCtx = {
    personal: buildContext(),
    permissionKeys: [PERMISSIONS.EVENTS_VIEW],
    timeZone: "Europe/Zurich",
    rangeStart: new Date("2026-10-01T00:00:00.000Z"),
    rangeEnd: new Date("2026-10-31T23:59:59.999Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ name: "FC Allschwil" } as never);
  });

  async function loadTournamentMicro(organizerName: string, logoUrl: string, title: string) {
    vi.mocked(resolveOrganizerClubsByName).mockResolvedValue(
      new Map([
        [
          organizerName,
          {
            id: `club-${organizerName.replace(/\s+/g, "-").toLowerCase()}`,
            logoUrl,
          },
        ],
      ]),
    );

    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt-t",
        tenantId: "tenant-a",
        teamId: "team-1",
        teamSeasonId: "ts-team-1",
        type: "TOURNAMENT",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title,
        startAt: new Date("2026-10-10T07:30:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: null,
        homeAway: "AWAY",
        location: "Gemeindesportplatz",
        pitchCode: null,
        organizerName,
        competitionLabel: null,
        team: { name: "Junioren B1" },
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx);
    expect(items).toHaveLength(1);
    const normalized = normalizePersonalProgrammeItem(items[0] as PersonalProgrammeItem);
    return buildPersonalCalendarMicroEntry(normalized, FMT, {});
  }

  it("FC Arisdorf external organiser crest reaches personal MICRO visualIdentity", async () => {
    const entry = await loadTournamentMicro(
      "FC Arisdorf",
      "https://cdn.example/arisdorf.png",
      "PlayMore Turnier",
    );
    expect(entry.identityLabel).toBe("PlayMore Turnier");
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Arisdorf");
    expect(entry.locationLabel).toBe("Gemeindesportplatz");
  });

  it("FC Kaiseraugst external organiser crest reaches personal MICRO visualIdentity", async () => {
    const entry = await loadTournamentMicro(
      "FC Kaiseraugst",
      "https://cdn.example/kaiseraugst.png",
      "PlayMore Turnier",
    );
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Kaiseraugst");
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
  });

  it("tenant organiser resolves tenant crest for HOME tournaments", async () => {
    vi.mocked(resolveOrganizerClubsByName).mockResolvedValue(new Map());

    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "evt-home",
        tenantId: "tenant-a",
        teamId: "team-1",
        teamSeasonId: "ts-team-1",
        type: "TOURNAMENT",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        title: "Club-Turnier",
        startAt: new Date("2026-10-12T07:30:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: null,
        homeAway: "HOME",
        location: "Im Brüel",
        pitchCode: null,
        organizerName: "FC Allschwil",
        competitionLabel: null,
        team: { name: "Junioren B1" },
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx);
    const normalized = normalizePersonalProgrammeItem(items[0] as PersonalProgrammeItem);
    const entry = buildPersonalCalendarMicroEntry(normalized, FMT, {});
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.visualIdentity?.identity.logoUrl).toBe("https://cdn.example/fca-tenant.png");
  });
});

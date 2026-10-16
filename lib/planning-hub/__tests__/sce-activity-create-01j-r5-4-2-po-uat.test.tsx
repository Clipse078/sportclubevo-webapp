/**
 * @vitest-environment jsdom
 *
 * SCE-ACTIVITY-CREATE-01J-R5.4.2 — PO UAT corrections (automated structural guards).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";
import {
  plannerActivityBlockShowsActivityIcon,
  plannerActivityBlockShowsInlineManipulationEdit,
  plannerActivityBlockShowsOperationalIndicators,
  plannerActivityBlockShowsTimeWithTypePresentation,
  plannerActivityBlockShowsTypePill,
  resolvePlannerActivityBlockDensity,
} from "@/lib/planning-hub/planner-activity-block-density";
import { shouldOfferIndividualActivityDetail } from "@/lib/planning-hub/activity-clipped-detail";
import PlanningHubActivityBlock from "@/components/admin/planning-hub/PlanningHubActivityBlock";
import type {
  WeekplannerItem,
  WeekplannerMatchItem,
  WeekplannerTournamentItem,
  WeekplannerTrainingItem,
  WeekplannerVeranstaltungItem,
} from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "res-1",
  facilityId: "fac-hf",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const WIDTH_MATRIX = [180, 128, 100, 84, 70, 56, 48, 40] as const;

function training(id: string): WeekplannerTrainingItem {
  const start = new Date("2026-09-15T10:00:00.000Z");
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    id,
    tenantId: "tenant",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Training",
    teamNames: ["Junioren F3"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

function match(id: string): WeekplannerMatchItem {
  return {
    ...training(id),
    type: "MATCH",
    opponentName: "FC Rival",
    awayDressingRoomAllocations: [],
  } as WeekplannerMatchItem;
}

function tournament(id: string): WeekplannerTournamentItem {
  return {
    ...training(id),
    type: "TOURNAMENT",
    title: "Herbst-Cup",
    eventId: "ev-tournament",
    homeAway: "HOME",
    teamSeasonIds: ["ts1"],
    participantAllocations: [],
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
  };
}

function veranstaltung(id: string): WeekplannerVeranstaltungItem {
  return {
    id,
    tenantId: "tenant",
    type: "VERANSTALTUNG",
    startAt: new Date("2026-09-15T18:00:00.000Z"),
    endAt: new Date("2026-09-15T20:00:00.000Z"),
    canonicalStartAt: new Date("2026-09-15T18:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-15T20:00:00.000Z"),
    timeOverridden: false,
    title: "Mitgliederversammlung",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: id,
    location: "Clubhaus",
    teamSeasonId: null,
    allDay: false,
  };
}

function renderBlock(item: WeekplannerItem, width: number) {
  return render(
    <PlanningHubActivityBlock
      item={item}
      locale="de-CH"
      timezone="UTC"
      onActivate={vi.fn()}
      onOpenManipulationEdit={vi.fn()}
      manipulationEditLabel="Termin ändern"
      blockLayoutPx={{ width, height: 72 }}
      style={{ width, height: 72 }}
    />,
  );
}

describe("SCE-ACTIVITY-CREATE-01J-R5.4.2 mobile-app icon", () => {
  it("maps mobile-app to canonical smartphone master in SCE registry", () => {
    expect(getNavDestinationSceIconName("mobile-app")).toBe("mobile-app");
    expect(SCE_ICON_REGISTRY["mobile-app"].geometrySource).toBe("approved-master");
    expect(SCE_ICON_REGISTRY["mobile-app"].masterAssetPath).toContain("mobile-app.svg");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4.2 universal activity detail", () => {
  it("always offers detail for individual activities regardless of density", () => {
    expect(shouldOfferIndividualActivityDetail()).toBe(true);
  });

  it.each([
    ["TRAINING", training("d-t")],
    ["MATCH", match("d-m")],
    ["TOURNAMENT", tournament("d-to")],
    ["VERANSTALTUNG", veranstaltung("d-ce")],
  ] as const)("opens hover detail for %s at MICRO width", async (_label, item) => {
    renderBlock(item, 48);
    const user = userEvent.setup();
    await user.hover(screen.getByRole("button", { name: /Junioren|FC Rival|Herbst|Mitglieder/i }));
    expect(await screen.findByTestId("planning-hub-activity-detail")).toBeInTheDocument();
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4.2 planner width matrix", () => {
  it.each(WIDTH_MATRIX)("width %ipx — density resolver and prohibited chrome", (width) => {
    const density = resolvePlannerActivityBlockDensity(width);
    expect(["WIDE", "MEDIUM", "NARROW", "MICRO"]).toContain(density);

    if (density === "NARROW" || density === "MICRO") {
      expect(plannerActivityBlockShowsTypePill(density)).toBe(false);
      expect(plannerActivityBlockShowsInlineManipulationEdit(density, width)).toBe(false);
      expect(plannerActivityBlockShowsActivityIcon(density)).toBe(false);
    }
    if (density === "MICRO") {
      expect(plannerActivityBlockShowsTimeWithTypePresentation(density)).toBe(false);
      expect(plannerActivityBlockShowsOperationalIndicators(density)).toBe(false);
    }
    if (density !== "WIDE" || width < 140) {
      expect(plannerActivityBlockShowsInlineManipulationEdit(density, width)).toBe(false);
    }
  });

  it.each(WIDTH_MATRIX)("width %ipx — training block avoids inline Termin ändern when crowded", (width) => {
    const { container } = renderBlock(training(`w-${width}`), width);
    const density = resolvePlannerActivityBlockDensity(width);
    const edit = container.querySelector('[data-testid="planning-hub-manipulation-edit-trigger"]');
    if (density !== "WIDE" || width < 140) {
      expect(edit).toBeNull();
    }
    if (density === "NARROW" || density === "MICRO") {
      expect(container.querySelector("[data-activity-type-pill]")).toBeNull();
    }
  });
});

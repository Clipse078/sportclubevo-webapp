/**
 * @vitest-environment jsdom
 * SCE-PLANNER-UX-08-01-R3 — collapsed activity, hierarchy, DnD invariants
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlanningHubResourceDayView from "@/components/admin/planning-hub/PlanningHubResourceDayView";
import { PlanningHubManipulationProvider } from "@/components/admin/planning-hub/PlanningHubManipulationContext";
import { WeekplannerVisibleTimeRangeProvider } from "@/components/admin/planning-hub/WeekplannerVisibleTimeRangeContext";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { collectCollapsedPitchGroupSegments } from "@/lib/planning-hub/resource-timeline/pitch-group-disclosure";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const FCA_PITCH_CATALOG: FacilityGroup[] = [
  {
    facilityId: "fac-kr3",
    facilityName: "Kunstrasen 3",
    resources: [
      {
        id: "KR3-f",
        name: "Kunstrasen 3",
        code: "KUNSTRASEN_3",
        type: "FULL_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
      {
        id: "KR3-a",
        name: "Kunstrasen 3 A",
        code: "KUNSTRASEN_3_A",
        type: "HALF_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
      {
        id: "KR3-b",
        name: "Kunstrasen 3 B",
        code: "KUNSTRASEN_3_B",
        type: "HALF_PITCH",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
      },
    ],
  },
];

function pitchRef(id: string, code: string, name: string) {
  return {
    facilityResourceId: id,
    facilityId: "fac-kr3",
    code,
    name,
    facilityName: "Kunstrasen 3",
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  };
}

function baseTraining(id: string, pitchId: string, code: string, name: string): WeekplannerItem {
  const ref = pitchRef(pitchId, code, name);
  return {
    tenantId: "t1",
    id,
    type: "TRAINING",
    title: `Training ${code}`,
    startAt: new Date("2026-09-20T08:00:00.000Z"),
    endAt: new Date("2026-09-20T09:00:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T08:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T09:00:00.000Z"),
    timeOverridden: false,
    teamNames: ["E1"],
    pitchAllocations: [ref],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [ref],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s",
    trainingSessionId: id,
    teamSeasonId: "ts",
  } as WeekplannerItem;
}

const WEEK: WeekplannerWeek = {
  days: [{ dayKey: "2026-09-20", items: [] }],
  weekNumberLabel: "KW 38",
  rangeLabel: "20. Sep 2026",
  param: "2026-09-14",
  previousParam: "2026-09-07",
  nextParam: "2026-09-21",
};

function renderSpielfeld(items: WeekplannerItem[], resourceFilterIds: string[] | null = null) {
  const week: WeekplannerWeek = {
    ...WEEK,
    days: [{ dayKey: "2026-09-20", items }],
  };
  render(
    <WeekplannerVisibleTimeRangeProvider>
      <PlanningHubManipulationProvider
        week={week}
        urlState={{
          week: "2026-09-14",
          perspective: "spielfeld",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          day: "2026-09-20",
          resourceFilterIds,
        }}
        locale="de-CH"
        timezone="Europe/Zurich"
        isStandardplan={false}
        alternativePlanId="plan-1"
        canManageTrainings
        canManageEvents
        facilityGroupsByAllocationGroup={{
          PITCH_HALL: FCA_PITCH_CATALOG,
          DRESSING_ROOM: [],
        }}
        resourceRows={[
          { resourceId: "KR3-f", ref: pitchRef("KR3-f", "KUNSTRASEN_3", "Kunstrasen 3") },
          { resourceId: "KR3-a", ref: pitchRef("KR3-a", "KUNSTRASEN_3_A", "A") },
          { resourceId: "KR3-b", ref: pitchRef("KR3-b", "KUNSTRASEN_3_B", "B") },
        ]}
      >
        <PlanningHubResourceDayView
          week={week}
          urlState={{
            week: "2026-09-14",
            perspective: "spielfeld",
            activity: "alle",
            team: null,
            facility: null,
            search: "",
            conflictsOnly: false,
            resourceCategory: "pitch",
            day: "2026-09-20",
            resourceFilterIds,
          }}
          locale="de-CH"
          timezone="Europe/Zurich"
          todayDayKey="2026-09-20"
          onItemActivate={vi.fn()}
          resourceCatalogGroups={{
            PITCH_HALL: FCA_PITCH_CATALOG,
            DRESSING_ROOM: [],
          }}
        />
      </PlanningHubManipulationProvider>
    </WeekplannerVisibleTimeRangeProvider>,
  );
}

describe("PlanningHubResourceDayView — R3 collapsed pitch activity", () => {
  beforeEach(() => {
    if (typeof document.elementFromPoint !== "function") {
      document.elementFromPoint = () => null;
    }
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(min-width: 768px)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders child activities on collapsed overview with segment hints Gesamt · A · B", () => {
    renderSpielfeld([
      baseTraining("t-g", "KR3-f", "KUNSTRASEN_3", "Gesamt"),
      baseTraining("t-a", "KR3-a", "KUNSTRASEN_3_A", "A"),
      baseTraining("t-b", "KR3-b", "KUNSTRASEN_3_B", "B"),
    ]);

    expect(screen.getByTestId("planning-hub-pitch-group-summary")).toHaveTextContent("3 Belegungen");
    const collapsedRow = screen.getByTestId("planning-hub-pitch-group-collapsed-row");
    expect(collapsedRow.getAttribute("data-planning-resource-id")).toMatch(/^__collapsed__/);

    const collapsedText = collapsedRow.textContent ?? "";
    expect(collapsedText).toMatch(/Gesamt/);
    expect(collapsedText).toMatch(/A ·/);
    expect(collapsedText).toMatch(/B ·/);
  });

  it("shows conflict summary when child segment has canonical conflict", () => {
    const conflictItem = {
      ...baseTraining("t-a", "KR3-a", "KUNSTRASEN_3_A", "A"),
      conflicts: [
        {
          facilityResourceId: "KR3-a",
          facilityResourceName: "A",
          kind: "PITCH_HALL" as const,
        },
      ],
    };
    renderSpielfeld([conflictItem]);
    expect(screen.getByTestId("planning-hub-pitch-group-summary")).toHaveTextContent("1 Konflikt");
  });

  it("expanded segment lanes are visually subordinate and use canonical resource ids", async () => {
    const user = userEvent.setup();
    renderSpielfeld([baseTraining("t-a", "KR3-a", "KUNSTRASEN_3_A", "A")]);
    await user.click(screen.getByTestId("planning-hub-pitch-group-toggle"));

    const segmentRow = document.querySelector('[data-planning-resource-id="KR3-a"]')!;
    expect(segmentRow).toBeTruthy();
    expect(segmentRow.getAttribute("data-testid")).toBe("planning-hub-resource-row");
    expect(
      segmentRow.querySelector('[data-planning-pitch-segment-lane="true"]'),
    ).toBeTruthy();
  });

  it("beginResourceMove uses canonical segment id on Gesamt/A/B lanes", async () => {
    renderSpielfeld([baseTraining("t-g", "KR3-f", "KUNSTRASEN_3", "Gesamt")]);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("planning-hub-pitch-group-toggle"));

    const row = document.querySelector('[data-planning-resource-id="KR3-f"]')!;
    expect(row.getAttribute("data-testid")).toBe("planning-hub-resource-row");

    const block = row.querySelector('[data-testid="planning-hub-activity-block-training"]')!;
    const body = block.querySelector("button")!;
    fireEvent.pointerDown(body, { clientX: 100, clientY: 100, button: 0, pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(body, { clientX: 130, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByRole("dialog").textContent).toMatch(/KUNSTRASEN_3|Kunstrasen 3/);
  });
});

describe("collectCollapsedPitchGroupSegments — segment hints", () => {
  it("maps whole and half segments to Gesamt / A / B hints", () => {
    const mkSeg = (id: string) => ({
      segmentId: `s:${id}`,
      item: baseTraining(id, id, "X", "X"),
      resource: pitchRef(id, "X", "X"),
      startAt: new Date("2026-09-20T08:00:00.000Z"),
      endAt: new Date("2026-09-20T09:00:00.000Z"),
    });
    const lanes = [
      {
        resourceId: "KR3-f",
        name: "Kunstrasen 3",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
        segments: [mkSeg("KR3-f")],
        presentationGroupKey: "fac-kr3",
        presentationPrimaryLabel: "Gesamt",
        presentationSecondaryLabel: null,
        presentationTier: "secondary" as const,
        presentationRole: "whole" as const,
      },
      {
        resourceId: "KR3-a",
        name: "Kunstrasen 3 A",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
        segments: [mkSeg("KR3-a")],
        presentationGroupKey: "fac-kr3",
        presentationPrimaryLabel: "A",
        presentationSecondaryLabel: null,
        presentationTier: "secondary" as const,
        presentationRole: "segment" as const,
      },
      {
        resourceId: "KR3-b",
        name: "Kunstrasen 3 B",
        facilityId: "fac-kr3",
        facilityName: "Kunstrasen 3",
        segments: [mkSeg("KR3-b")],
        presentationGroupKey: "fac-kr3",
        presentationPrimaryLabel: "B",
        presentationSecondaryLabel: null,
        presentationTier: "secondary" as const,
        presentationRole: "segment" as const,
      },
    ];
    const hints = collectCollapsedPitchGroupSegments(lanes).map((c) => c.segmentHint);
    expect(hints).toEqual(["Gesamt", "A", "B"]);
  });
});

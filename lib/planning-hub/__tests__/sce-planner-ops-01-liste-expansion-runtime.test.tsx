/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PlanningHubListeOperationalPanel from "@/components/admin/planning-hub/PlanningHubListeOperationalPanel";
import { PlanningHubListeOperationalPanelErrorBoundary } from "@/components/admin/planning-hub/PlanningHubListeOperationalPanelErrorBoundary";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { weekplannerMatchPublicationVisibilityFixture } from "@/lib/weekplanner/match-item-fixtures";
import type { WeekplannerMatchItem, WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import { weekplannerMatchToMatchcenterSummary } from "@/lib/planning-hub/weekplanner-match-matchcenter-bridge";
import { reviveWeekplannerItemFromTransport } from "@/lib/planning-hub/manipulation-transport";
import { PlanningHubPlannerWeekProvider, usePlanningHubPlannerWeek } from "@/components/admin/planning-hub/PlanningHubPlannerWeekContext";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

vi.mock("@/hooks/use-facility-availability", () => ({
  useFacilityAvailability: () => ({
    pitchAvailability: new Map(),
    dressingRoomAvailability: new Map(),
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const PITCH_GROUPS = [
  {
    facilityId: "f1",
    facilityName: "Im Brüel",
    facilityType: "SPORTS_GROUND" as const,
    resources: [
      {
        id: "res-kr2",
        code: "KR2",
        name: "Kunstrasen 2",
        type: "FULL_PITCH" as const,
        facilityId: "f1",
        facilityName: "Im Brüel",
        facilityType: "SPORTS_GROUND" as const,
      },
    ],
  },
];

const DRESSING_GROUPS = [
  {
    facilityId: "f2",
    facilityName: "Kabinen",
    facilityType: "DRESSING_BLOCK" as const,
    resources: [
      {
        id: "res-o4",
        code: "O4",
        name: "Kabine O4",
        type: "DRESSING_ROOM" as const,
        facilityId: "f2",
        facilityName: "Kabinen",
        facilityType: "DRESSING_BLOCK" as const,
      },
    ],
  },
];

function rscMatchItem(): WeekplannerMatchItem {
  return {
    id: "match:e1",
    tenantId: "tenant-1",
    type: "MATCH",
    startAt: "2027-03-05T16:00:00.000Z" as unknown as Date,
    endAt: "2027-03-05T18:00:00.000Z" as unknown as Date,
    canonicalStartAt: "2027-03-05T16:00:00.000Z" as unknown as Date,
    canonicalEndAt: "2027-03-05T18:00:00.000Z" as unknown as Date,
    timeOverridden: false,
    title: "Home — Away",
    teamNames: ["Home"],
    opponentName: "Away",
    eventSource: "MANUAL",
    homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
    homeAway: "HOME",
    eventId: "e1",
    teamSeasonId: "ts-1",
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    awayDressingRoomAllocations: [],
    publicationVisibility: weekplannerMatchPublicationVisibilityFixture({ infoboardVisible: false }),
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

const TENANT_DRESSING_PRESETS = {
  training: { beforeMinutes: 15, afterMinutes: 15 },
  match: { beforeMinutes: 45, afterMinutes: 30 },
  tournament: { beforeMinutes: 45, afterMinutes: 30 },
} as const;

function trainingItem(): WeekplannerTrainingItem {
  return {
    id: "train-1",
    tenantId: "tenant-1",
    type: "TRAINING",
    startAt: new Date("2026-08-10T16:00:00.000Z"),
    endAt: new Date("2026-08-10T17:30:00.000Z"),
    canonicalStartAt: new Date("2026-08-10T16:00:00.000Z"),
    canonicalEndAt: new Date("2026-08-10T17:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["E3"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "series-1",
    trainingSessionId: "session-1",
    teamSeasonId: "ts-1",
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

function poJuniorenF2TrainingItem(): WeekplannerTrainingItem {
  const pitchRef = {
    facilityResourceId: "res-kr2",
    facilityId: "f1",
    code: "KR2",
    name: "Kunstrasen 2",
    facilityName: "Im Brüel",
    resourceType: "FULL_PITCH" as const,
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  };
  const roomRef = {
    facilityResourceId: "res-o4",
    facilityId: "f2",
    code: "O4",
    name: "Kabine O4",
    facilityName: "Garderoben",
    resourceType: "DRESSING_ROOM" as const,
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  };
  return {
    ...trainingItem(),
    id: "training:f2-2026-11-09",
    title: "Junioren F2 Training",
    teamNames: ["Junioren F2"],
    trainingSessionId: "session-f2",
    startAt: new Date("2026-11-09T16:00:00.000Z"),
    endAt: new Date("2026-11-09T17:30:00.000Z"),
    canonicalStartAt: new Date("2026-11-09T16:00:00.000Z"),
    canonicalEndAt: new Date("2026-11-09T17:30:00.000Z"),
    pitchAllocations: [pitchRef],
    dressingRoomAllocations: [roomRef],
    canonicalPitchAllocations: [pitchRef],
    canonicalDressingRoomAllocations: [roomRef],
    dressingRoomResolvedBeforeMinutes: 15,
    dressingRoomResolvedAfterMinutes: 15,
    conflicts: [
      {
        id: "conflict-kr2",
        resourceKind: "PITCH_HALL",
        facilityResourceId: "res-kr2",
        facilityResourceName: "Kunstrasen 2",
        partnerTitle: "Junioren E1 Training",
        overlapStartAt: new Date("2026-11-09T16:00:00.000Z"),
        overlapEndAt: new Date("2026-11-09T17:00:00.000Z"),
        occupancyStartAt: new Date("2026-11-09T15:45:00.000Z"),
        occupancyEndAt: new Date("2026-11-09T17:30:00.000Z"),
      },
    ],
  };
}

function operationalPanelProps(
  item: Parameters<typeof PlanningHubListeOperationalPanel>[0]["item"],
  overrides: Partial<Parameters<typeof PlanningHubListeOperationalPanel>[0]> = {},
): Parameters<typeof PlanningHubListeOperationalPanel>[0] {
  return {
    item,
    locale: "de-CH",
    timezone: "Europe/Zurich",
    focus: null,
    facilityGroupsByAllocationGroup: { PITCH_HALL: PITCH_GROUPS, DRESSING_ROOM: DRESSING_GROUPS },
    plannerEditAccess: {
      canManageTrainings: true,
      canManageEvents: true,
      canManageAllocations: true,
    },
    tenantDressingRoomOccupancyPresets: TENANT_DRESSING_PRESETS,
    alternativePlanActive: false,
    onSaved: () => {},
    ...overrides,
  };
}

describe("SCE-PLANNER-OPS-01 Liste expansion runtime", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ availability: [] }),
    });
  });

  it("renders HOME match preparation when week items carry RSC-serialized instants", () => {
    const item = rscMatchItem();
    expect(() => weekplannerMatchToMatchcenterSummary(item).startAt.toISOString()).not.toThrow();

    renderWithToast(<PlanningHubListeOperationalPanel {...operationalPanelProps(item)} />);

    expect(screen.getByTestId("matchcenter-inline-resources-e1")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-inline-pitch-e1")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-inline-dressing-e1")).toBeInTheDocument();
  });

  it("renders training preparation when canonical instants arrive as ISO strings (RSC transport)", () => {
    const rawTraining = trainingItem();
    const transported = {
      ...rawTraining,
      startAt: rawTraining.startAt.toISOString(),
      endAt: rawTraining.endAt.toISOString(),
      canonicalStartAt: rawTraining.canonicalStartAt.toISOString(),
      canonicalEndAt: rawTraining.canonicalEndAt.toISOString(),
    } as unknown as WeekplannerTrainingItem;

    renderWithToast(<PlanningHubListeOperationalPanel {...operationalPanelProps(transported)} />);

    expect(screen.getByTestId("planning-hub-liste-training-resources-train-1")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-training-pitch-train-1")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-training-dressing-train-1")).toBeInTheDocument();
  });

  it("groups training pitch and garderobe rows in one resource block", () => {
    renderWithToast(<PlanningHubListeOperationalPanel {...operationalPanelProps(trainingItem())} />);

    expect(screen.getByTestId("planning-hub-liste-training-resources-train-1")).toBeInTheDocument();
    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
    expect(screen.getByText("Garderobe")).toBeInTheDocument();
  });

  it("shows recoverable panel error instead of crashing the tree", () => {
    function BoomPanel() {
      throw new Error("panel render failure");
    }

    render(
      <PlanningHubListeOperationalPanelErrorBoundary itemId="train-1">
        <BoomPanel />
      </PlanningHubListeOperationalPanelErrorBoundary>,
    );

    expect(screen.getByTestId("planning-hub-liste-operational-error-train-1")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Betriebsbereich konnte nicht geladen werden");
    expect(screen.getByRole("alert")).toHaveTextContent("Bitte schliessen Sie die Ansicht");
    expect(screen.queryByText(/Browser-Konsole/i)).not.toBeInTheDocument();
  });

  it("provider + panel composition tolerates ISO week transport for match and training", () => {
    function WeekProbe({ item }: { item: WeekplannerTrainingItem }) {
      const ctx = usePlanningHubPlannerWeek();
      const weekItem = ctx?.week.days[0]?.items[0];
      if (!weekItem || weekItem.type !== "TRAINING") return null;
      return <PlanningHubListeOperationalPanel {...operationalPanelProps(weekItem)} />;
    }

    const isoStart = "2026-08-10T16:00:00.000Z";
    const isoEnd = "2026-08-10T17:30:00.000Z";
    const transported = reviveWeekplannerItemFromTransport(trainingItem());
    const week = {
      param: "2026-33",
      previousParam: "2026-32",
      nextParam: "2026-34",
      weekNumberLabel: "KW 33",
      rangeLabel: "range",
      days: [
        {
          dayKey: "2026-08-10",
          items: [
            {
              ...transported,
              startAt: isoStart,
              endAt: isoEnd,
              canonicalStartAt: isoStart,
              canonicalEndAt: isoEnd,
            } as unknown as WeekplannerTrainingItem,
          ],
        },
      ],
    };

    renderWithToast(
      <PlanningHubPlannerWeekProvider serverWeek={week} timezone="Europe/Zurich">
        <WeekProbe item={trainingItem()} />
      </PlanningHubPlannerWeekProvider>,
    );

    expect(screen.getByTestId("planning-hub-liste-training-resources-train-1")).toBeInTheDocument();
  });

  it("shows Betriebsbereich fallback when ToastProvider is missing (PO Training expansion class)", () => {
    const transported = JSON.parse(JSON.stringify(poJuniorenF2TrainingItem())) as WeekplannerTrainingItem;

    render(<PlanningHubListeOperationalPanel {...operationalPanelProps(transported)} />);

    expect(screen.getByTestId("planning-hub-liste-operational-error-training:f2-2026-11-09")).toBeInTheDocument();
    expect(screen.queryByTestId("planning-hub-liste-training-pitch-training:f2-2026-11-09")).not.toBeInTheDocument();
  });

  it("renders Junioren F2 PO training controls under provider + ISO transport + conflict payload", () => {
    const transported = JSON.parse(JSON.stringify(poJuniorenF2TrainingItem())) as WeekplannerTrainingItem;

    renderWithToast(<PlanningHubListeOperationalPanel {...operationalPanelProps(transported)} />);

    const panelId = "training:f2-2026-11-09";
    expect(screen.getByTestId(`planning-hub-liste-operational-panel-${panelId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`planning-hub-liste-training-resources-${panelId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`planning-hub-liste-training-pitch-${panelId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`planning-hub-liste-training-dressing-${panelId}`)).toBeInTheDocument();
    expect(screen.getByTestId("dressing-room-occupancy-editor")).toBeInTheDocument();
    expect(screen.queryByTestId(`planning-hub-liste-operational-error-${panelId}`)).not.toBeInTheDocument();
    expect(screen.getByText(/1 Konflikt/)).toBeInTheDocument();
  });
});

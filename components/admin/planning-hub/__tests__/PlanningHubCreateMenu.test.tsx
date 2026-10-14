/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubCreateMenu from "../PlanningHubCreateMenu";
import type { TrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/planner/week",
  useSearchParams: () => new URLSearchParams("week=2026-09-15&ansicht=kalender"),
}));

vi.mock("@/components/admin/training/TrainingCreateForm", () => ({
  default: ({
    open,
    containerMode,
  }: {
    open: boolean;
    containerMode: string;
  }) =>
    open ? (
      <div data-testid="training-create-form-mock" data-container-mode={containerMode} />
    ) : null,
}));

const trainingComposer: TrainingComposerCreateSurfaceProps = {
  teamSeasons: [],
  pitchHallFacilityGroups: [],
  dressingRoomFacilityGroups: [],
  timeZone: "Europe/Zurich",
  defaultTrainingDurationMinutes: 90,
  effectiveGovernance: {
    activityType: "TRAINING",
    personId: "p1",
    mayCreate: true,
    publicationAuthority: "DIRECT_PUBLISH",
    approvalStrategy: "ANY_ONE",
    validatorPersonIds: [],
  },
};

describe("PlanningHubCreateMenu — canonical re-export", () => {
  it("opens Training composer overlay without /dashboard/training/new navigation", () => {
    render(
      <PlanningHubCreateMenu
        permissions={{ training: true, match: false, tournament: false, veranstaltung: false }}
        trainingComposer={trainingComposer}
        plannerUrlState={{
          week: "2026-09-15",
          perspective: "kalender",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        reconcilePlanningHub
      />,
    );

    fireEvent.click(screen.getByTestId("sce-activity-create"));
    const trainingItem = screen.getByTestId("sce-activity-create-training-overlay");
    expect(trainingItem.tagName).toBe("BUTTON");
    fireEvent.click(trainingItem);
    expect(screen.getByTestId("training-create-form-mock")).toHaveAttribute(
      "data-container-mode",
      "overlay",
    );
  });
});

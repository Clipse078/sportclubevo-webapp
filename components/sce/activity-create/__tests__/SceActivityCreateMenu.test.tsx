/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SceActivityCreateMenu from "../SceActivityCreateMenu";
import type { TrainingComposerCreateSurfaceProps } from "@/lib/training/composer/load-training-composer-create-surface-props.server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/planner/week",
  useSearchParams: () => new URLSearchParams("week=2026-09-15&ansicht=kalender"),
}));

vi.mock("@/components/admin/training/TrainingCreateForm", () => ({
  default: ({ open, containerMode }: { open: boolean; containerMode: string }) =>
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

describe("SceActivityCreateMenu", () => {
  it("opens Training composer overlay from canonical trigger", () => {
    render(
      <SceActivityCreateMenu
        permissions={{ training: true, match: false, tournament: false, veranstaltung: false }}
        trainingComposer={trainingComposer}
        reconcilePlanningHub
      />,
    );

    fireEvent.click(screen.getByTestId("sce-activity-create"));
    fireEvent.click(screen.getByTestId("sce-activity-create-training-overlay"));
    expect(screen.getByTestId("training-create-form-mock")).toHaveAttribute(
      "data-container-mode",
      "overlay",
    );
  });

  it("hides unauthorized activity types", () => {
    render(
      <SceActivityCreateMenu
        permissions={{ training: true, match: false, tournament: false, veranstaltung: false }}
        trainingComposer={trainingComposer}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-create"));
    expect(screen.queryByTestId("sce-activity-create-match-overlay")).not.toBeInTheDocument();
  });

  it("keeps sr-only page fallback when overlay props exist", () => {
    render(
      <SceActivityCreateMenu
        permissions={{ training: true, match: false, tournament: false, veranstaltung: false }}
        trainingComposer={trainingComposer}
      />,
    );
    expect(screen.getByTestId("sce-activity-create-training-page-fallback")).toHaveAttribute(
      "href",
      "/dashboard/training/new",
    );
  });
});

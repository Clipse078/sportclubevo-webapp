/**
 * @vitest-environment jsdom
 */

import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SceTrainingCard } from "../SceTrainingCard";
import {
  createSceTrainingCardFixtureRecurring,
  createSceTrainingCardFixtureSession,
} from "../__fixtures__/sce-training-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

function renderCard(
  model = createSceTrainingCardFixtureSession(),
  density: SceActivityPresentationDensity = "STANDARD",
  props: Partial<ComponentProps<typeof SceTrainingCard>> = {},
) {
  return render(
    <SceTrainingCard model={model} density={density} fmtCfg={FMT} linkToDetail={false} {...props} />,
  );
}

describe("SCE-UI-ROLLOUT-01E — SceTrainingCard", () => {
  it.each(DENSITIES)("renders training identity without match fixture semantics at %s", (density) => {
    renderCard(undefined, density);
    expect(screen.queryByText(/VS/i)).toBeNull();
    expect(screen.queryByText(/gegen/i)).toBeNull();
    if (density === "MICRO") {
      expect(screen.getByTestId("sce-training-micro-identity")).toHaveTextContent("Junioren B1");
    } else {
      expect(screen.getByTestId("sce-training-title")).toHaveTextContent("Junioren B1 Training");
    }
  });

  it("shows team and location hierarchy for STANDARD session", () => {
    renderCard(createSceTrainingCardFixtureSession(), "STANDARD");
    expect(screen.getByTestId("sce-training-team")).toHaveTextContent("Junioren B1");
    expect(screen.getByTestId("sce-training-location")).toHaveTextContent(
      "FC Allschwil · Im Brüel · KR2",
    );
  });

  it("degrades location when venue missing", () => {
    renderCard(
      createSceTrainingCardFixtureSession({
        location: {
          mode: "HOME",
          hostOrOrganiser: "FC Allschwil",
          facilityResource: "KR2",
        },
      }),
      "STANDARD",
    );
    expect(screen.getByTestId("sce-training-location")).toHaveTextContent("FC Allschwil · KR2");
  });

  it("omits location row when all fragments missing", () => {
    renderCard(
      createSceTrainingCardFixtureSession({
        location: { mode: "HOME" },
      }),
      "STANDARD",
    );
    expect(screen.queryByTestId("sce-training-location")).toBeNull();
  });

  it("renders recurring weekday rhythm separately from session date", () => {
    renderCard(createSceTrainingCardFixtureRecurring(), "STANDARD");
    expect(screen.getByTestId("sce-training-schedule-weekdays")).toHaveTextContent("Mo · Mi · Fr");
    expect(screen.getByTestId("sce-training-schedule-time")).toHaveTextContent("18:45–20:15");
    expect(screen.queryByText(/1970/i)).toBeNull();
  });

  it("COMPACT layout surfaces rhythm and time in secondary column", () => {
    renderCard(createSceTrainingCardFixtureRecurring(), "COMPACT");
    expect(screen.getByTestId("sce-training-compact-weekdays")).toHaveTextContent("Mo · Mi · Fr");
    expect(screen.getByTestId("sce-training-compact-time")).toHaveTextContent("18:45–20:15");
    expect(screen.getByTestId("sce-training-context-line")).toHaveTextContent("Junioren B1");
    expect(screen.getByTestId("sce-training-context-line")).toHaveTextContent("KR2");
  });

  it("MICRO prioritises team, time, and resource", () => {
    renderCard(createSceTrainingCardFixtureSession(), "MICRO");
    expect(screen.getByTestId("sce-training-micro-identity")).toHaveTextContent("Junioren B1");
    expect(screen.getByTestId("sce-training-micro-time")).toHaveTextContent("18:45");
    expect(screen.getByTestId("sce-training-micro-location")).toHaveTextContent("KR2");
  });

  it("status label is visible text not color-only", () => {
    renderCard(createSceTrainingCardFixtureSession(), "STANDARD");
    expect(screen.getByTestId("sce-training-status")).toHaveTextContent("Aktiv");
  });

  it("uses canonical consume route when link enabled", () => {
    renderCard(createSceTrainingCardFixtureSession(), "STANDARD", { linkToDetail: true });
    expect(screen.getByTestId("sce-training-card-link")).toHaveAttribute(
      "href",
      "/dashboard/activity/training-session/fixture-1",
    );
  });

  it("does not invent local training URLs", () => {
    const { container } = renderCard(createSceTrainingCardFixtureSession(), "HERO", {
      linkToDetail: true,
    });
    const links = within(container).queryAllByRole("link");
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/dashboard\/activity\//);
    }
  });

  it("long titles truncate without horizontal overflow class assumptions", () => {
    const longTitle = "Junioren B1 Technik und Spielübungen mit sehr langem Namen ".repeat(2);
    renderCard(createSceTrainingCardFixtureSession({ trainingTitle: longTitle.trim() }), "MICRO");
    const title = screen.getByTestId("sce-training-micro-identity");
    expect(title.className).toContain("truncate");
  });
});

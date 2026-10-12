/**
 * @vitest-environment jsdom
 */

import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SceTournamentCard } from "../SceTournamentCard";
import { createSceTournamentCardFixture } from "../__fixtures__/sce-tournament-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

function renderCard(
  model = createSceTournamentCardFixture(),
  density: SceActivityPresentationDensity = "STANDARD",
  props: Partial<ComponentProps<typeof SceTournamentCard>> = {},
) {
  return render(
    <SceTournamentCard model={model} density={density} fmtCfg={FMT} linkToDetail={false} {...props} />,
  );
}

describe("SCE-UI-ROLLOUT-01F — SceTournamentCard", () => {
  it.each(DENSITIES)("renders tournament identity without match fixture semantics at %s", (density) => {
    renderCard(undefined, density);
    expect(screen.queryByText(/^VS$/i)).toBeNull();
    expect(screen.queryByText(/gegen/i)).toBeNull();
    expect(screen.queryByTestId("sce-match-card")).toBeNull();
    if (density === "MICRO") {
      expect(screen.getByTestId("sce-tournament-micro-title")).toHaveTextContent("Junioren F Turnier");
      expect(screen.getByTestId("sce-tournament-micro-organiser")).toHaveTextContent("FC Arisdorf");
    } else {
      expect(screen.getByTestId("sce-tournament-title")).toHaveTextContent("Junioren F Turnier");
    }
  });

  it.each(DENSITIES)("organiser remains visible at %s", (density) => {
    renderCard(undefined, density);
    if (density === "MICRO") {
      expect(screen.getByTestId("sce-tournament-micro-organiser")).toHaveTextContent("FC Arisdorf");
    } else if (density === "COMPACT") {
      expect(screen.getByTestId("sce-tournament-context-line")).toHaveTextContent("FC Arisdorf");
    } else {
      expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Arisdorf");
    }
  });

  it("keeps hauptteam distinct from organiser at STANDARD", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD");
    expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Arisdorf");
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F2");
  });

  it("location line excludes organiser duplication", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD");
    expect(screen.getByTestId("sce-tournament-location")).toHaveTextContent(
      "Gemeindesportplatz · Platz 1",
    );
    expect(screen.getByTestId("sce-tournament-location")).not.toHaveTextContent("FC Arisdorf");
  });

  it("degrades location when venue missing", () => {
    renderCard(
      createSceTournamentCardFixture({
        location: {
          mode: "AWAY",
          hostOrOrganiser: "FC Arisdorf",
          facilityResource: "Platz 1",
        },
      }),
      "STANDARD",
    );
    expect(screen.getByTestId("sce-tournament-location")).toHaveTextContent("Platz 1");
  });

  it("omits location row when all venue fragments missing", () => {
    renderCard(
      createSceTournamentCardFixture({
        location: { mode: "AWAY", hostOrOrganiser: "FC Arisdorf" },
      }),
      "STANDARD",
    );
    expect(screen.queryByTestId("sce-tournament-location")).toBeNull();
  });

  it("COMPACT combines organiser and hauptteam on identity line", () => {
    renderCard(createSceTournamentCardFixture(), "COMPACT");
    expect(screen.getByTestId("sce-tournament-context-line")).toHaveTextContent("FC Arisdorf");
    expect(screen.getByTestId("sce-tournament-context-line")).toHaveTextContent("Junioren F2");
  });

  it("status label is visible text not color-only", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD");
    expect(screen.getByTestId("sce-tournament-status")).toHaveTextContent("Geplant");
  });

  it("uses canonical consume route when link enabled", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD", { linkToDetail: true });
    expect(screen.getByTestId("sce-tournament-card-link")).toHaveAttribute(
      "href",
      "/dashboard/activity/event/fixture-tournament-1",
    );
  });

  it("does not invent local tournament URLs", () => {
    const { container } = renderCard(createSceTournamentCardFixture(), "HERO", {
      linkToDetail: true,
    });
    const links = within(container).queryAllByRole("link");
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/dashboard\//);
    }
  });

  it("long titles truncate without horizontal overflow class assumptions", () => {
    const longTitle = "Junioren F Hallenturnier mit sehr langem Namen ".repeat(2);
    renderCard(createSceTournamentCardFixture({ tournamentTitle: longTitle.trim() }), "MICRO");
    const title = screen.getByTestId("sce-tournament-micro-title");
    expect(title.className).toContain("truncate");
  });

  it("accessible label includes organiser", () => {
    renderCard(
      createSceTournamentCardFixture({
        organiser: buildClubIdentity({ displayName: "FC Therwil", logoUrl: null }),
      }),
      "STANDARD",
    );
    expect(screen.getByLabelText(/FC Therwil/)).toBeTruthy();
  });
});

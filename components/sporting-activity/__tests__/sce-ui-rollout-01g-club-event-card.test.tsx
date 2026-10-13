/**
 * @vitest-environment jsdom
 */

import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SceClubEventCard } from "../SceClubEventCard";
import { SceClubEventCardPreviewGallery } from "../SceClubEventCardPreviewGallery";
import {
  createSceClubEventAllDayFixture,
  createSceClubEventMissingLocationFixture,
  createSceClubEventMissingOrganiserFixture,
  createSceClubEventTimedFixture,
} from "../__fixtures__/sce-club-event-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

function renderCard(
  model = createSceClubEventTimedFixture(),
  density: SceActivityPresentationDensity = "STANDARD",
  props: Partial<ComponentProps<typeof SceClubEventCard>> = {},
) {
  return render(
    <SceClubEventCard model={model} density={density} fmtCfg={FMT} linkToDetail={false} {...props} />,
  );
}

describe("SCE-UI-ROLLOUT-01G — SceClubEventCard", () => {
  it.each(DENSITIES)("renders club event identity without match/tournament/training semantics at %s", (density) => {
    renderCard(undefined, density);
    expect(screen.queryByText(/^VS$/i)).toBeNull();
    expect(screen.queryByText(/gegen/i)).toBeNull();
    expect(screen.queryByTestId("sce-match-card")).toBeNull();
    expect(screen.queryByTestId("sce-tournament-title")).toBeNull();
    expect(screen.queryByTestId("sce-training-title")).toBeNull();
    if (density === "MICRO") {
      expect(screen.getByTestId("sce-club-event-micro-title")).toHaveTextContent("Clubabend");
    } else {
      expect(screen.getByTestId("sce-club-event-title")).toHaveTextContent("Clubabend");
    }
  });

  it("shows VERANSTALTUNG activity type text via ActivityTypePill", () => {
    renderCard();
    const pill = screen.getByText("VERANSTALTUNG");
    expect(pill.getAttribute("data-activity-type-pill")).toBe("club-event-violet");
  });

  it("context-header surface renders schedule and location without nested card link", () => {
    renderCard(createSceClubEventTimedFixture(), "STANDARD", {
      surface: "context-header",
    });
    expect(screen.getByTestId("sce-club-event-schedule")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-location")).toBeTruthy();
    expect(screen.queryByTestId("sce-club-event-card-link")).toBeNull();
  });

  it("renders optional audience line when model provides authoritative scope", () => {
    renderCard(
      createSceClubEventTimedFixture({
        audience: {
          scope: "CLUB_WIDE",
          primaryLabel: "FC Allschwil / Gesamter Verein",
        },
      }),
      "STANDARD",
    );
    expect(screen.getByTestId("sce-club-event-audience")).toHaveTextContent("Gesamter Verein");
  });

  it("all-day events show Ganztägig — not 00:00–23:59", () => {
    renderCard(createSceClubEventAllDayFixture(), "STANDARD");
    expect(screen.getByTestId("sce-club-event-schedule-time")).toHaveTextContent("Ganztägig");
    expect(screen.queryByText(/00:00/)).toBeNull();
  });

  it("timed events preserve schedule range", () => {
    renderCard(createSceClubEventTimedFixture(), "STANDARD");
    const time = screen.getByTestId("sce-club-event-schedule-time");
    expect(time.textContent).toMatch(/18:00/);
  });

  it("optional organiser can be omitted", () => {
    renderCard(createSceClubEventMissingOrganiserFixture(), "STANDARD");
    expect(screen.queryByTestId("sce-club-event-organiser")).toBeNull();
    expect(screen.getByTestId("sce-club-event-title")).toHaveTextContent("Clubabend");
  });

  it("location hierarchy renders human labels", () => {
    renderCard(createSceClubEventTimedFixture(), "STANDARD");
    expect(screen.getByTestId("sce-club-event-location")).toHaveTextContent("Im Brüel");
    expect(screen.getByTestId("sce-club-event-location")).toHaveTextContent("Clubhaus");
  });

  it("missing location omits location row", () => {
    renderCard(createSceClubEventMissingLocationFixture(), "STANDARD");
    expect(screen.queryByTestId("sce-club-event-location")).toBeNull();
  });

  it("status badge is textual", () => {
    renderCard(createSceClubEventTimedFixture(), "STANDARD");
    expect(screen.getByTestId("sce-club-event-status")).toHaveTextContent("Geplant");
  });

  it("optional tenant organiser crest uses object-contain without circular mask", () => {
    renderCard(createSceClubEventTimedFixture(), "HERO");
    const crest = screen.getByTestId("sce-club-event-organiser-crest");
    const img = within(crest).getByTestId("club-crest-image");
    expect(img.className).toContain("object-contain");
    expect(img.className).not.toContain("rounded-full");
  });

  it("preview gallery covers representative fixtures", () => {
    render(<SceClubEventCardPreviewGallery />);
    expect(screen.getByTestId("sce-club-event-preview-timed")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-preview-all-day")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-preview-long-title")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-preview-missing-organiser")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-preview-missing-location")).toBeTruthy();
  });

  it("does not hardcode local semantic hex colors in card source", () => {
    const source = readFileSync(
      join(process.cwd(), "components/sporting-activity/SceClubEventCard.tsx"),
      "utf8",
    );
    expect(source).toContain("activity-card-semantic-tokens");
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

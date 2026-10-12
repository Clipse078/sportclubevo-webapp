/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SceMatchCard } from "../SceMatchCard";
import {
  createSceMatchCardFixtureMatch,
  resolveSceMatchCardFixture,
} from "../__fixtures__/sce-match-card-fixtures";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

function renderCard(
  overrides: Parameters<typeof resolveSceMatchCardFixture>[0] = {},
  density: SceActivityPresentationDensity = "STANDARD",
) {
  const model = resolveSceMatchCardFixture(overrides);
  return render(
    <SceMatchCard model={model} density={density} fmtCfg={FMT} linkToDetail={false} />,
  );
}

function homeAwaySides(container: HTMLElement) {
  const fixture = container.querySelector('[data-testid="sce-match-fixture"]');
  expect(fixture).toBeTruthy();
  const home = fixture!.querySelector('[data-sce-match-side="home"]');
  const away = fixture!.querySelector('[data-sce-match-side="away"]');
  return { home, away, fixture };
}

function stackedIdentityOrder(sideEl: Element | null | undefined) {
  expect(sideEl).toBeTruthy();
  const crest = sideEl!.querySelector('[data-sce-match-region$="-crest"]');
  const name = sideEl!.querySelector('[data-sce-match-region$="-name"]');
  expect(name).toBeTruthy();
  if (crest && name) {
    expect(crest.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  return { crest, name };
}

describe("SCE-UI-ROLLOUT-01D — SceMatchCard", () => {
  it.each(DENSITIES)("renders fixture home left / away right at density %s", (density) => {
    const { container } = renderCard({}, density);
    const { home, away } = homeAwaySides(container);
    expect(home?.textContent).toContain("FC Allschwil");
    expect(away?.textContent).toContain("FC Therwil");

    expect(home && away).toBeTruthy();
    if (home && away) {
      expect(home.compareDocumentPosition(away) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("keeps FCA on the right when tenant plays away without reversing fixture semantics", () => {
    const { container } = renderCard({
      homeAway: "AWAY",
      home: {
        ...createSceMatchCardFixtureMatch().home,
        displayName: "FC Liestal",
        isOwnTeam: false,
        externalLogoUrl: "https://cdn.example/l.png",
      },
      away: {
        ...createSceMatchCardFixtureMatch().away,
        displayName: "FC Allschwil",
        isOwnTeam: true,
        externalLogoUrl: null,
      },
    });
    const { home, away } = homeAwaySides(container);
    expect(home?.textContent).toContain("FC Liestal");
    expect(away?.textContent).toContain("FC Allschwil");
  });

  it("does not show a result placeholder for upcoming fixtures", () => {
    renderCard({ scoreHome: null, scoreAway: null, resultLabel: null });
    expect(screen.queryByTestId("sce-match-result")).toBeNull();
  });

  it("shows completed results including actual 0:0", () => {
    renderCard({
      status: "COMPLETED",
      resultLabel: "0:0",
      scoreHome: 0,
      scoreAway: 0,
    });
    expect(screen.getByTestId("sce-match-result")).toHaveTextContent("0:0");
  });

  it("shows canonical result label when present", () => {
    renderCard({
      status: "COMPLETED",
      resultLabel: "3:1",
      scoreHome: 3,
      scoreAway: 1,
    });
    expect(screen.getByTestId("sce-match-result")).toHaveTextContent("3:1");
  });

  it("uses canonical consume route when linked", () => {
    const model = resolveSceMatchCardFixture();
    render(<SceMatchCard model={model} density="STANDARD" fmtCfg={FMT} linkToDetail />);
    const link = screen.getByTestId("sce-match-card-link");
    expect(link.getAttribute("href")).toBe(model.route.consumeHref);
  });

  it("renders schedule and location from 01C model", () => {
    renderCard({});
    expect(screen.getByTestId("sce-match-schedule")).toBeTruthy();
    expect(screen.getByTestId("sce-match-location")?.textContent).toContain("Im Brüel");
  });

  it("handles long club names without fixture test id loss", () => {
    const { container } = renderCard(
      {
        home: {
          ...createSceMatchCardFixtureMatch().home,
          displayName: "FC Allschwil Sportverein Region Basel Landschaft",
        },
        away: {
          ...createSceMatchCardFixtureMatch().away,
          displayName: "FC Therwil und Umgebung Spielverein Nordwest",
        },
      },
      "COMPACT",
    );
    expect(container.querySelector('[data-testid="sce-match-fixture"]')).toBeTruthy();
  });

  it("renders status with visible label (not colour-only)", () => {
    renderCard({ status: "CANCELLED" });
    const status = screen.getByTestId("sce-match-status");
    expect(status.textContent?.length).toBeGreaterThan(0);
    expect(status).toHaveAttribute("data-semantic", "cancelled");
  });

  it("renders tenant-side context badges without replacing lifecycle status", () => {
    const model = resolveSceMatchCardFixture({ homeAway: "AWAY" });
    render(
      <SceMatchCard model={model} density="STANDARD" fmtCfg={FMT} linkToDetail={false} />,
    );
    expect(screen.getByTestId("sce-match-context-auswaerts")).toHaveTextContent("Auswärts");
    expect(screen.getByTestId("sce-match-status")).toBeTruthy();
  });

  it("does not show VS for upcoming fixtures with raw 0/0 scores", () => {
    renderCard({
      status: "SCHEDULED",
      scoreHome: 0,
      scoreAway: 0,
      resultLabel: null,
    });
    expect(screen.getByTestId("sce-match-vs")).toHaveTextContent("VS");
    expect(screen.queryByTestId("sce-match-result")).toBeNull();
  });

  it("STANDARD stacks crest above club name (not inline Resultate row)", () => {
    const { container } = renderCard({}, "STANDARD");
    const card = container.querySelector('[data-sce-match-card]')!;
    const competition = card.querySelector('[data-sce-match-region="competition"]');
    const fixture = card.querySelector('[data-sce-match-region="fixture"]');
    const schedule = card.querySelector('[data-sce-match-region="schedule"]');
    const location = card.querySelector('[data-sce-match-region="location"]');

    expect(competition && fixture).toBeTruthy();
    if (competition && fixture) {
      expect(
        competition.compareDocumentPosition(fixture) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    if (fixture && schedule) {
      expect(
        fixture.compareDocumentPosition(schedule) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    if (schedule && location) {
      expect(
        schedule.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    const { home, away } = homeAwaySides(container);
    stackedIdentityOrder(home);
    stackedIdentityOrder(away);

    expect(container.querySelector(".sm\\:grid-cols-\\[minmax\\(0\\,8\\.75rem\\)")).toBeNull();
  });

  it("MICRO uses horizontal identity with optional crests", () => {
    renderCard({}, "MICRO");
    expect(screen.getByTestId("sce-match-vs")).toHaveTextContent("VS");
    expect(screen.getAllByTestId("club-crest-image").length).toBeGreaterThanOrEqual(1);
  });

  it.each(["HERO", "STANDARD", "COMPACT"] as const)(
    "rich density %s uses stacked fixture panel",
    (density) => {
      const { container } = renderCard({}, density);
      const { home } = homeAwaySides(container);
      stackedIdentityOrder(home);
    },
  );

  function richSemanticRegionKeys(container: HTMLElement): string[] {
    const card = container.querySelector("[data-sce-match-card]")!;
    const regions: Array<[string, Element]> = [];
    for (const el of card.querySelectorAll("[data-sce-match-header], [data-sce-match-region='fixture'], [data-sce-match-schedule], [data-sce-match-location]")) {
      const key =
        el.getAttribute("data-sce-match-header") != null
          ? "header"
          : el.getAttribute("data-sce-match-region") === "fixture"
            ? "fixture"
            : el.getAttribute("data-sce-match-schedule") != null
              ? "schedule"
              : "location";
      regions.push([key, el]);
    }
    regions.sort((a, b) =>
      a[1].compareDocumentPosition(b[1]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    return regions.map(([key]) => key);
  }

  it.each(["HERO", "STANDARD", "COMPACT"] as const)(
    "rich density %s preserves canonical semantic region order",
    (density) => {
      const { container } = renderCard({}, density);
      expect(richSemanticRegionKeys(container)).toEqual([
        "header",
        "fixture",
        "schedule",
        "location",
      ]);
      const card = container.querySelector("[data-sce-match-card]");
      expect(card).toHaveAttribute("data-sce-match-density", density);
      expect(card?.className).toMatch(/max-w-/);
    },
  );

  it("adapter-backed model is consumed without local DTO fields on card", () => {
    const model = resolveSceMatchPresentation({
      match: createSceMatchCardFixtureMatch(),
      tenantLogoUrl: "https://cdn.example/fca.png",
      tenantClubName: "FC Allschwil",
    });
    expect(model.kind).toBe("MATCH");
    render(<SceMatchCard model={model} density="STANDARD" fmtCfg={FMT} linkToDetail={false} />);
    expect(screen.getByTestId("sce-match-card")).toHaveAttribute("data-density", "STANDARD");
  });
});

describe("SCE-UI-ROLLOUT-01D — preview gallery", () => {
  it("mounts deterministic preview sections", async () => {
    const { SceMatchCardPreviewGallery } = await import("../SceMatchCardPreviewGallery");
    render(<SceMatchCardPreviewGallery />);
    expect(screen.getByTestId("sce-match-card-preview-gallery")).toBeTruthy();
    expect(screen.getByTestId("sce-match-preview-narrow")).toBeTruthy();
    const upcoming = screen.getByTestId("sce-match-preview-upcomingStandard-HERO");
    expect(within(upcoming).getByTestId("sce-match-fixture")).toBeTruthy();
  });
});

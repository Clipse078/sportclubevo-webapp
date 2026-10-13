/**
 * @vitest-environment jsdom
 */

import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SceTournamentCard } from "../SceTournamentCard";
import { SceTournamentCardPreviewGallery } from "../SceTournamentCardPreviewGallery";
import { WeekplannerTournamentIdentityCard } from "@/components/admin/planner/WeekplannerTournamentIdentityCard";
import { createSceWeekplannerTournamentTenantPreviewItem } from "@/lib/sporting-activity-presentation/canonical/__fixtures__/sce-weekplanner-tournament-preview-fixtures";
import {
  createSceTournamentCardFixture,
  createSceTournamentExternalOrganiserFixture,
  createSceTournamentOrganiserFallbackFixture,
  createSceTournamentTenantOrganiserFixture,
  SCE_TOURNAMENT_FIXTURE_CREST_URLS,
} from "../__fixtures__/sce-tournament-card-fixtures";
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

describe("SCE-UI-ROLLOUT-01F-R1 — SceTournamentCard", () => {
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

  it.each(["HERO", "STANDARD", "COMPACT"] as const)(
    "renders organiser crest at %s when logo URL exists",
    (density) => {
      renderCard(createSceTournamentExternalOrganiserFixture(), density);
      const crest = screen.getByTestId("sce-tournament-organiser-crest");
      expect(within(crest).getByTestId("club-crest-image")).toHaveAttribute(
        "src",
        SCE_TOURNAMENT_FIXTURE_CREST_URLS.external,
      );
    },
  );

  it("tenant organiser crest uses canonical ClubIdentity logo URL", () => {
    renderCard(createSceTournamentTenantOrganiserFixture(), "STANDARD");
    const img = within(screen.getByTestId("sce-tournament-organiser-crest")).getByTestId(
      "club-crest-image",
    );
    expect(img).toHaveAttribute("src", SCE_TOURNAMENT_FIXTURE_CREST_URLS.tenant);
    expect(img.className).toContain("object-contain");
    expect(img.className).not.toContain("rounded-full");
  });

  it("external organiser without crest uses fallback initials only", () => {
    renderCard(createSceTournamentOrganiserFallbackFixture(), "STANDARD");
    expect(screen.getByTestId("club-crest-fallback-initials")).toBeTruthy();
    expect(screen.queryByTestId("club-crest-image")).toBeNull();
  });

  it("real crest is not wrapped in circular avatar treatment", () => {
    renderCard(createSceTournamentExternalOrganiserFixture(), "HERO");
    const bounds = within(screen.getByTestId("sce-tournament-organiser-crest")).getByTestId(
      "club-crest-bounds",
    );
    expect(bounds.className).not.toContain("rounded-full");
  });

  it("narrow MICRO omits organiser crest", () => {
    renderCard(createSceTournamentTenantOrganiserFixture(), "MICRO", {
      className: "sce-tournament-micro-narrow max-w-[9rem]",
    });
    expect(screen.queryByTestId("sce-tournament-organiser-crest")).toBeNull();
    expect(screen.getByTestId("sce-tournament-micro-organiser")).toHaveTextContent("FC Allschwil");
  });

  it("MICRO at default width keeps organiser crest when recognisable", () => {
    renderCard(createSceTournamentTenantOrganiserFixture(), "MICRO");
    expect(screen.getByTestId("sce-tournament-organiser-crest")).toBeTruthy();
  });

  it.each(DENSITIES)("organiser remains visible at %s", (density) => {
    renderCard(undefined, density);
    if (density === "MICRO") {
      expect(screen.getByTestId("sce-tournament-micro-organiser")).toHaveTextContent("FC Arisdorf");
    } else {
      expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Arisdorf");
    }
  });

  it("keeps hauptteam distinct from organiser at STANDARD", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD");
    expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Arisdorf");
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F2");
  });

  it("strips redundant club prefix from hauptteam beside tenant organiser", () => {
    renderCard(createSceTournamentTenantOrganiserFixture(), "COMPACT");
    expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Allschwil");
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F3");
    expect(screen.queryByText(/FC Allschwil Junioren F3/)).toBeNull();
  });

  it("COMPACT keeps organiser and hauptteam on separate lines", () => {
    renderCard(createSceTournamentCardFixture(), "COMPACT");
    expect(screen.getByTestId("sce-tournament-organiser")).toHaveTextContent("FC Arisdorf");
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F2");
    expect(screen.queryByTestId("sce-tournament-context-line")).toBeNull();
  });

  it("schedule and location rows expose canonical icons", () => {
    renderCard(createSceTournamentCardFixture(), "STANDARD");
    const schedule = screen.getByTestId("sce-tournament-schedule");
    expect(schedule.querySelector("svg")).toBeTruthy();
    expect(screen.getByTestId("sce-tournament-location").querySelector("svg")).toBeTruthy();
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
    expect(screen.getByTestId("sce-tournament-card").getAttribute("aria-label")).toMatch(/FC Therwil/);
  });

  it("does not introduce a local tournament crest resolver in SceTournamentCard", () => {
    const source = readFileSync(
      join(process.cwd(), "components/sporting-activity/SceTournamentCard.tsx"),
      "utf8",
    );
    expect(source).toContain("ClubCrest");
    expect(source).not.toMatch(/resolveTournamentOrganiserClubLogoUrl/);
    expect(source).not.toMatch(/resolveClubIdentityEffectiveLogoUrl/);
  });

  it("uses ActivityTypePill for tournament semantic accent", () => {
    renderCard(undefined, "STANDARD");
    expect(document.querySelector('[data-activity-type-pill="tournament-orange"]')).toBeTruthy();
  });

  it("preview gallery distinguishes tenant crest, external crest, and fallback", () => {
    render(<SceTournamentCardPreviewGallery />);
    const tenantSection = screen.getByTestId("sce-tournament-preview-tenant-real-crest");
    const externalSection = screen.getByTestId("sce-tournament-preview-external-real-crest");
    const fallbackSection = screen.getByTestId("sce-tournament-preview-no-crest-fallback");

    expect(
      within(tenantSection).getAllByTestId("club-crest-image").length,
    ).toBeGreaterThan(0);
    expect(within(externalSection).getByTestId("club-crest-image")).toHaveAttribute(
      "src",
      SCE_TOURNAMENT_FIXTURE_CREST_URLS.external,
    );
    expect(within(fallbackSection).getByTestId("club-crest-fallback-initials")).toBeTruthy();
    expect(within(fallbackSection).queryByTestId("club-crest-image")).toBeNull();
  });

  it("weekplanner COMPACT shows tenant organiser crest via canonical adapter", () => {
    render(
      <WeekplannerTournamentIdentityCard
        item={createSceWeekplannerTournamentTenantPreviewItem()}
        timezone="Europe/Zurich"
        density="COMPACT"
      />,
    );
    const crest = screen.getByTestId("sce-tournament-organiser-crest");
    expect(within(crest).getByTestId("club-crest-image")).toHaveAttribute(
      "src",
      SCE_TOURNAMENT_FIXTURE_CREST_URLS.tenant,
    );
  });
});

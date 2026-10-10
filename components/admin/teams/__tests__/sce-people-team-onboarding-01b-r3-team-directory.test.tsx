/**
 * @vitest-environment jsdom
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 — Team Directory dark UX contract.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamsOverviewGrid, {
  TEAM_DIRECTORY_META_CHIP_ACTIVE,
  TEAM_DIRECTORY_META_CHIP_INACTIVE,
} from "@/components/admin/teams/TeamsOverviewGrid";

type TeamItem = Parameters<typeof TeamsOverviewGrid>[0]["teams"][number];

function makeTeam(overrides: Partial<TeamItem> = {}): TeamItem {
  return {
    id: "team-1",
    name: "FC Allschwil Senioren 40+",
    slug: "senioren-40",
    category: "SENIOREN",
    genderGroup: "Herren",
    ageGroup: null,
    sortOrder: 0,
    isActive: true,
    websiteVisible: true,
    infoboardVisible: false,
    activeSeason: {
      seasonKey: "2026/2027",
      seasonName: "Season 2026/2027",
      displayName: "FC Allschwil Senioren 40+",
      shortName: null,
      status: "ACTIVE",
    },
    competition: { name: "Senioren 40+", shortName: null },
    providerMapping: null,
    ...overrides,
  };
}

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 Team Directory", () => {
  it("does not render legacy light publication/sync Tailwind surfaces", () => {
    const { container } = render(
      <TeamsOverviewGrid
        teams={[
          makeTeam(),
          makeTeam({
            id: "team-2",
            providerMapping: {
              provider: "SFV",
              isActive: true,
              lastSyncedAt: "2026-10-01T00:00:00.000Z",
              source: "SYNC",
            },
            websiteVisible: false,
            infoboardVisible: true,
          }),
        ]}
      />,
    );

    const legacyLightClasses = new Set([
      "bg-emerald-50",
      "bg-slate-50",
      "bg-amber-50",
      "border-emerald-200",
      "border-slate-200",
    ]);
    const chipElements = container.querySelectorAll(
      '[data-testid="team-publication-meta"] [data-testid^="team-"]',
    );
    for (const el of chipElements) {
      for (const cls of el.className.split(/\s+/)) {
        expect(legacyLightClasses.has(cls)).toBe(false);
      }
    }
    expect(container.innerHTML).toContain(TEAM_DIRECTORY_META_CHIP_ACTIVE.split(" ")[0]);
    expect(container.innerHTML).toContain(TEAM_DIRECTORY_META_CHIP_INACTIVE.split(" ")[0]);
  });

  it("groups publication and sync metadata in a single dark cluster", () => {
    render(<TeamsOverviewGrid teams={[makeTeam()]} />);

    expect(screen.getByTestId("team-publication-meta")).toBeTruthy();
    expect(screen.getByTestId("team-sync-manual")).toBeTruthy();
    expect(screen.getByTestId("team-publication-web")).toBeTruthy();
    expect(screen.getByTestId("team-publication-board")).toBeTruthy();
  });

  it("keeps team identity primary and links to team cockpit", () => {
    render(<TeamsOverviewGrid teams={[makeTeam()]} />);

    const row = screen.getByTestId("team-directory-row-team-1");
    expect(row.getAttribute("href")).toBe("/dashboard/teams/team-1");
    expect(screen.getByText("FC Allschwil Senioren 40+")).toBeTruthy();
    expect(screen.getByText("Senioren · Herren")).toBeTruthy();
  });

  it("shows restrained active status without duplicate success pills", () => {
    render(<TeamsOverviewGrid teams={[makeTeam()]} />);

    expect(screen.getAllByTestId("team-row-status")).toHaveLength(1);
    expect(screen.getByText("Aktiv")).toBeTruthy();
  });
});

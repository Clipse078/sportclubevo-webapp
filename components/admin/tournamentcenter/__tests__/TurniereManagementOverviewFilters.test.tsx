/**
 * TURNIERE-UX-01D — duplicate top filters removed; sidebar remains canonical.
 *
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TournamentCenterWorkspace from "@/components/admin/tournamentcenter/TournamentCenterWorkspace";
import TurniereManagementFilterRail from "@/components/admin/tournamentcenter/TurniereManagementFilterRail";
import type { TournamentDto } from "@/lib/tournaments/types";

const ROOT = resolve(__dirname, "../../../..");

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function makeTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "t1",
    tenantId: "tenant-1",
    title: "Herbst Cup",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-10-01T10:00:00.000Z",
    endAt: null,
    meetingTime: null,
    location: "Im Brüel, Allschwil",
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    season: { id: "s1", key: "2026-27", name: "2026/27" },
    team: {
      id: "team-e",
      name: "Junioren E",
      slug: "e",
      category: "JUNIOREN",
      genderGroup: null,
      ageGroup: "E",
    },
    teamLogoUrl: null,
    homeAway: "HOME",
    participants: [],
    resourceAllocations: [],
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    reviewStage: "APPROVED",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const FILTER_RAIL_PROPS = {
  resetHref: "/dashboard/tournamentcenter?scope=UPCOMING",
  categoryFilter: null as string | null,
  ageFilter: null as string | null,
  statusFilter: null as const,
  locationFilter: null as string | null,
  ownOnly: false,
  publicOnly: false,
  categoryOptions: [{ value: "JUNIOREN", label: "Junioren" }],
  ageOptions: [{ value: "E", label: "E" }],
  locationOptions: [{ value: "Im Brüel, Allschwil", label: "Im Brüel, Allschwil" }],
  buildCategoryHref: (value: string | null) =>
    `/dashboard/tournamentcenter?category=${value ?? ""}`,
  buildAgeHref: (value: string | null) => `/dashboard/tournamentcenter?age=${value ?? ""}`,
  buildStatusHref: (value: string | null) => `/dashboard/tournamentcenter?status=${value ?? ""}`,
  buildLocationHref: (value: string | null) =>
    `/dashboard/tournamentcenter?location=${encodeURIComponent(value ?? "")}`,
  buildOwnOnlyHref: (enabled: boolean) =>
    `/dashboard/tournamentcenter?ownership=${enabled ? "own" : ""}`,
  buildPublicOnlyHref: (enabled: boolean) =>
    `/dashboard/tournamentcenter?visibility=${enabled ? "public" : ""}`,
};

describe("TURNIERE-UX-01D — overview filter surfaces", () => {
  it("does not render duplicate main-area filter controls in the toolbar source", () => {
    const toolbar = readSource("components/admin/tournamentcenter/TurniereManagementToolbar.tsx");
    expect(toolbar).not.toContain("turniere-toolbar-category");
    expect(toolbar).not.toContain("turniere-toolbar-age");
    expect(toolbar).not.toContain("turniere-toolbar-status");
    expect(toolbar).not.toContain("turniere-toolbar-location");
    expect(toolbar).toContain("turniere-search");
  });

  it("desktop overview keeps search and sidebar filters without top duplicate selects", () => {
    render(
      <TournamentCenterWorkspace
        tournaments={[makeTournament()]}
        scope="UPCOMING"
        search=""
        teamFilter={null}
        monthParam={null}
        statusFilter={null}
        actionFilter="ALLE"
        group="MONTH"
        sort="DATE_ASC"
        categoryFilter={null}
        ageFilter={null}
        locationFilter={null}
        ownOnly={false}
        publicOnly={false}
        listView="LISTE"
        teamOptions={[]}
        canCreate
      />,
    );

    expect(screen.getByTestId("turniere-search")).toBeInTheDocument();
    expect(screen.queryByTestId("turniere-toolbar-category")).not.toBeInTheDocument();
    expect(screen.queryByTestId("turniere-toolbar-age")).not.toBeInTheDocument();
    expect(screen.queryByTestId("turniere-toolbar-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("turniere-toolbar-location")).not.toBeInTheDocument();

    expect(screen.getByTestId("turniere-filter-rail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zurücksetzen" })).toBeInTheDocument();
    expect(screen.getByTestId("turniere-filter-own-only")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-filter-public-only")).toBeInTheDocument();
    expect(screen.getByLabelText("Kategorie")).toBeInTheDocument();
    expect(screen.getByLabelText("Altersklasse")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Ort")).toBeInTheDocument();
  });

  it("sidebar filter rail navigates via canonical href builders", () => {
    push.mockClear();

    render(<TurniereManagementFilterRail {...FILTER_RAIL_PROPS} />);

    fireEvent.change(screen.getByLabelText("Kategorie"), { target: { value: "JUNIOREN" } });
    expect(push).toHaveBeenCalledWith("/dashboard/tournamentcenter?category=JUNIOREN");

    fireEvent.change(screen.getByLabelText("Altersklasse"), { target: { value: "E" } });
    expect(push).toHaveBeenCalledWith("/dashboard/tournamentcenter?age=E");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "LIVE" } });
    expect(push).toHaveBeenCalledWith("/dashboard/tournamentcenter?status=LIVE");

    fireEvent.change(screen.getByLabelText("Ort"), {
      target: { value: "Im Brüel, Allschwil" },
    });
    expect(push).toHaveBeenLastCalledWith(
      "/dashboard/tournamentcenter?location=Im%20Br%C3%BCel%2C%20Allschwil",
    );

    fireEvent.click(screen.getByTestId("turniere-filter-own-only"));
    expect(push).toHaveBeenCalledWith("/dashboard/tournamentcenter?ownership=own");

    fireEvent.click(screen.getByTestId("turniere-filter-public-only"));
    expect(push).toHaveBeenCalledWith("/dashboard/tournamentcenter?visibility=public");

    expect(screen.getByRole("link", { name: "Zurücksetzen" })).toHaveAttribute(
      "href",
      "/dashboard/tournamentcenter?scope=UPCOMING",
    );
  });

  it("responsive composition keeps filter rail mounted below main content", () => {
    const workspace = readSource("components/admin/tournamentcenter/TournamentCenterWorkspace.tsx");
    const layout = readSource("components/admin/matchcenter/spiele-management-layout.ts");

    expect(layout).toContain("min-[105rem]:grid-cols-[minmax(0,1fr)_17.5rem]");
    expect(workspace).toContain("TurniereManagementFilterRail");
    expect(workspace).toContain('data-testid="turniere-management-rail"');
    expect(workspace).not.toContain("turniere-toolbar-category");
  });
});

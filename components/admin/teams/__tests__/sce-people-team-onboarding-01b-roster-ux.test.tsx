/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B — Team Cockpit roster onboarding UX.
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TeamSquadManagementCard from "@/components/admin/teams/TeamSquadManagementCard";
import TeamTrainerRosterSection from "@/components/admin/teams/TeamTrainerRosterSection";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const baseSeason = {
  id: "season-1",
  key: "2026/2027",
  name: "2026/2027",
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2027-06-30T00:00:00.000Z",
  isActive: true,
};

const teamSeason = {
  id: "ts-1",
  displayName: "Junioren F2",
  shortName: "F2",
  status: "ACTIVE",
  squadWebsiteVisible: true,
  season: baseSeason,
  teamAgeGroup: "F",
  playerSquadMembers: [] as [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/roster-onboarding/person-context")) {
        return new Response(
          JSON.stringify({
            person: {
              id: "person-1",
              firstName: "Max",
              lastName: "Muster",
              displayName: null,
              dateOfBirth: "2018-01-01T00:00:00.000Z",
              isActive: true,
              isPlayer: true,
              isTrainer: false,
            },
            squadMembership: null,
            trainerMembership: null,
            otherActivePlayerSquads: [{ teamId: "t2", teamName: "Junioren F1", seasonLabel: "2026/2027" }],
            otherActiveTrainerTeams: [],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/squad-members") && !url.includes("DELETE")) {
        return new Response(
          JSON.stringify({ message: "Spieler erfolgreich hinzugefügt.", squadMember: { id: "m1" } }),
          { status: 201 },
        );
      }
      if (url.includes("/api/people/search")) {
        return new Response(
          JSON.stringify([
            {
              id: "person-1",
              firstName: "Max",
              lastName: "Muster",
              displayName: null,
              email: null,
              phone: null,
              dateOfBirth: "2018-01-01T00:00:00.000Z",
              isPlayer: true,
              isTrainer: false,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    }),
  );
});

describe("TeamSquadManagementCard onboarding UX", () => {
  it("shows operational empty state with season label and one primary add action", async () => {
    render(
      <TeamSquadManagementCard teamId="team-1" canManage teamSeason={teamSeason} />,
    );

    expect(screen.getByTestId("team-squad-empty")).toHaveTextContent(
      "Noch keine Spieler im Kader der Saison 2026/2027",
    );

    expect(screen.queryByTestId("team-squad-add-button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Spieler hinzufügen" })).toHaveLength(1);

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Spieler hinzufügen");
  });

  it("searches a person, shows multi-team info, and refreshes after add", async () => {
    render(
      <TeamSquadManagementCard teamId="team-1" canManage teamSeason={teamSeason} />,
    );

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));

    const searchInput = screen.getByRole("combobox");
    fireEvent.change(searchInput, { target: { value: "Max" } });

    await waitFor(() => {
      expect(screen.getByText("Max Muster")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Max Muster"));

    await waitFor(() => {
      expect(screen.getByText(/Aktuell auch im Kader/)).toBeInTheDocument();
      expect(screen.getByText(/Junioren F1/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("team-squad-add-confirm"));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows player capacity guidance when people.manage is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/roster-onboarding/person-context")) {
          return new Response(
            JSON.stringify({
              person: {
                id: "person-2",
                firstName: "No",
                lastName: "Player",
                displayName: null,
                dateOfBirth: null,
                isActive: true,
                isPlayer: false,
                isTrainer: false,
              },
              squadMembership: null,
              trainerMembership: null,
              otherActivePlayerSquads: [],
              otherActiveTrainerTeams: [],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/people/search")) {
          return new Response(
            JSON.stringify([
              {
                id: "person-2",
                firstName: "No",
                lastName: "Player",
                displayName: null,
                email: null,
                phone: null,
                dateOfBirth: null,
                isPlayer: false,
                isTrainer: false,
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );

    render(
      <TeamSquadManagementCard teamId="team-1" canManage teamSeason={teamSeason} />,
    );

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "No" } });

    await waitFor(() => {
      expect(screen.getByText("No Player")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("No Player"));

    await waitFor(() => {
      expect(screen.getByText(/people\.manage/)).toBeInTheDocument();
      expect(screen.queryByTestId("team-squad-enable-player-capacity")).not.toBeInTheDocument();
    });
  });

  it("shows missing DOB guidance for junior teams without empty Jahrgänge label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/roster-onboarding/person-context")) {
          return new Response(
            JSON.stringify({
              person: {
                id: "person-no-dob",
                firstName: "Ohne",
                lastName: "Geburt",
                displayName: null,
                dateOfBirth: null,
                isActive: true,
                isPlayer: true,
                isTrainer: false,
              },
              squadMembership: null,
              trainerMembership: null,
              otherActivePlayerSquads: [],
              otherActiveTrainerTeams: [],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/people/search")) {
          return new Response(
            JSON.stringify([
              {
                id: "person-no-dob",
                firstName: "Ohne",
                lastName: "Geburt",
                displayName: null,
                email: null,
                phone: null,
                dateOfBirth: null,
                isPlayer: true,
                isTrainer: false,
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );

    render(
      <TeamSquadManagementCard
        teamId="team-1"
        canManage
        canManagePeople
        teamSeason={teamSeason}
      />,
    );

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Ohne" } });

    await waitFor(() => {
      expect(screen.getByText("Ohne Geburt")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Ohne Geburt"));

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent("Zuordnung noch nicht möglich");
    expect(screen.getByTestId("team-roster-eligibility-person-edit-cta")).toBeInTheDocument();
    expect(notice).toHaveTextContent("Erlaubte Jahrgänge:");
    expect(notice.textContent).not.toMatch(/Erlaubte Jahrgänge:\s*\./);
  });

  it("allows assign preview for unrestricted senior teams without DOB", async () => {
    const seniorSeason = {
      ...teamSeason,
      teamAgeGroup: "40+",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/roster-onboarding/person-context")) {
          return new Response(
            JSON.stringify({
              person: {
                id: "person-senior",
                firstName: "Senior",
                lastName: "Spieler",
                displayName: null,
                dateOfBirth: null,
                isActive: true,
                isPlayer: true,
                isTrainer: false,
              },
              squadMembership: null,
              trainerMembership: null,
              otherActivePlayerSquads: [],
              otherActiveTrainerTeams: [],
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/people/search")) {
          return new Response(
            JSON.stringify([
              {
                id: "person-senior",
                firstName: "Senior",
                lastName: "Spieler",
                displayName: null,
                email: null,
                phone: null,
                dateOfBirth: null,
                isPlayer: true,
                isTrainer: false,
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }),
    );

    render(
      <TeamSquadManagementCard teamId="team-sen" canManage teamSeason={seniorSeason} />,
    );

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Senior" } });

    await waitFor(() => {
      expect(screen.getByText("Senior Spieler")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Senior Spieler"));

    await waitFor(() => {
      expect(screen.queryByTestId("team-roster-eligibility-notice")).not.toBeInTheDocument();
      expect(screen.getByTestId("team-squad-add-confirm")).not.toBeDisabled();
    });
  });

  it("uses Switch toggles for captain, vice-captain, and website visibility", async () => {
    render(
      <TeamSquadManagementCard teamId="team-1" canManage teamSeason={teamSeason} />,
    );

    fireEvent.click(screen.getByTestId("team-squad-empty-add-button"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Max" } });

    await waitFor(() => {
      expect(screen.getByText("Max Muster")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Max Muster"));

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: "Captain" })).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Vize-Captain" })).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Auf Website anzeigen" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("TeamTrainerRosterSection assignment-only remediation", () => {
  it("surfaces assignment-only trainers with explicit add action", () => {
    render(
      <TeamTrainerRosterSection
        teamId="team-1"
        canManage
        canManagePeople
        teamSeason={{
          id: "ts-1",
          displayName: "F2",
          status: "ACTIVE",
          trainerTeamWebsiteVisible: true,
          season: baseSeason,
          trainerTeamMembers: [],
        }}
        assignmentOnlySuggestions={[
          {
            functionKey: "TRAINER",
            person: {
              id: "coach-1",
              firstName: "Tina",
              lastName: "Trainer",
              displayName: null,
              email: null,
              phone: null,
              isTrainer: true,
            },
          },
        ]}
      />,
    );

    expect(screen.getByTestId("team-trainer-assignment-only-panel")).toBeInTheDocument();
    expect(screen.getByText(/Trainer-Zuordnung vervollständigen/)).toBeInTheDocument();
    expect(screen.getByText(/noch nicht im Trainerteam 2026\/2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("team-trainer-assignment-only-add-coach-1"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Trainer hinzufügen");
  });
});

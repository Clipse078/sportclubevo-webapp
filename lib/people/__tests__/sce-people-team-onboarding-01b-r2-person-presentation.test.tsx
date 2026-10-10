/**
 * @vitest-environment jsdom
 *
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R2 — Person workspace badge/pill presentation.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonWorkspaceOverviewTab from "@/components/admin/persons/PersonWorkspaceOverviewTab";
import { PersonSemanticPill } from "@/components/admin/persons/PersonPresentationPill";
import { normalizeOptionalPresentationLabel } from "@/lib/people/person-presentation-label";
import { buildPersonOverviewAssignmentProjection } from "@/lib/people/person-overview-assignment-projection";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), back: vi.fn(), push: vi.fn() }),
}));

const TEAM_F2 = { id: "team-f2", name: "FC Allschwil Junioren F2" };
const TEAM_SEN = { id: "team-sen", name: "FC Allschwil Senioren 40+" };

describe("normalizeOptionalPresentationLabel", () => {
  it("returns null for empty and whitespace-only values", () => {
    expect(normalizeOptionalPresentationLabel(null)).toBeNull();
    expect(normalizeOptionalPresentationLabel(undefined)).toBeNull();
    expect(normalizeOptionalPresentationLabel("")).toBeNull();
    expect(normalizeOptionalPresentationLabel("   ")).toBeNull();
  });

  it("returns trimmed meaningful text", () => {
    expect(normalizeOptionalPresentationLabel("  Cheftrainer  ")).toBe("Cheftrainer");
  });
});

describe("PersonSemanticPill", () => {
  it("does not render for empty optional badge value", () => {
    const { container } = render(<PersonSemanticPill label="" />);
    expect(container.querySelector("[data-testid='person-semantic-pill']")).toBeNull();
  });

  it("renders visible text for meaningful role/status", () => {
    render(<PersonSemanticPill label="Cheftrainer" />);
    expect(screen.getByText("Cheftrainer")).toBeTruthy();
  });
});

describe("PersonWorkspaceOverviewTab — R2 presentation", () => {
  const basePerson = {
    id: "p-1",
    firstName: "Test",
    lastName: "Person",
    displayName: null,
    email: "test@example.com",
    phone: null,
    isActive: true,
    isPlayer: true,
    isTrainer: true,
    dateOfBirth: null,
    notes: null,
    user: null,
    assignments: [],
    squadMemberships: [],
    trainerMemberships: [],
  };

  it("omits empty trainer role badge when roleLabel is absent", () => {
    render(
      <PersonWorkspaceOverviewTab
        person={{
          ...basePerson,
          trainerMemberships: [
            {
              id: "tm-1",
              status: "ACTIVE",
              roleLabel: null,
              teamSeason: {
                id: "ts-1",
                season: { id: "s-1", name: "2026/2027", key: "2026-27" },
                team: TEAM_F2,
              },
            },
          ],
        }}
        activeSeason={{ id: "s-1", name: "2026/2027", key: "2026-27" }}
      />,
    );

    expect(screen.getByText(TEAM_F2.name)).toBeTruthy();
    const pills = screen.getAllByTestId("person-semantic-pill");
    expect(pills.some((el) => el.textContent?.trim() === "")).toBe(false);
    expect(pills.some((el) => el.textContent === "Cheftrainer")).toBe(false);
  });

  it("shows meaningful trainer role when present", () => {
    render(
      <PersonWorkspaceOverviewTab
        person={{
          ...basePerson,
          trainerMemberships: [
            {
              id: "tm-1",
              status: "ACTIVE",
              roleLabel: "Cheftrainer",
              teamSeason: {
                id: "ts-1",
                season: { id: "s-1", name: "2026/2027", key: "2026-27" },
                team: TEAM_F2,
              },
            },
          ],
        }}
        activeSeason={{ id: "s-1", name: "2026/2027", key: "2026-27" }}
      />,
    );

    expect(screen.getByText("Cheftrainer")).toBeTruthy();
  });

  it("preserves incomplete player assignment semantics with readable warning pill", () => {
    render(
      <PersonWorkspaceOverviewTab
        person={{
          ...basePerson,
          squadMemberships: [],
          assignments: [
            {
              id: "a-player",
              status: "ACTIVE",
              functionKey: PERSON_FUNCTIONS.PLAYER,
              team: TEAM_SEN,
              orgUnit: null,
              season: { id: "s-1", name: "2026/2027" },
            },
          ],
        }}
        activeSeason={{ id: "s-1", name: "2026/2027", key: "2026-27" }}
      />,
    );

    expect(screen.getByText(/Zuordnung unvollständig/i)).toBeTruthy();
    expect(screen.getByText(/Jetzt Kaderzuordnung ergänzen/)).toBeTruthy();
  });

  it("F2 trainer membership dedupes redundant TRAINER PersonAssignment", () => {
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [
        {
          id: "a-trainer",
          status: "ACTIVE",
          functionKey: PERSON_FUNCTIONS.HEAD_COACH,
          team: TEAM_F2,
        },
      ],
      squadMemberships: [],
      trainerMemberships: [{ status: "ACTIVE", teamSeason: { team: TEAM_F2 } }],
    });

    expect(projection.weitereAssignments).toHaveLength(0);

    render(
      <PersonWorkspaceOverviewTab
        person={{
          ...basePerson,
          assignments: [
            {
              id: "a-trainer",
              status: "ACTIVE",
              functionKey: PERSON_FUNCTIONS.HEAD_COACH,
              team: TEAM_F2,
              orgUnit: null,
              season: null,
            },
            {
              id: "a-tm",
              status: "ACTIVE",
              functionKey: PERSON_FUNCTIONS.TEAM_MANAGER,
              team: TEAM_F2,
              orgUnit: null,
              season: null,
            },
          ],
          trainerMemberships: [
            {
              id: "tm-1",
              status: "ACTIVE",
              roleLabel: null,
              teamSeason: {
                id: "ts-1",
                season: { id: "s-1", name: "2026/2027", key: "2026-27" },
                team: TEAM_F2,
              },
            },
          ],
        }}
        activeSeason={{ id: "s-1", name: "2026/2027", key: "2026-27" }}
      />,
    );

    expect(screen.getAllByText(TEAM_F2.name).length).toBe(2);
    expect(screen.getByText(/Teammanager/i)).toBeTruthy();
    expect(screen.queryByText("Zum Trainer-Tab")).toBeTruthy();
  });
});

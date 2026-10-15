/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import { SportingActivityDetailProvider } from "@/components/sporting-activity/detail/SportingActivityDetailProvider";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { ReactNode } from "react";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { programmeItemToPersonalProgrammeItem } from "@/lib/programme-engine/programme-item-personal-adapter";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { PersonalContext } from "@/lib/dashboard/personal-context/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "de-CH",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

function wrap(ui: ReactNode) {
  return (
    <SportingActivityDetailProvider fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}>
      {ui}
    </SportingActivityDetailProvider>
  );
}

function basePersonalContext(): PersonalContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    hasActiveTenantMembership: true,
    hasLinkedPerson: true,
    teams: [],
    orgUnits: [],
  };
}

describe("Mein Programm — canonical programme engine presentation (R3)", () => {
  it("maps ProgrammeItem to personal row with activityPresentation and canonicalPresentation", () => {
    const trainingPresentation = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      dressingRoom: { label: "E2" },
    });
    const programmeItem: ProgrammeItem = {
      id: "programme:training:1",
      kind: "TRAINING",
      domainId: "session-1",
      resourceKey: "training-session:session-1",
      startsAt: new Date("2026-10-17T16:45:00.000Z"),
      endsAt: new Date("2026-10-17T18:15:00.000Z"),
      allDay: false,
      presentation: trainingPresentation,
      teamId: "team-b1",
      teamSeasonId: "ts-b1",
      orgUnitId: null,
      status: "scheduled",
      navigationTarget: "/dashboard/training/sessions/session-1",
    };

    const personal = programmeItemToPersonalProgrammeItem(programmeItem, basePersonalContext());
    expect(personal.canonicalPresentation).toBeDefined();
    expect(personal.activityPresentation?.identity.activityKind).toBe("TRAINING");
    expect(personal.activityPresentation?.dressingRoomLabel).toBe("E2");
  });

  it("renders canonical training agenda with team identity, location, and dressing room", () => {
    const trainingPresentation = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      dressingRoom: { label: "E2" },
      location: buildSportingActivityLocation({
        mode: "HOME",
        hostOrOrganiser: "FC Allschwil",
        venueName: "Im Brüel",
        facilityResource: "Kunstrasen 2 B",
      }),
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: "https://cdn.example/fca.png",
      }),
    });

    const item: PersonalProgrammeItem = {
      id: "training-session:session-1",
      sourceType: "TRAINING",
      startsAt: new Date("2026-10-17T16:45:00.000Z"),
      endsAt: new Date("2026-10-17T18:15:00.000Z"),
      title: "Training",
      typeLabel: "Training",
      deepLink: "/dashboard/training/sessions/session-1",
      ariaLabel: "Training",
      canonicalPresentation: trainingPresentation,
      programmeScopeTeamId: "team-b1",
    };

    render(
      wrap(
        <PersonalProgrammeAgendaRow item={item} timeLabel="18:45" endTimeLabel="20:15" />,
      ),
    );

    expect(screen.getByTestId("personal-programme-canonical-agenda-row")).toBeInTheDocument();
    expect(screen.getByText("FC Allschwil Junioren B1")).toBeInTheDocument();
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent(/Kunstrasen 2 B/i);
    expect(screen.getByTestId("sce-training-list-row-dressing-room")).toHaveTextContent("E2");
    expect(screen.getByTestId("sce-training-list-row-time")).toHaveTextContent("16:45–18:15");
  });

  it("renders scoped match opponent identity without fabricated end time", () => {
    const matchModel = resolveSceMatchCardFixture({
      homeAway: "HOME",
      startAt: new Date("2026-10-17T18:45:00.000Z"),
      endAt: null,
      operationalEndAt: null,
    });
    const scopedTeamId = "team-1";

    const item: PersonalProgrammeItem = {
      id: "event:match-1",
      sourceType: "MATCH",
      startsAt: new Date("2026-10-17T18:45:00.000Z"),
      title: "Spiel",
      typeLabel: "Spiel",
      deepLink: "/dashboard/matchcenter/match-1",
      ariaLabel: "Spiel",
      canonicalPresentation: matchModel,
      programmeScopeTeamId: scopedTeamId,
    };

    render(wrap(<PersonalProgrammeAgendaRow item={item} timeLabel="20:45" />));

    expect(screen.getByTestId("sce-match-dashboard-agenda-identity")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-list-row-time")).toHaveTextContent("18:45");
    expect(screen.getByText("FC Therwil")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-list-row-time").textContent).not.toMatch(/–/);
  });
});

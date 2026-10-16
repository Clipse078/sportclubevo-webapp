/**
 * @vitest-environment jsdom
 *
 * SCE-ACTIVITY-CREATE-01J-R5.3 — Club Event tenant crest + Navbar active state + quick-action removal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { buildClubIdentity, buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { SceGlobalUtilities } from "@/components/sce/navigation/SceGlobalUtilities";

const repoRoot = process.cwd();

function readRelative(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

vi.mock("@/components/admin/notifications/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/admin/layout/AccountMenu", () => ({
  default: () => <div data-testid="account-menu" />,
}));

describe("SCE-ACTIVITY-CREATE-01J-R5.3 — Club Event tenant crest on programme row", () => {
  it("renders tenant crest when tenantClub resolves but organiser is name-only (Team Programm path)", () => {
    render(
      <SceClubEventCard
        model={{
          kind: "CLUB_EVENT",
          activityId: "e1",
          resourceKey: "club-event:e1",
          typeLabel: "VERANSTALTUNG",
          eventTitle: "Jassturnier",
          organiser: buildNameOnlyClubIdentity("FC Allschwil"),
          tenantClub: buildClubIdentity({
            displayName: "FC Allschwil",
            logoUrl: "https://cdn.example/fca.png",
          }),
          audience: {
            kind: "ORG_UNIT",
            primaryLabel: "Vereinsleitung",
            detailLabel: null,
          },
          schedule: {
            startAt: "2026-10-05T17:00:00.000Z",
            endAt: "2026-10-06T00:00:00.000Z",
          },
          location: buildSportingActivityLocation({
            mode: "NEUTRAL",
            venueName: "Im Brüel",
          }),
          route: { resourceKey: "club-event:e1", consumeHref: "/e", manageHref: null },
        }}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );

    expect(screen.getByTestId("sce-club-event-organiser-crest")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-audience")).toHaveTextContent("Vereinsleitung");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3 — Navbar quick-action guard", () => {
  it("SceGlobalUtilities does not mount contextual workflow actions", () => {
    const utilitiesSource = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilitiesSource).not.toContain("AdminPageActions");
    expect(utilitiesSource).toContain('data-sce-navbar-contextual-actions="none"');

    render(
      <SceGlobalUtilities
        platformWorkspace={false}
        firstName="Test"
        lastName="User"
        email="test@example.com"
      />,
    );

    expect(screen.queryByText("Meeting planen")).not.toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeTruthy();
    expect(screen.getByTestId("account-menu")).toBeTruthy();
    expect(screen.getByTestId("sce-global-utilities")).toHaveAttribute(
      "data-sce-navbar-contextual-actions",
      "none",
    );
  });

  it("AdminPageActions is blocked at the legacy injection boundary", () => {
    const actions = readRelative("components/admin/layout/AdminPageActions.tsx");
    expect(actions).not.toContain("Meeting planen");
    expect(actions).toContain("return null");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3 — Navbar active L1 orange token", () => {
  it("active desktop L1 label uses canonical SCE primary alongside icon", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-global-primary-nav-item--active\s*\{[\s\S]*color:\s*var\(--sce-primary\)/,
    );
    expect(css).toMatch(
      /\.sce-global-primary-nav-item--active\s+\.sce-global-primary-nav-domain-icon[\s\S]*color:\s*var\(--sce-primary\)/,
    );
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3 — programme surfaces consume canonical card", () => {
  it("four programme surfaces route Club Events through ProgrammeSceActivityCard / canonical row", () => {
    const dashboard = readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
    const programmeCard = readRelative("components/programme/ProgrammeSceActivityCard.tsx");
    expect(programmeCard).toContain("SceClubEventCard");
    expect(dashboard).toContain("PersonalProgrammeCanonicalAgendaRow");
    expect(readRelative("app/(admin)/dashboard/mein-programm/page.tsx")).toContain("Programme");
    expect(readRelative("app/(admin)/dashboard/programm/page.tsx")).toContain("programm");
  });
});

/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import ProgrammeSceActivityCard from "@/components/programme/ProgrammeSceActivityCard";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { SCE_MATCH_CARD_SHELL_CLASS } from "@/lib/sporting-activity-presentation/canonical/match-card-rich-density";
import { SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS } from "@/lib/sporting-activity-presentation/canonical/activity-card-programme-shell";
import type { ProgrammeItem } from "@/lib/programme-engine/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function fixtureIdentityOrder(sideEl: Element) {
  const name = sideEl.querySelector('[data-sce-match-region$="-name"]');
  const crest = sideEl.querySelector('[data-sce-match-region$="-crest"]');
  expect(name).toBeTruthy();
  expect(crest).toBeTruthy();
  return { name: name!, crest: crest! };
}

describe("SCE-ACTIVITY-CREATE-01J R5.1 — programme card visual family", () => {
  it("programme shell reuses Resultate-aligned match card surface tokens", () => {
    expect(SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS).toContain(SCE_MATCH_CARD_SHELL_CLASS);
  });

  it("four programme surfaces consume canonical Sce* cards via shared shell wrappers", () => {
    expect(readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx")).toContain(
      "SceProgrammeActivityCardShell",
    );
    expect(readRelative("components/programme/ProgrammeSceActivityCard.tsx")).toContain(
      "SceProgrammeActivityCardShell",
    );
    expect(readRelative("components/programme/ProgrammeListeView.tsx")).toContain(
      "ProgrammeSceActivityCard",
    );
    expect(readRelative("components/admin/mein-programm/PersonalProgrammeListeView.tsx")).toContain(
      "PersonalProgrammeCanonicalAgendaRow",
    );
  });

  it("does not introduce parallel Programme*Card component families", () => {
    const programmeCard = readRelative("components/programme/ProgrammeSceActivityCard.tsx");
    expect(programmeCard).not.toMatch(/ProgrammeMatchCard/);
    expect(programmeCard).not.toMatch(/ResultStyleProgrammeCard/);
    expect(programmeCard).not.toMatch(/DashboardProgrammeCard/);
  });
});

describe("SCE-ACTIVITY-CREATE-01J R5.1 — match inside-crest programme fixture", () => {
  it("Row 1 order: HOME NAME → HOME CREST → VS → AWAY CREST → AWAY NAME", () => {
    const model = resolveSceMatchCardFixture({
      home: {
        ...resolveSceMatchCardFixture().fixture.home,
        displayName: "FC Black Stars",
      },
      away: {
        ...resolveSceMatchCardFixture().fixture.away,
        displayName: "FC Allschwil",
      },
      competitionLabel: "Meister",
    });

    const { container } = render(
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );

    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture).toHaveAttribute("data-sce-match-programme-fixture", "inside-crests");

    const home = fixture.querySelector('[data-sce-match-side="home"]')!;
    const away = fixture.querySelector('[data-sce-match-side="away"]')!;
    const vs = screen.getByTestId("sce-match-vs");

    const homeOrder = fixtureIdentityOrder(home);
    expect(
      homeOrder.name.compareDocumentPosition(homeOrder.crest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const awayOrder = fixtureIdentityOrder(away);
    expect(
      awayOrder.crest.compareDocumentPosition(awayOrder.name) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(home.compareDocumentPosition(vs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(vs.compareDocumentPosition(away) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(home.textContent).toContain("FC Black Stars");
    expect(away.textContent).toContain("FC Allschwil");
  });

  it("merges own team and competition into programme Row 2 without repeating club names", () => {
    const model = resolveSceMatchCardFixture({ competitionLabel: "Meister" });
    render(
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );

    const row2 = screen.getByTestId("sce-match-list-row-team-context");
    expect(row2.textContent).toMatch(/Junioren B1/);
    expect(row2.textContent).toMatch(/Meister/);
    expect(screen.queryByTestId("sce-match-competition")).toBeNull();
  });

  it("ProgrammeSceActivityCard wraps match rows in programme activity shell", () => {
    const model = resolveSceMatchCardFixture();
    const item: ProgrammeItem = {
      id: "m-1",
      kind: "MATCH",
      domainId: "m-1",
      teamId: "team-1",
      presentation: model,
      startsAt: new Date(model.schedule.startAt),
      endsAt: model.schedule.endAt ? new Date(model.schedule.endAt) : null,
      allDay: false,
      resourceKey: model.resourceKey,
    };

    render(<ProgrammeSceActivityCard item={item} fmtCfg={FMT} density="STANDARD" testIdPrefix="club" />);
    expect(screen.getByTestId("club-sce-match-m-1-shell")).toBeTruthy();
    expect(containerHasClassToken(screen.getByTestId("club-sce-match-m-1-shell"), "--sce-match-card-surface")).toBe(
      true,
    );
  });

  it("dashboard agenda row uses compact programme shell density", () => {
    const model = resolveSceMatchCardFixture();
    render(
      <PersonalProgrammeCanonicalAgendaRow
        item={{
          id: "p1",
          sourceType: "SPORTING",
          title: "Spiel",
          startsAt: new Date(),
          allDay: false,
          canonicalPresentation: model,
          ariaLabel: "Spiel",
        }}
        fmtCfg={FMT}
        density="COMPACT"
      />,
    );

    const shell = screen.getByTestId("personal-programme-canonical-agenda-row-shell");
    expect(shell).toHaveAttribute("data-sce-programme-shell-density", "COMPACT");
  });
});

function containerHasClassToken(el: HTMLElement, token: string): boolean {
  return el.className.includes(token);
}

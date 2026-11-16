/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammePreviewRow } from "@/components/ui/dashboard/PersonalProgrammePreviewRow";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW } from "@/lib/sporting-activity-presentation/canonical/programme-dashboard-preview-contract";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { resolveSceMeetingPresentationFromProgramme } from "@/lib/sporting-activity-presentation/canonical/adapters/meeting-programme";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import type { PersonalProgrammeItem } from "../personal-programme-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function trainingItem(overrides: Partial<PersonalProgrammeItem> = {}): PersonalProgrammeItem {
  const model = createSceTrainingCardFixtureSession({
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
  return {
    id: "training-session:session-1",
    sourceType: "TRAINING",
    startsAt: new Date(model.schedule.startAt),
    endsAt: model.schedule.endAt ? new Date(model.schedule.endAt) : undefined,
    title: "Training",
    typeLabel: "Training",
    deepLink: "/dashboard/training/sessions/session-1",
    ariaLabel: "Training",
    canonicalPresentation: model,
    ...overrides,
  };
}

describe("Dashboard programme preview — stacked layout contract", () => {
  it("wires cockpit feed rows to programme-dashboard-preview presentation", () => {
    const feed = readRelative("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    const previewRow = readRelative("components/ui/dashboard/PersonalProgrammePreviewRow.tsx");
    expect(feed).toContain("dashboardCockpitPreview");
    expect(previewRow).toContain(SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW);
    expect(previewRow).toContain("dashboardCockpitPreview");
  });

  it("structural regression: stacked shell without horizontal programme-personal grid on dashboard", () => {
    const layout = readRelative(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).toContain("programmeDashboardPreviewContentStackClass");
    expect(layout).toContain("sce-programme-dashboard-preview-stack");
    const training = readRelative("components/sporting-activity/SceTrainingCard.tsx");
    const stack = readRelative("components/sporting-activity/SceProgrammeDashboardPreviewStack.tsx");
    expect(training).toContain("SceTrainingListRowDashboardPreviewContent");
    expect(stack).toContain("data-sce-activity-card-layout=\"dashboard-preview-stack\"");
  });

  it("training: time, title, team, pill, location and dressing room each on own line", () => {
    render(
      <PersonalProgrammePreviewRow
        item={trainingItem()}
        timeLabel="18:45"
        dashboardCockpitPreview
      />,
    );

    const stack = screen.getByTestId("sce-training-list-row-identity");
    expect(stack).toHaveAttribute("data-sce-activity-card-layout", "dashboard-preview-stack");

    const time = screen.getByTestId("sce-training-list-row-time");
    const title = screen.getByTestId("sce-training-title");
    const team = screen.getByTestId("sce-training-list-row-primary-identity");
    const pill = screen.getByTestId("sce-training-list-row-activity");
    const location = screen.getByTestId("sce-training-list-row-location");
    const dressing = screen.getByTestId("sce-training-list-row-dressing-room");

    expect(stack.contains(time)).toBe(true);
    expect(stack.contains(title)).toBe(true);
    expect(stack.contains(team)).toBe(true);
    expect(stack.contains(pill)).toBe(true);
    expect(stack.contains(location)).toBe(true);
    expect(stack.contains(dressing)).toBe(true);

    expect(time.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(team) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(team.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pill.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(location.compareDocumentPosition(dressing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(title.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(team).toHaveTextContent("FC Allschwil Junioren B1");
    expect(location).toHaveTextContent(/Im Brüel|Kunstrasen/);
    expect(dressing).toHaveTextContent("E2");
  });

  it("meeting: organisational unit line without dressing room", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-board",
      slug: "vorstand",
      title: "Vorstandssitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      location: "Clubhaus",
      contextLabel: "Vorstand",
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-board",
      sourceType: "MEETING",
      startsAt: new Date(model.schedule.startAt),
      title: model.meetingTitle,
      typeLabel: "Sitzung",
      deepLink: model.route.consumeHref!,
      ariaLabel: "Sitzung",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammeCanonicalAgendaRow
        item={item}
        fmtCfg={FMT}
        density="COMPACT"
        listRowPresentation={SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW}
      />,
    );

    expect(screen.getByTestId("sce-meeting-context")).toHaveTextContent("Vorstand");
    expect(screen.getByTestId("sce-meeting-list-row-location")).toHaveTextContent("Clubhaus");
    expect(screen.queryByTestId("sce-programme-dashboard-preview-dressing-room")).toBeNull();
  });

  it("match: preserves programme-fixture identity band with stacked cockpit metadata", () => {
    const model = resolveSceMatchCardFixture({ competitionLabel: "Meister" });
    const item: PersonalProgrammeItem = {
      id: "match:1",
      sourceType: "MATCH",
      startsAt: new Date(model.schedule.startAt),
      title: "Spiel",
      typeLabel: "Spiel",
      deepLink: "/dashboard/matchcenter/1",
      ariaLabel: "Spiel",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="15:00" dashboardCockpitPreview />,
    );

    expect(screen.getByTestId("sce-match-fixture")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-list-row-team-context")).toBeInTheDocument();
    expect(screen.getByTestId("sce-match-location")).toBeInTheDocument();
  });

  it("omits team context line when title already embeds the team name", () => {
    const model = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      trainingTitle: "FC Allschwil Junioren B1 Training",
    });
    const item: PersonalProgrammeItem = {
      id: "training:dup",
      sourceType: "TRAINING",
      startsAt: new Date(model.schedule.startAt),
      title: model.trainingTitle,
      typeLabel: "Training",
      deepLink: "/x",
      ariaLabel: "Training",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="18:00" dashboardCockpitPreview />,
    );

    expect(screen.queryByTestId("sce-training-list-row-primary-identity")).toBeNull();
    expect(screen.getByTestId("sce-training-title")).toHaveTextContent(/Junioren B1/);
  });

  it("long titles and locations use break-words without truncate class on title", () => {
    const longTitle =
      "Grosses Freundschaftsspiel mit einem sehr langen Titel der natürlich umbrechen soll";
    const longVenue =
      "Sportanlage Brüelweg mit einem ausserordentlich langen Ortsnamen für Regression";
    const model = createSceTrainingCardFixtureSession({
      trainingTitle: longTitle,
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: longVenue,
      }),
    });
    const item: PersonalProgrammeItem = {
      id: "training:long",
      sourceType: "TRAINING",
      startsAt: new Date(model.schedule.startAt),
      title: longTitle,
      typeLabel: "Training",
      deepLink: "/x",
      ariaLabel: "Training",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="18:00" dashboardCockpitPreview />,
    );

    const title = screen.getByTestId("sce-training-title");
    expect(title.className).toMatch(/break-words/);
    expect(title.className).not.toMatch(/\btruncate\b/);
    expect(title).toHaveTextContent(longTitle);

    const location = screen.getByTestId("sce-training-list-row-location");
    expect(location).toHaveTextContent(longVenue);
  });

  it("preserves detail link and does not nest interactive controls", () => {
    const item = trainingItem();
    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="18:45" dashboardCockpitPreview />,
    );
    const link = screen.getByRole("link", { name: item.ariaLabel });
    expect(link).toHaveAttribute("href", item.deepLink);
    expect(link.querySelector("button")).toBeNull();
    expect(link.querySelector("a a")).toBeNull();
  });

  it("Mein Programm list preview keeps horizontal programme-personal rows", () => {
    render(<PersonalProgrammePreviewRow item={trainingItem()} timeLabel="18:45" />);
    const row = document.querySelector('[data-sce-training-list-row-presentation="programme-personal"]');
    expect(row).toBeTruthy();
    expect(row).toHaveAttribute("data-sce-activity-card-layout", "horizontal-full-width");
  });
});
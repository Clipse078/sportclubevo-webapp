/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammePreviewRow } from "@/components/ui/dashboard/PersonalProgrammePreviewRow";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import {
  SCE_PROGRAMME_DASHBOARD_PREVIEW_CONTAINER_NAME,
  SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW,
  SCE_PROGRAMME_DASHBOARD_PREVIEW_WIDE_MIN_WIDTH,
} from "@/lib/sporting-activity-presentation/canonical/programme-dashboard-preview-contract";
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
    trainingTitle: "Training",
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
    title: model.trainingTitle,
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

  it("structural regression: container-query layout shell with single identity slot", () => {
    const css = readRelative("components/sporting-activity/SceProgrammeDashboardPreviewLayout.module.css");
    const stack = readRelative("components/sporting-activity/SceProgrammeDashboardPreviewStack.tsx");
    expect(css).toContain(`container-name: ${SCE_PROGRAMME_DASHBOARD_PREVIEW_CONTAINER_NAME}`);
    expect(css).toContain(`min-width: ${SCE_PROGRAMME_DASHBOARD_PREVIEW_WIDE_MIN_WIDTH}`);
    expect(css).toContain("grid-area: identity");
    expect(stack).toContain("SceProgrammeDashboardPreviewBody");
    expect(stack).toContain("data-sce-programme-dashboard-preview-layout");
    expect(stack).toContain("identitySlot");
    expect(stack).not.toContain("identityPlacementWide");
    expect(stack).not.toContain("identityPlacementNarrow");
  });

  it("training: time, title, club/team identity, pill, location and labelled dressing room", () => {
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
    const identity = screen.getByTestId("sce-training-list-row-primary-identity");
    const pill = screen.getByTestId("sce-training-list-row-activity");
    const location = screen.getByTestId("sce-training-list-row-location");
    const dressing = screen.getByTestId("sce-training-list-row-dressing-room");

    expect(time.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(identity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(identity.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pill.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(location.compareDocumentPosition(dressing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(within(identity).getByText("FC Allschwil")).toBeInTheDocument();
    expect(within(identity).getByText("Junioren B1")).toBeInTheDocument();
    expect(within(identity).queryByText("FC Allschwil Junioren B1")).toBeNull();
    expect(location).toHaveTextContent(/Im Brüel|Kunstrasen/);
    expect(dressing).toHaveTextContent("Garderobe E2");
    expect(screen.queryAllByTestId("sce-training-list-row-primary-identity")).toHaveLength(1);
  });

  it("meeting: club/org identity with location and no dressing room", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-board",
      slug: "vorstand",
      title: "Monatssitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      location: "Clubhaus",
      organisationalContext: "Vorstand",
      tenantClub: buildClubIdentity({ displayName: "FC Musterstadt", logoUrl: "https://cdn/logo.png" }),
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

    const identity = screen.getByTestId("sce-meeting-context");
    expect(within(identity).getByText("FC Musterstadt")).toBeInTheDocument();
    expect(within(identity).getByText("Vorstand")).toBeInTheDocument();
    expect(screen.getByTestId("sce-meeting-list-row-location")).toHaveTextContent("Clubhaus");
    expect(screen.queryByTestId("sce-programme-dashboard-preview-dressing-room")).toBeNull();
  });

  it("meeting without organisational unit renders club identity alone", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-none",
      slug: "alle",
      title: "Vereinssitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      tenantClub: buildClubIdentity({ displayName: "FC Musterstadt" }),
    });
    render(
      <PersonalProgrammeCanonicalAgendaRow
        item={{
          id: "meeting:m-none",
          sourceType: "MEETING",
          startsAt: new Date(model.schedule.startAt),
          title: model.meetingTitle,
          typeLabel: "Sitzung",
          deepLink: "/vereinsleitung/meetings/alle",
          ariaLabel: "Sitzung",
          canonicalPresentation: model,
        }}
        fmtCfg={FMT}
        listRowPresentation={SCE_PROGRAMME_DASHBOARD_PREVIEW_LIST_ROW}
      />,
    );

    const identity = screen.getByTestId("sce-meeting-context");
    expect(within(identity).getByText("FC Musterstadt")).toBeInTheDocument();
    expect(within(identity).queryByText(/Meeting · Organisator/i)).toBeNull();
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

  it("training Junioren F2: club crest/name only when title carries the team", () => {
    const model = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren F2" },
      trainingTitle: "Junioren F2 Training",
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: "https://cdn.example/fca.png",
      }),
    });
    const item: PersonalProgrammeItem = {
      id: "training:f2",
      sourceType: "TRAINING",
      startsAt: new Date(model.schedule.startAt),
      title: model.trainingTitle,
      contextLabel: "Junioren F2 · Trainer/in",
      typeLabel: "Training",
      deepLink: "/x",
      ariaLabel: "Training",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="18:00" dashboardCockpitPreview />,
    );

    const identity = screen.getByTestId("sce-training-list-row-primary-identity");
    expect(within(identity).getByText("FC Allschwil")).toBeInTheDocument();
    expect(within(identity).queryByText(/Junioren F2/)).toBeNull();
    expect(screen.getByTestId("sce-training-title")).toHaveTextContent("Junioren F2 Training");
    expect(screen.queryByText(/Meeting · Organisator/i)).toBeNull();
  });

  it("meeting organizer adapter row: club branding only, role contextLabel not in preview", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-org",
      slug: "org-meet",
      title: "Vorstandssitzung",
      meetingDate: new Date("2026-11-15T17:00:00.000Z"),
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: "https://cdn.example/fca.png",
      }),
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-org",
      sourceType: "MEETING",
      startsAt: new Date(model.schedule.startAt),
      title: model.meetingTitle,
      contextLabel: "Meeting · Organisator",
      typeLabel: "Sitzung",
      deepLink: model.route.consumeHref!,
      ariaLabel: "Sitzung",
      canonicalPresentation: model,
    };

    render(
      <PersonalProgrammePreviewRow item={item} timeLabel="17:00" dashboardCockpitPreview />,
    );

    const identity = screen.getByTestId("sce-meeting-context");
    expect(within(identity).getByText("FC Allschwil")).toBeInTheDocument();
    expect(screen.queryByText(/Meeting · Organisator/i)).toBeNull();
    expect(within(identity).queryByText(/Organisator/i)).toBeNull();
  });

  it("dashboard preview identity uses plain secondary typography (not sce-team-name)", () => {
    render(
      <PersonalProgrammePreviewRow
        item={trainingItem()}
        timeLabel="18:45"
        dashboardCockpitPreview
      />,
    );
    const identity = screen.getByTestId("sce-training-list-row-primary-identity");
    expect(identity.querySelector("[data-sce-team-name]")).toBeNull();
  });

  it("keeps club identity when authored title already embeds the team name", () => {
    const model = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      trainingTitle: "FC Allschwil Junioren B1 Training",
      tenantClub: buildClubIdentity({ displayName: "FC Allschwil" }),
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

    const identity = screen.getByTestId("sce-training-list-row-primary-identity");
    expect(within(identity).getByText("FC Allschwil")).toBeInTheDocument();
    expect(within(identity).queryByText(/Junioren B1/)).toBeNull();
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
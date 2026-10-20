/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ADVANCED_FORMAT_MAY_REQUIRE_PLAYING_FORMAT,
  DEFAULT_PLAYING_FORMAT_ASSIGNED,
  LEGACY_TOURNAMENT_FORMAT_REQUIRED,
  NORMAL_TOURNAMENT_FORMAT_REQUIRED,
  PARALLEL_SCHEDULE_TRUTH_CREATED,
  PLAYING_FORMAT_OPTIONAL_BY_DEFAULT,
  PLAYING_FORMAT_REQUIRED_GLOBALLY,
  SILENT_FORMAT_INFERENCE,
  UNSPECIFIED_PLAYING_FORMAT_VALID,
} from "@/lib/tournament-scheduling/tournament-programme-architecture";
import { FEASIBILITY_MAX_PARTICIPANTS } from "@/lib/tournament-scheduling/feasibility/constants";
import { E_FF12_ROTATION_4_TEMPLATE } from "@/lib/tournament-scheduling/programme-templates/catalogue/e-ff12-rotation";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import {
  reconcileComposerPlannerForParticipants,
  resolveComposerProgrammeTemplate,
} from "../tournament-composer-programme-template";
import {
  resolveComposerSpielplanCreationEnabled,
  shouldPersistComposerPlanner,
} from "../resolve-composer-spielplan-creation-enabled";
import { validateHomePlannerDraft } from "../tournament-composer-planner-validation";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import {
  createComposerScheduleRoundBreakDraft,
  validateComposerScheduleRoundBreaks,
} from "../tournament-composer-schedule-round-breaks";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import { computeTournamentCreateTabErrors } from "@/lib/tournaments/tournament-create-validation";
import { validateTournamentCreateWorkflowStep } from "@/lib/tournaments/tournament-create-step-validation";
import {
  buildTournamentCreateTabNavigationConfig,
  resolveTournamentCreateTabOrder,
} from "@/lib/tournaments/tournament-create-workflow-config";
import SceTournamentSpielplanPreviewFixtureCard from "@/components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard";
import { buildComposerParticipantFixtureSidePresentation } from "@/lib/tournaments/tournament-participant-presentation";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import {
  TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS,
  enableTournamentCreateSpielplanCreation,
} from "@/components/admin/tournamentcenter/__tests__/tournament-form-test-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import "@/components/admin/tournamentcenter/__tests__/tournament-create-form-composer-mock";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function homeBaseDraft() {
  const draft = createEmptyTournamentComposerDraft();
  draft.homeAway = "HOME";
  draft.seasonId = "season-1";
  draft.title = "Turnier";
  draft.startAt = "2026-06-01T10:00";
  draft.endAt = "2026-06-01T18:00";
  draft.participants = Array.from({ length: 4 }, (_, i) => ({
    localId: `p${i}`,
    kind: "TEAM" as const,
    teamId: `t${i}`,
    displayName: `Team ${i + 1}`,
    subLabel: null,
    dressingRooms: [],
  }));
  return draft;
}

describe("SCE-TOURNAMENT-PLANNER-02D R13 — final creator / Spielplan UX hardening", () => {
  it("01 — default Spielplan OFF on empty composer draft", () => {
    const draft = createEmptyTournamentComposerDraft();
    expect(draft.spielplanCreationEnabled).toBe(false);
    expect(resolveComposerSpielplanCreationEnabled(draft)).toBe(false);
  });

  it("02 — OFF uses five-step creator flow", () => {
    const tabs = resolveTournamentCreateTabOrder("HOME", { spielplanCreationEnabled: false });
    expect(tabs).toEqual(["termin", "teams", "ressourcen", "publikation", "uebersicht"]);
    expect(tabs).toHaveLength(5);
  });

  it("03 — ON uses eight-step creator flow", () => {
    const tabs = resolveTournamentCreateTabOrder("HOME", { spielplanCreationEnabled: true });
    expect(tabs).toEqual([
      "termin",
      "teams",
      "turnierformat",
      "spielfelder",
      "spielplan",
      "ressourcen",
      "publikation",
      "uebersicht",
    ]);
    expect(tabs).toHaveLength(8);
  });

  it("04 — OFF tournament passes creator validation without planner", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = false;
    draft.planner = null;
    expect(computeTournamentCreateTabErrors(draft)).toEqual({});
    expect(validateTournamentCreateWorkflowStep(draft, "uebersicht").valid).toBe(true);
  });

  it("05 — ON → OFF clears planner validation even when planner draft is incomplete", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = false;
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.planner.pitches = [];
    expect(validateHomePlannerDraft({ ...draft, spielplanCreationEnabled: true })).not.toEqual({});
    expect(validateHomePlannerDraft(draft)).toEqual({});
    expect(computeTournamentCreateTabErrors(draft)).toEqual({});
  });

  it("06 — OFF → ON restores planner workflow and preserves stored planner draft", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner.pitchesUserCustomized = true;
    planner.pitches[0] = { ...planner.pitches[0]!, label: "Nordfeld" };
    draft.planner = planner;

    draft.spielplanCreationEnabled = false;
    expect(shouldPersistComposerPlanner(draft)).toBe(false);
    expect(draft.planner?.pitches[0]?.label).toBe("Nordfeld");

    draft.spielplanCreationEnabled = true;
    expect(resolveComposerSpielplanCreationEnabled(draft)).toBe(true);
    expect(draft.planner?.pitches[0]?.label).toBe("Nordfeld");
    const hydrated = hydrateTournamentComposerFormFromDraft(draft);
    expect(hydrated.spielplanCreationEnabled).toBe(true);
  });

  it("07–09 — PlayingFormat optional: valid preview, no silent default", () => {
    expect(PLAYING_FORMAT_OPTIONAL_BY_DEFAULT).toBe(true);
    expect(UNSPECIFIED_PLAYING_FORMAT_VALID).toBe(true);
    expect(DEFAULT_PLAYING_FORMAT_ASSIGNED).toBe(false);
    expect(SILENT_FORMAT_INFERENCE).toBe(false);

    const defaults = createDefaultTournamentComposerPlannerDraft();
    expect(defaults.pitches.every((p) => p.playersPerSide == null)).toBe(true);

    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.planner.pitches = [
      { localId: "f1", label: "Feld 1", playersPerSide: null },
      { localId: "f2", label: "Feld 2", playersPerSide: null },
    ];
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: null,
      planner: draft.planner,
    });
    expect(preview.status).toBe("OK");
  });

  it("10 — Wechselzeit 0 is valid", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    draft.planner.timing.transitionMinutes = 0;
    expect(validateHomePlannerDraft(draft)).toEqual({});
  });

  it("11–12 — zero pauses valid; pause after final round rejected", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    draft.planner.scheduleRoundBreaks = [];
    expect(validateHomePlannerDraft(draft)).toEqual({});

    const roundCount = 6;
    const finalRoundPause = validateComposerScheduleRoundBreaks({
      roundCount,
      breaks: [
        createComposerScheduleRoundBreakDraft({ localId: "bad", afterRoundNumber: 6, durationMinutes: 10 }),
      ],
    });
    expect(Object.values(finalRoundPause)[0]).toMatch(/zwischen 1 und 5/i);
  });

  it("13 — template break defaults remain in scheduleRoundBreaks and user can clear", () => {
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.scheduleRoundBreaks?.length).toBeGreaterThan(0);
    const cleared = { ...planner, scheduleRoundBreaks: [] };
    expect(cleared.scheduleRoundBreaks).toHaveLength(0);
  });

  it("14–15 — curated template path and authoritative field count", () => {
    const resolved = resolveComposerProgrammeTemplate({
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(resolved?.proposal.template?.fields.length).toBe(E_FF12_ROTATION_4_TEMPLATE.fields.length);
    const planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(planner.pitches).toHaveLength(E_FF12_ROTATION_4_TEMPLATE.fields.length);
  });

  it("16–17 — generic fallback without curated template; no arbitrary participant ceiling", () => {
    expect(FEASIBILITY_MAX_PARTICIPANTS).toBe(Number.MAX_SAFE_INTEGER);
    const draft = homeBaseDraft();
    draft.participants = Array.from({ length: 20 }, (_, i) => ({
      localId: `p${i}`,
      kind: "MANUAL" as const,
      manualLabel: `T${i + 1}`,
      displayName: `T${i + 1}`,
      subLabel: null,
      dressingRooms: [],
    }));
    draft.spielplanCreationEnabled = true;
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft({ initialPitchCount: 2 }),
      participantCount: 20,
      categoryContext: null,
    });
    expect(resolveComposerProgrammeTemplate({ participantCount: 20, categoryContext: "E_FF12" })).toBeNull();
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: null,
      planner: draft.planner,
    });
    expect(preview.status).not.toBe("ERROR");
    expect(preview.errorMessage ?? "").not.toMatch(/maximal|höchstens 16/i);
  });

  it("18 — timeline ordering: rounds and breaks chronological (R11)", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    draft.planner.scheduleRoundBreaks = [
      createComposerScheduleRoundBreakDraft({ localId: "b", afterRoundNumber: 3, durationMinutes: 10 }),
    ];
    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
    });
    expect(preview.status).toBe("OK");
    const labels = preview.timelineItems.map((item) =>
      item.kind === "ROUND" ? `R${item.roundNumber}` : "BREAK",
    );
    expect(labels.indexOf("BREAK")).toBeGreaterThan(labels.indexOf("R3"));
    expect(labels.indexOf("R4")).toBeGreaterThan(labels.indexOf("BREAK"));
  });

  it("19–21 — fixture card structure, crest path, no Heim/Auswärts", () => {
    const sideA = buildComposerParticipantFixtureSidePresentation({
      participants: homeBaseDraft().participants,
      participantLocalId: "p0",
      tenantClubName: "Club",
      tenantLogoUrl: "/logo.png",
    });
    const sideB = buildComposerParticipantFixtureSidePresentation({
      participants: homeBaseDraft().participants,
      participantLocalId: "p1",
      tenantClubName: "Club",
      tenantLogoUrl: "/logo.png",
    });
    render(
      <SceTournamentSpielplanPreviewFixtureCard
        fixtureKey="r1-f1"
        pitchLabel="Feld 1"
        playersPerSide={null}
        sideA={sideA}
        sideB={sideB}
      />,
    );
    expect(screen.getByTestId("sce-tournament-spielplan-fixture-field")).toHaveTextContent("Feld 1");
    expect(screen.queryByTestId("sce-tournament-spielplan-fixture-format")).toBeNull();
    const card = read("components/sce/tournament/SceTournamentSpielplanPreviewFixtureCard.tsx");
    expect(card).toMatch(/SceTournamentFixturePresentation/);
    expect(card).not.toMatch(/Heim|Auswärt/i);
  });

  it("22 — no mandatory Spielart validation in planner validation module", () => {
    const validation = read("lib/tournaments/composer/tournament-composer-planner-validation.ts");
    expect(validation).not.toMatch(/Spielart/i);
    expect(validation).not.toMatch(/jedes Spielfeld/i);
  });

  it("23 — single canonical schedule / break architecture", () => {
    expect(PARALLEL_SCHEDULE_TRUTH_CREATED).toBe(false);
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).not.toMatch(/mainPause.*enabled|Hauptpause/i);
    expect(panels).toMatch(/scheduleRoundBreaks/);
  });

  it("24 — accessibility: toggle, pause delete, fixture participant labels", () => {
    render(<TournamentCreateForm {...TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS} />);
    const toggle = screen.getByRole("switch", { name: "Spielplan erstellen" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    enableTournamentCreateSpielplanCreation();
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    const matchup = read("components/sce/tournament/SceTournamentFixtureCompactMatchup.tsx");
    expect(matchup).toMatch(/buildStackedFixtureAccessibleLabel|aria-label/);
  });

  it("flexibility flags — no global tournament or playing-format requirement", () => {
    expect(PLAYING_FORMAT_REQUIRED_GLOBALLY).toBe(false);
    expect(NORMAL_TOURNAMENT_FORMAT_REQUIRED).toBe(false);
    expect(LEGACY_TOURNAMENT_FORMAT_REQUIRED).toBe(false);
    expect(ADVANCED_FORMAT_MAY_REQUIRE_PLAYING_FORMAT).toBe(true);
  });

  it("design system — canonical SwitchToggle on Termin; no new creator checkboxes", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toMatch(/SwitchToggle/);
    expect(form).not.toMatch(/type=\"checkbox\"/);
    const panels = read("components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels.tsx");
    expect(panels).not.toMatch(/Bitte für jedes Spielfeld/i);
    expect(panels).not.toMatch(/Spielarten fest/i);
  });

  it("Turnierformat not required when Spielplan OFF", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = false;
    expect(validateTournamentCreateWorkflowStep(draft, "turnierformat").valid).toBe(true);
    expect(
      buildTournamentCreateTabNavigationConfig({ spielplanCreationEnabled: false }).tabs.some(
        (t) => t.key === "turnierformat",
      ),
    ).toBe(false);
  });
});

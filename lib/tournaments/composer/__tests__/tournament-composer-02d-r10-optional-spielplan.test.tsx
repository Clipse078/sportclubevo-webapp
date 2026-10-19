/** @vitest-environment jsdom */
import "@/components/admin/tournamentcenter/__tests__/tournament-create-form-composer-mock";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tournamentcenter/create",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
import React from "react";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "../tournament-composer-planner-defaults";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import {
  resolveComposerSpielplanCreationEnabled,
  shouldPersistComposerPlanner,
} from "../resolve-composer-spielplan-creation-enabled";
import { buildTournamentSchedulePreview } from "../tournament-composer-schedule-preview";
import { computeTournamentCreateTabErrors } from "@/lib/tournaments/tournament-create-validation";
import { validateTournamentCreateWorkflowStep } from "@/lib/tournaments/tournament-create-step-validation";
import { buildTournamentCreateTabNavigationConfig } from "@/lib/tournaments/tournament-create-workflow-config";
import { reconcileComposerPlannerForParticipants } from "../tournament-composer-programme-template";
import { prepareTournamentComposerProposal } from "../prepare-tournament-composer-proposal";
import ComposerSchedulePreviewPresentation from "@/components/admin/tournamentcenter/composer/ComposerSchedulePreviewPresentation";
import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import {
  TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS,
  enableTournamentCreateSpielplanCreation,
} from "@/components/admin/tournamentcenter/__tests__/tournament-form-test-helpers";

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
  draft.endAt = "2026-06-01T12:00";
  draft.participants = [
    { localId: "p1", kind: "TEAM", teamId: "t1", displayName: "A", subLabel: null, dressingRooms: [] },
    { localId: "p2", kind: "TEAM", teamId: "t2", displayName: "B", subLabel: null, dressingRooms: [] },
    { localId: "p3", kind: "TEAM", teamId: "t3", displayName: "C", subLabel: null, dressingRooms: [] },
    { localId: "p4", kind: "TEAM", teamId: "t4", displayName: "D", subLabel: null, dressingRooms: [] },
  ];
  return draft;
}

describe("SCE-TOURNAMENT-PLANNER-02D R10 — optional Spielplan", () => {
  it("CASE A — simple tournament without Spielplan has no planner tabs or validation", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = false;
    draft.planner = null;

    const tabs = buildTournamentCreateTabNavigationConfig({
      homeAway: "HOME",
      spielplanCreationEnabled: false,
    }).tabs.map((t) => t.key);
    expect(tabs).toEqual(["termin", "teams", "ressourcen", "publikation", "uebersicht"]);
    expect(computeTournamentCreateTabErrors(draft)).toEqual({});
    expect(validateTournamentCreateWorkflowStep(draft, "turnierformat").valid).toBe(true);
    expect(validateTournamentCreateWorkflowStep(draft, "spielplan").valid).toBe(true);
    expect(shouldPersistComposerPlanner(draft)).toBe(false);
  });

  it("CASE B — generic Spielplan without Spielart generates preview", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    draft.planner.pitches = [
      { localId: "f1", label: "Feld 1", playersPerSide: null },
      { localId: "f2", label: "Feld 2", playersPerSide: null },
    ];
    draft.planner.timing.matchDurationMinutes = 12;
    draft.planner.timing.transitionMinutes = 3;

    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: null,
      planner: draft.planner,
    });
    expect(preview.status).toBe("OK");
    expect(preview.fixtureCount).toBeGreaterThan(0);
    expect(preview.errorMessage ?? "").not.toMatch(/Spielart/i);

    const presentation = render(
      <ComposerSchedulePreviewPresentation
        payload={draft}
        timelineItems={preview.timelineItems}
        summaryLine={preview.tournamentStartLabel}
      />,
    );
    expect(presentation.container.textContent).not.toMatch(/Nicht festgelegt/);
  });

  it("CASE C — curated E template still materialises with Spielplan ON", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    draft.planner = createDefaultTournamentComposerPlannerDraft();
    for (const p of draft.participants) {
      (p as { teamAgeGroup?: string }).teamAgeGroup = "E";
      (p as { teamJuniorCategoryCode?: string }).teamJuniorCategoryCode = "E";
    }
    const prepared = prepareTournamentComposerProposal({
      participants: draft.participants,
      planner: draft.planner,
    });
    expect(prepared.proposal.kind).toBe("FULL_TEMPLATE");
    expect(prepared.planner.pitches.length).toBeGreaterThan(1);
  });

  it("CASE D — user override with cleared PlayingFormat stays schedulable", () => {
    const draft = homeBaseDraft();
    draft.spielplanCreationEnabled = true;
    let planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    planner = {
      ...planner,
      pitchesUserCustomized: true,
      pitches: planner.pitches.map((p) => ({ ...p, playersPerSide: null })),
    };
    draft.planner = planner;

    const preview = buildTournamentSchedulePreview({
      payload: draft,
      categoryContext: "E_FF12",
      planner,
    });
    expect(preview.status).toBe("OK");
  });

  it("CASE E — draft hydration preserves toggle OFF and ON", () => {
    const offDraft = homeBaseDraft();
    offDraft.spielplanCreationEnabled = false;
    offDraft.planner = createDefaultTournamentComposerPlannerDraft();
    const hydratedOff = hydrateTournamentComposerFormFromDraft(offDraft);
    expect(hydratedOff.spielplanCreationEnabled).toBe(false);

    const onDraft = homeBaseDraft();
    onDraft.spielplanCreationEnabled = true;
    onDraft.planner = createDefaultTournamentComposerPlannerDraft();
    onDraft.planner.pitchesUserCustomized = true;
    onDraft.planner.pitches.push({ localId: "x", label: "Feld 2", playersPerSide: 3 });
    const hydratedOn = hydrateTournamentComposerFormFromDraft(onDraft);
    expect(hydratedOn.spielplanCreationEnabled).toBe(true);
  });

  it("CASE F — legacy planner draft without explicit flag stays enabled", () => {
    const legacy = homeBaseDraft();
    delete legacy.spielplanCreationEnabled;
    legacy.planner = reconcileComposerPlannerForParticipants({
      planner: createDefaultTournamentComposerPlannerDraft(),
      participantCount: 4,
      categoryContext: "E_FF12",
    });
    expect(resolveComposerSpielplanCreationEnabled(legacy)).toBe(true);
  });

  it("creator exposes SwitchToggle for Spielplan erstellen (default OFF)", () => {
    render(<TournamentCreateForm {...TOURNAMENT_CREATE_FORM_TEST_BASE_PROPS} />);
    const toggle = screen.getByRole("switch", { name: "Spielplan erstellen" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toContain("SwitchToggle");
    expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toContain("Spielplan erstellen");
    enableTournamentCreateSpielplanCreation();
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
});

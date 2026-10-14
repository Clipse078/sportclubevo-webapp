/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import type { SceActivityCreateDefinition } from "@/lib/sce/activity-composer/types";
import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import { resolveGuidedStepVisualState } from "@/lib/sce/activity-composer/guided-workflow";
import { buildTrainingCreateRecurrenceSummary } from "@/lib/training/training-create-recurrence-summary";
import { createEmptyMatchComposerDraft } from "@/lib/matchcenter/composer/match-composer-draft-types";
import {
  resolveMatchCreateStepValid,
  validateMatchCreateWorkflowStep,
} from "@/lib/matchcenter/match-create-step-validation";
import { resolveTrainingCreateStepValid } from "@/lib/training/training-create-step-validation";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import { createEmptyTrainingComposerDraft } from "@/lib/training/composer/training-composer-draft-types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

type R6TabId = "team" | "termin" | "optional" | "ressourcen" | "pruefen";

type R6Draft = { title: string };

function buildR6TabNavigationConfig(): ContextTabNavigationConfig<R6TabId> {
  return {
    contextKind: "SCE_ACTIVITY_COMPOSER_R6_TEST",
    defaultTab: "team",
    tabs: [
      { key: "team", label: "Team", placement: "primary" },
      { key: "termin", label: "Termin", placement: "primary" },
      { key: "optional", label: "Optional", placement: "primary" },
      { key: "ressourcen", label: "Ressourcen", placement: "primary" },
      { key: "pruefen", label: "Übersicht", placement: "primary" },
    ],
  };
}

function r6GuidedDefinition(): SceActivityCreateDefinition<R6Draft, { id: string }, R6TabId> {
  return {
    activityKind: "TRAINING",
    title: "R6 guided test",
    createActionLabel: "Training erstellen",
    defaultTab: "team",
    buildTabNavigationConfig: buildR6TabNavigationConfig,
    initialDraft: { title: "" },
    tabs: [
      {
        key: "team",
        label: "Team",
        render: ({ draft, setDraft }) => (
          <input
            aria-label="Team name"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        ),
      },
      { key: "termin", label: "Termin", render: () => <p>Termin</p> },
      { key: "optional", label: "Optional", render: () => <p>Opt</p> },
      { key: "ressourcen", label: "Ressourcen", render: () => <p>Res</p> },
      { key: "pruefen", label: "Übersicht", render: () => <p>Review</p> },
    ],
    validateDraft: (draft) =>
      draft.title.trim().length >= 2
        ? { valid: true, tabErrors: {} }
        : {
            valid: false,
            tabErrors: { team: true },
            firstInvalidTab: "team",
          },
    submitDraft: async () => ({ ok: true as const, result: { id: "ok" } }),
    guidedWorkflow: {
      finalReviewTab: "pruefen",
      validateStep: (draft, stepKey) => {
        if (stepKey === "team" && draft.title.trim().length < 2) {
          return { valid: false, tabErrors: { team: true }, firstInvalidTab: "team" };
        }
        return { valid: true, tabErrors: {} };
      },
      resolveStepValid: (draft, stepKey) =>
        stepKey === "team" ? draft.title.trim().length >= 2 : true,
    },
  };
}

function stepState(tab: string): string | null {
  return screen.getByTestId(`sce-activity-composer-tabs-${tab}`).getAttribute("data-guided-step-state");
}

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("SCE-ACTIVITY-CREATE-01E-R6 — guided step semantics", () => {
  it("untouched valid optional future step stays unvisited (no legacy stepComplete)", () => {
    expect(
      resolveGuidedStepVisualState({
        tabKey: "ressourcen",
        activeTab: "team",
        orderedTabKeys: ["team", "termin", "ressourcen"],
        stepValid: true,
        reviewed: false,
      }),
    ).toBe("unvisited");
  });

  it("reviewed valid optional empty step is completed", () => {
    expect(
      resolveGuidedStepVisualState({
        tabKey: "ressourcen",
        activeTab: "pruefen",
        orderedTabKeys: ["team", "termin", "ressourcen", "pruefen"],
        stepValid: true,
        reviewed: true,
        finalReviewTab: "pruefen",
      }),
    ).toBe("completed");
  });

  it("reviewed invalid step shows error even without tabErrors flag", () => {
    expect(
      resolveGuidedStepVisualState({
        tabKey: "team",
        activeTab: "termin",
        orderedTabKeys: ["team", "termin"],
        reviewed: true,
        stepValid: false,
      }),
    ).toBe("error");
  });

  it("final review tab never shows completed checkmark", () => {
    expect(
      resolveGuidedStepVisualState({
        tabKey: "pruefen",
        activeTab: "team",
        orderedTabKeys: ["team", "pruefen"],
        reviewed: true,
        stepValid: true,
        finalReviewTab: "pruefen",
      }),
    ).toBe("unvisited");
  });

  it("composer initial optional steps are unvisited", () => {
    render(
      <SceActivityComposer
        definition={r6GuidedDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{ title: "Valid team" }}
      />,
    );
    expect(stepState("team")).toBe("current");
    expect(stepState("termin")).toBe("unvisited");
    expect(stepState("optional")).toBe("unvisited");
    expect(stepState("ressourcen")).toBe("unvisited");
    expect(stepState("pruefen")).toBe("unvisited");
  });

  it("Weiter marks reviewed steps and advances without wizard lock", async () => {
    render(
      <SceActivityComposer
        definition={r6GuidedDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{ title: "Valid team" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() => expect(stepState("team")).toBe("completed"));
    expect(stepState("termin")).toBe("current");
    expect(stepState("optional")).toBe("unvisited");
    fireEvent.click(screen.getByTestId("sce-activity-composer-tabs-pruefen"));
    await waitFor(() => expect(stepState("pruefen")).toBe("current"));
  });

  it("invalid Weiter shows error on current step", () => {
    render(
      <SceActivityComposer
        definition={r6GuidedDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{ title: "x" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    expect(stepState("team")).toBe("error");
    expect(stepState("termin")).toBe("unvisited");
  });
});

describe("SCE-ACTIVITY-CREATE-01E-R6 — Training alignment", () => {
  it("formats recurrence summary with localized German dates", () => {
    const summary = buildTrainingCreateRecurrenceSummary({
      recurrenceEnabled: false,
      validFrom: "2026-10-14",
      validUntil: "2026-10-14",
      weekdayRows: [
        {
          weekday: "WEDNESDAY",
          enabled: true,
          startsAt: "17:00",
          endsAt: "18:30",
        },
      ],
      weekdayLabels: { WEDNESDAY: "Mittwoch" } as Record<
        import("@/lib/training/types").Weekday,
        string
      >,
    });
    expect(summary).toContain("14.10.2026");
    expect(summary).not.toContain("2026-10-14");
    expect(summary).toContain("17:00–18:30");
  });

  it("training optional steps are valid before review", () => {
    const draft: TrainingComposerDraftPayload = {
      ...createEmptyTrainingComposerDraft(),
      teamSeasonId: "ts-1",
      title: "Training A",
      validFrom: "2026-10-14",
      weekdaySchedules: [{ weekday: "WEDNESDAY", startsAt: "17:00", endsAt: "18:30" }],
    };
    expect(resolveTrainingCreateStepValid(draft, "wiederholung")).toBe(true);
    expect(resolveTrainingCreateStepValid(draft, "ressourcen")).toBe(true);
    expect(resolveTrainingCreateStepValid(draft, "pruefen")).toBe(true);
  });

  it("uses SwitchToggle for training recurrence (no new binary checkbox)", () => {
    const form = read("components/admin/training/TrainingCreateForm.tsx");
    expect(form).toContain("SwitchToggle");
    expect(form).not.toMatch(/type=\"checkbox\"/);
  });
});

describe("SCE-ACTIVITY-CREATE-01E-R6 — Match regression signals", () => {
  it("optional ressourcen/spielbetrieb valid without assignment", () => {
    const draft = createEmptyMatchComposerDraft();
    draft.teamId = "t1";
    draft.opponentExternalClubId = "c1";
    draft.startAt = "2026-10-14T18:00";
    expect(resolveMatchCreateStepValid(draft, "ressourcen")).toBe(true);
    expect(resolveMatchCreateStepValid(draft, "spielbetrieb")).toBe(true);
    expect(validateMatchCreateWorkflowStep(draft, "ressourcen").valid).toBe(true);
  });

  it("preserves CLUB_ONLY opponent selector", () => {
    expect(read("components/admin/matchcenter/MatchCreateMatchupSelector.tsx")).toContain(
      'mode="CLUB_ONLY"',
    );
  });
});

describe("SCE-ACTIVITY-CREATE-01E-R6 — Club Event + docs", () => {
  it("club event composer uses resolveStepValid", () => {
    expect(read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx")).toContain(
      "resolveStepValid",
    );
  });

  it("documents guided step state semantics", () => {
    expect(read("docs/design/SCE-ACTIVITY-CREATION.md")).toContain("GUIDED STEP STATE SEMANTICS");
    expect(read("docs/design/SCE-ACTIVITY-CREATION.md")).toContain("OPTIONAL ≠ COMPLETED");
  });
});

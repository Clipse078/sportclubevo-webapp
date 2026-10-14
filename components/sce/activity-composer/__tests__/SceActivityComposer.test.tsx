/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SceActivityComposer from "../SceActivityComposer";
import {
  createPreviewActivityCreateDefinition,
  type PreviewComposerTabId,
} from "@/lib/sce/activity-composer/build-preview-definition";
import { resolveSceActivityComposerSemanticIdentity } from "@/lib/sce/activity-composer/semantic-identity";
import { resolveFirstInvalidTab } from "@/lib/sce/activity-composer/validation-orchestration";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/sce-preview/activity-composer/page-mode"),
  useSearchParams: vi.fn(() => new URLSearchParams("tab=grunddaten")),
  useRouter: vi.fn(() => ({ push })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function previewDefinition() {
  return createPreviewActivityCreateDefinition("TRAINING", [
    {
      key: "grunddaten" as PreviewComposerTabId,
      label: "Grunddaten",
      render: ({ draft, setDraft }) => (
        <input
          aria-label="Titel"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      ),
    },
    {
      key: "details",
      label: "Details",
      render: () => <p>Details-Inhalt</p>,
    },
    {
      key: "ressourcen",
      label: "Ressourcen",
      render: () => <p>Ressourcen</p>,
    },
  ]);
}

describe("SceActivityComposer foundation (01B)", () => {
  it("A — definition contract exposes domain create label", () => {
    const def = previewDefinition();
    expect(def.createActionLabel).toBe("Training erstellen");
    expect(def.validateDraft).toBeTypeOf("function");
  });

  it("B — semantic identity mapping", () => {
    expect(resolveSceActivityComposerSemanticIdentity("MATCH").typeLabel).toBe("SPIEL");
    expect(resolveSceActivityComposerSemanticIdentity("CLUB_EVENT").colorToken).toBe(
      "club-event-violet",
    );
  });

  it("C/D — renders tabs and allows free navigation (page mode)", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "OK Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
        testId="composer-test"
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-tabs-grunddaten")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/sce-preview/activity-composer/page-mode?tab=details");
  });

  it("E — first invalid tab resolution helper", () => {
    const first = resolveFirstInvalidTab(
      ["grunddaten", "details", "ressourcen"] as PreviewComposerTabId[],
      { details: true },
    );
    expect(first).toBe("details");
  });

  it("F/G — persistent footer with domain label", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-footer")).toBeTruthy();
    expect(screen.getByTestId("sce-activity-composer-submit").textContent).toContain(
      "Training erstellen",
    );
  });

  it("H — submit loading busy state", async () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    expect(screen.getByTestId("sce-activity-composer-submit").getAttribute("aria-busy")).toBe(
      "true",
    );
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-submit").getAttribute("aria-busy")).toBe(
        "false",
      ),
    );
  });

  it("I — submit failure retains composer and shows error", async () => {
    const def = previewDefinition();
    def.submitDraft = async () => ({ ok: false, error: "Simulierter API-Fehler" });
    render(
      <SceActivityComposer
        definition={def}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-submit-error")).toBeTruthy(),
    );
    expect(screen.getByTestId("sce-activity-composer")).toBeTruthy();
  });

  it("J/K — dirty close asks for confirmation", () => {
    const onClose = vi.fn();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={onClose}
        draft={{
          title: "Geändert",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByText("Abbrechen"));
    expect(window.confirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("J — clean close proceeds", () => {
    const onClose = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={onClose}
        draft={{
          title: "",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByText("Abbrechen"));
    expect(onClose).toHaveBeenCalled();
  });

  it("O — overlay mode exposes dialog semantics", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("P — page mode has no dialog role", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("R — origin context accepted on page shell", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        originContext={{ kind: "PLANNING_SURFACE", teamId: "t1" }}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(document.querySelector('[data-origin="PLANNING_SURFACE"]')).toBeTruthy();
  });

  it("T — overlay keeps bounded workspace panel and internal scroll region", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    const panel = screen.getByTestId("sce-activity-composer");
    expect(panel.className).toContain("sce-activity-composer-panel--overlay");
    expect(panel.className).toContain("overflow-hidden");
    const bodyScroll = screen.getByTestId("sce-activity-composer-body");
    expect(bodyScroll.getAttribute("data-composer-scroll")).toBe("internal");
    expect(bodyScroll.className).toContain("overflow-y-auto");
    expect(bodyScroll.className).toContain("sce-scroll-region-dark");
    expect(bodyScroll.className).toContain("pb-8");
    const footer = screen.getByTestId("sce-activity-composer-footer");
    expect(footer.className).toContain("shrink-0");
    expect(panel.contains(footer)).toBe(true);
    expect(bodyScroll.contains(footer)).toBe(false);
  });

  it("U — page mode avoids overlay min-height and nested scroll container", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "abc",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    const panel = screen.getByTestId("sce-activity-composer");
    expect(panel.className).not.toContain("sce-activity-composer-panel--overlay");
    expect(panel.className).not.toContain("min-h-[min(100dvh");
    const bodyScroll = screen.getByTestId("sce-activity-composer-body");
    expect(bodyScroll.getAttribute("data-composer-scroll")).toBe("document");
    expect(bodyScroll.className).not.toContain("overflow-y-auto");
  });

  it("S — success callback on happy path", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={onClose}
        onSuccess={onSuccess}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].outcome).toBe("PUBLISHED");
    expect(onClose).toHaveBeenCalled();
  });

  it("R2 — footer exposes cancel, save draft, and primary hierarchy", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{
          title: "x",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-cancel")).toBeTruthy();
    expect(screen.getByTestId("sce-activity-composer-save-draft").textContent).toContain(
      "Als Entwurf speichern",
    );
    expect(screen.getByTestId("sce-activity-composer-submit").textContent).toContain(
      "Training erstellen",
    );
  });

  it("R2 — incomplete draft saves but commit fails and navigates to invalid tab", async () => {
    const onClose = vi.fn();
    const def = previewDefinition();
    render(
      <SceActivityComposer
        definition={def}
        containerMode="page"
        onClose={onClose}
        draft={{
          title: "ab",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(
      def.draftPersistence!.validateDraftForSave({
        title: "ab",
        notes: "",
        forceValidationError: false,
        forceDraftSaveError: false,
      }).valid,
    ).toBe(true);
    expect(
      def.validateDraft({
        title: "ab",
        notes: "",
        forceValidationError: false,
        forceDraftSaveError: false,
      }).valid,
    ).toBe(false);

    fireEvent.click(screen.getByTestId("sce-activity-composer-save-draft"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-persistence-status").textContent).toContain(
        "Gespeichert",
      ),
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((el) => el.textContent?.includes("markierten"))),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("sce-activity-composer-tabs-grunddaten").textContent).toContain("•");
  });

  it("R2 — resume draft uses Änderungen speichern label", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        resumeDraft={{
          draftId: "d1",
          baselineDraft: {
            title: "Entwurf",
            notes: "",
            forceValidationError: false,
            forceDraftSaveError: false,
          },
        }}
        draft={{
          title: "Entwurf",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-save-draft").textContent).toContain(
      "Änderungen speichern",
    );
    expect(screen.getByTestId("sce-activity-composer-persistence-status").textContent).toContain(
      "Gespeichert",
    );
  });

  it("R2 — saved clean draft closes without dirty confirm", () => {
    const onClose = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={onClose}
        resumeDraft={{
          draftId: "d1",
          baselineDraft: {
            title: "Entwurf",
            notes: "",
            forceValidationError: false,
            forceDraftSaveError: false,
          },
        }}
        draft={{
          title: "Entwurf",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-cancel"));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("R2 — draft save error retains values and keeps dirty guard", async () => {
    const onClose = vi.fn();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    const def = previewDefinition();
    def.draftPersistence!.saveDraft = async () => ({
      ok: false,
      error: "Entwurf konnte nicht gespeichert werden (Test).",
    });
    render(
      <SceActivityComposer
        definition={def}
        containerMode="page"
        onClose={onClose}
        draft={{
          title: "Geändert",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-save-draft"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-draft-save-error")).toBeTruthy(),
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-cancel"));
    expect(window.confirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Geändert")).toBeTruthy();
  });

  it("R3 — approval-required primary label and SUBMITTED_FOR_APPROVAL outcome", async () => {
    const onSuccess = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        onSuccess={onSuccess}
        effectiveGovernance={{
          activityType: "TRAINING",
          personId: "max",
          mayCreate: true,
          publicationAuthority: "APPROVAL_REQUIRED",
          approvalStrategy: "ANY_ONE",
          validatorPersonIds: ["fabio"],
        }}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-submit").textContent).toContain(
      "Zur Freigabe einreichen",
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].outcome).toBe("SUBMITTED_FOR_APPROVAL");
  });

  it("R3 — draft save never submits for approval", async () => {
    const onSuccess = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        onSuccess={onSuccess}
        effectiveGovernance={{
          activityType: "TRAINING",
          personId: "max",
          mayCreate: true,
          publicationAuthority: "APPROVAL_REQUIRED",
          approvalStrategy: "ANY_ONE",
          validatorPersonIds: ["fabio"],
        }}
        draft={{
          title: "ab",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-save-draft"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].outcome).toBe("DRAFT_SAVED");
  });

  it("R2 — draft save success keeps composer open and reports DRAFT_SAVED", async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={onClose}
        onSuccess={onSuccess}
        draft={{
          title: "ab",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-save-draft"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].outcome).toBe("DRAFT_SAVED");
    expect(onClose).not.toHaveBeenCalled();
  });
});

function guidedPreviewDefinition() {
  const def = previewDefinition();
  def.guidedWorkflow = {
    finalReviewTab: "ressourcen",
    validateStep: (draft, stepKey) => {
      if (stepKey !== "grunddaten") {
        return { valid: true, tabErrors: {} };
      }
      const titleMissing = draft.title.trim().length < 3;
      if (!titleMissing && !draft.forceValidationError) {
        return { valid: true, tabErrors: {} };
      }
      return {
        valid: false,
        tabErrors: { grunddaten: true },
        firstInvalidTab: "grunddaten",
      };
    },
  };
  return def;
}

describe("SceActivityComposer guided workflow (01E R1)", () => {
  it("shows progress label and hides primary submit until final step", () => {
    render(
      <SceActivityComposer
        definition={guidedPreviewDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
      "Schritt 1 von 3",
    );
    expect(screen.queryByTestId("sce-activity-composer-submit")).toBeNull();
    expect(screen.getByTestId("sce-activity-composer-next")).toBeTruthy();
  });

  it("shows primary submit on final review step only", async () => {
    render(
      <SceActivityComposer
        definition={guidedPreviewDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{
          title: "Gültiger Titel",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    await waitFor(() =>
      expect(screen.getByTestId("sce-activity-composer-submit")).toBeTruthy(),
    );
    expect(screen.queryByTestId("sce-activity-composer-next")).toBeNull();
  });

  it("Weiter validates current step before advancing", () => {
    render(
      <SceActivityComposer
        definition={guidedPreviewDefinition()}
        containerMode="overlay"
        open
        onClose={vi.fn()}
        draft={{
          title: "x",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-next"));
    expect(screen.getByTestId("sce-activity-composer-workflow-progress-label")).toHaveTextContent(
      "Schritt 1 von 3",
    );
  });
});

describe("SceActivityComposer without draft persistence", () => {
  function definitionWithoutDraft() {
    const def = previewDefinition();
    delete def.draftPersistence;
    return def;
  }

  it("hides save draft when capability omitted", () => {
    render(
      <SceActivityComposer
        definition={definitionWithoutDraft()}
        containerMode="page"
        onClose={vi.fn()}
        isDirty
        draft={{
          title: "x",
          notes: "",
          forceValidationError: false,
          forceDraftSaveError: false,
        }}
      />,
    );
    expect(screen.queryByTestId("sce-activity-composer-save-draft")).toBeNull();
  });
});

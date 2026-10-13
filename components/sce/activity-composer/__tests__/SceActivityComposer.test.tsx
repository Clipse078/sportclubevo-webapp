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
    {
      key: "validierung",
      label: "Validierung",
      render: () => <p>Validierung</p>,
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
        draft={{ title: "OK Titel", notes: "", forceValidationError: false }}
        testId="composer-test"
      />,
    );
    expect(screen.getByTestId("sce-activity-composer-tabs-grunddaten")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/sce-preview/activity-composer/page-mode?tab=details");
  });

  it("E — first invalid tab resolution helper", () => {
    const first = resolveFirstInvalidTab(
      ["grunddaten", "details", "validierung"] as PreviewComposerTabId[],
      { validierung: true },
    );
    expect(first).toBe("validierung");
  });

  it("F/G — persistent footer with domain label", () => {
    render(
      <SceActivityComposer
        definition={previewDefinition()}
        containerMode="page"
        onClose={vi.fn()}
        draft={{ title: "abc", notes: "", forceValidationError: false }}
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
        draft={{ title: "Gültiger Titel", notes: "", forceValidationError: false }}
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
        isDirty
        draft={{ title: "x", notes: "", forceValidationError: false }}
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
        isDirty={false}
        draft={{ title: "x", notes: "", forceValidationError: false }}
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
        draft={{ title: "abc", notes: "", forceValidationError: false }}
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
        draft={{ title: "abc", notes: "", forceValidationError: false }}
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
        draft={{ title: "abc", notes: "", forceValidationError: false }}
      />,
    );
    expect(document.querySelector('[data-origin="PLANNING_SURFACE"]')).toBeTruthy();
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
        draft={{ title: "Gültiger Titel", notes: "", forceValidationError: false }}
      />,
    );
    fireEvent.click(screen.getByTestId("sce-activity-composer-submit"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});

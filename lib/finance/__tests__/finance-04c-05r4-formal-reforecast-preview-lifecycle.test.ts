import { describe, expect, it } from "vitest";
import {
  INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
  buildFormalReforecastPreviewInputKey,
  isFormalReforecastSubmitEnabled,
  reduceFormalReforecastPreviewDialog,
} from "@/lib/finance/forecast/formal-reforecast-preview-lifecycle";
import type { FormalReforecastPreviewResult } from "@/lib/finance/forecast/formal-reforecast-contract";

const samplePreview = {
  financeYearId: "fy1",
  forecastId: "fc1",
  currentForecastVersionId: "ver-current",
  currentVersionNumber: 2,
  nextVersionNumber: 3,
  lineCount: 5,
  incomeMinor: 28632700,
  expenseMinor: 10116100,
  resultMinor: 18516600,
  asOfDate: "2026-10-24",
  actualsThroughDate: "2026-10-24",
  revisionLabel: "Q3 Review",
  recommendedAsOfDate: "2026-10-24",
  amountsUnchangedByFormalization: true,
  previousFormalRevision: null,
} satisfies FormalReforecastPreviewResult;

describe("FIN-04C-05R4 formal reforecast preview lifecycle", () => {
  it("builds stable input keys for optional label whitespace", () => {
    expect(buildFormalReforecastPreviewInputKey("2026-10-24", "")).toBe(
      "2026-10-24::2026-10-24::",
    );
    expect(buildFormalReforecastPreviewInputKey("2026-10-24", "  Q3 Review  ")).toBe(
      "2026-10-24::2026-10-24::Q3 Review",
    );
  });

  it("enables submit only in preview_ready with matching loaded input key", () => {
    const key = buildFormalReforecastPreviewInputKey("2026-10-24", "Q3 Review");
    expect(
      isFormalReforecastSubmitEnabled({
        phase: "preview_ready",
        preview: samplePreview,
        previewError: null,
        loadedInputKey: key,
        currentInputKey: key,
      }),
    ).toBe(true);
    expect(
      isFormalReforecastSubmitEnabled({
        phase: "loading_preview",
        preview: samplePreview,
        previewError: null,
        loadedInputKey: key,
        currentInputKey: key,
      }),
    ).toBe(false);
    expect(
      isFormalReforecastSubmitEnabled({
        phase: "preview_ready",
        preview: samplePreview,
        previewError: null,
        loadedInputKey: key,
        currentInputKey: buildFormalReforecastPreviewInputKey("2026-10-24", "Other"),
      }),
    ).toBe(false);
  });

  it("clears preview on preview_requested and resolves on success", () => {
    const key = buildFormalReforecastPreviewInputKey("2026-10-24", "");
    let state = reduceFormalReforecastPreviewDialog(
      INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
      { type: "preview_requested", inputKey: key },
    );
    expect(state.phase).toBe("loading_preview");
    expect(state.preview).toBeNull();

    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_succeeded",
      inputKey: key,
      preview: samplePreview,
    });
    expect(state.phase).toBe("preview_ready");
    expect(state.preview?.nextVersionNumber).toBe(3);
  });

  it("ignores stale preview_succeeded for superseded pending key", () => {
    const keyA = buildFormalReforecastPreviewInputKey("2026-10-24", "A");
    const keyB = buildFormalReforecastPreviewInputKey("2026-10-24", "B");
    let state = reduceFormalReforecastPreviewDialog(
      INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
      { type: "preview_requested", inputKey: keyA },
    );
    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_requested",
      inputKey: keyB,
    });
    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_succeeded",
      inputKey: keyA,
      preview: samplePreview,
    });
    expect(state.phase).toBe("loading_preview");
    expect(state.preview).toBeNull();

    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_succeeded",
      inputKey: keyB,
      preview: { ...samplePreview, revisionLabel: "B" },
    });
    expect(state.phase).toBe("preview_ready");
    expect(state.preview?.revisionLabel).toBe("B");
  });

  it("enters preview_error and disables submit", () => {
    const key = buildFormalReforecastPreviewInputKey("2026-10-24", "");
    let state = reduceFormalReforecastPreviewDialog(
      INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
      { type: "preview_requested", inputKey: key },
    );
    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_failed",
      inputKey: key,
      error: "Die Vorschau konnte nicht geladen werden.",
    });
    expect(state.phase).toBe("preview_error");
    expect(
      isFormalReforecastSubmitEnabled({
        phase: state.phase,
        preview: state.preview,
        previewError: state.previewError,
        loadedInputKey: state.loadedInputKey,
        currentInputKey: key,
      }),
    ).toBe(false);
  });

  it("blocks submit while submitting", () => {
    const key = buildFormalReforecastPreviewInputKey("2026-10-24", "");
    let state = reduceFormalReforecastPreviewDialog(
      INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE,
      { type: "preview_requested", inputKey: key },
    );
    state = reduceFormalReforecastPreviewDialog(state, {
      type: "preview_succeeded",
      inputKey: key,
      preview: samplePreview,
    });
    state = reduceFormalReforecastPreviewDialog(state, { type: "submit_started" });
    expect(state.phase).toBe("submitting");
    expect(
      isFormalReforecastSubmitEnabled({
        phase: state.phase,
        preview: state.preview,
        previewError: state.previewError,
        loadedInputKey: state.loadedInputKey,
        currentInputKey: key,
      }),
    ).toBe(false);
  });
});

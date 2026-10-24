import type { FormalReforecastPreviewResult } from "@/lib/finance/forecast/formal-reforecast-contract";

/** Explicit formalization dialog lifecycle (FIN-04C-05R4). */
export type FormalReforecastPreviewPhase =
  | "idle"
  | "loading_preview"
  | "preview_ready"
  | "preview_error"
  | "submitting";

export type FormalReforecastPreviewDialogState = {
  phase: FormalReforecastPreviewPhase;
  preview: FormalReforecastPreviewResult | null;
  previewError: string | null;
  /** Input key the in-flight preview request was started for. */
  pendingInputKey: string | null;
  /** Input key of the last successful preview (must match current inputs to submit). */
  loadedInputKey: string | null;
};

export const INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE: FormalReforecastPreviewDialogState =
  {
    phase: "idle",
    preview: null,
    previewError: null,
    pendingInputKey: null,
    loadedInputKey: null,
  };

/** Stable key for preview request identity (date + optional normalized label). */
export function buildFormalReforecastPreviewInputKey(
  asOfDate: string,
  revisionLabel: string,
  actualsThroughDate?: string,
): string {
  const trimmed = revisionLabel.trim();
  const cutoff = (actualsThroughDate ?? asOfDate).trim();
  return `${asOfDate}::${cutoff}::${trimmed.length > 0 ? trimmed : ""}`;
}

export function isFormalReforecastPreviewLoading(
  phase: FormalReforecastPreviewPhase,
): boolean {
  return phase === "loading_preview";
}

export function isFormalReforecastSubmitEnabled(state: {
  phase: FormalReforecastPreviewPhase;
  preview: FormalReforecastPreviewResult | null;
  previewError: string | null;
  loadedInputKey: string | null;
  currentInputKey: string;
}): boolean {
  return (
    state.phase === "preview_ready" &&
    state.preview !== null &&
    state.previewError === null &&
    state.loadedInputKey !== null &&
    state.loadedInputKey === state.currentInputKey
  );
}

export type FormalReforecastPreviewDialogAction =
  | { type: "dialog_open_reset" }
  | { type: "dialog_close_reset" }
  | { type: "preview_requested"; inputKey: string }
  | { type: "preview_succeeded"; inputKey: string; preview: FormalReforecastPreviewResult }
  | { type: "preview_failed"; inputKey: string; error: string }
  | { type: "submit_started" }
  | { type: "submit_finished" };

export function reduceFormalReforecastPreviewDialog(
  state: FormalReforecastPreviewDialogState,
  action: FormalReforecastPreviewDialogAction,
): FormalReforecastPreviewDialogState {
  switch (action.type) {
    case "dialog_open_reset":
    case "dialog_close_reset":
      return { ...INITIAL_FORMAL_REFORECAST_PREVIEW_DIALOG_STATE };
    case "preview_requested":
      return {
        ...state,
        phase: "loading_preview",
        previewError: null,
        preview: null,
        pendingInputKey: action.inputKey,
        loadedInputKey: null,
      };
    case "preview_succeeded":
      if (action.inputKey !== state.pendingInputKey) {
        return state;
      }
      return {
        ...state,
        phase: "preview_ready",
        preview: action.preview,
        previewError: null,
        loadedInputKey: action.inputKey,
        pendingInputKey: action.inputKey,
      };
    case "preview_failed":
      if (action.inputKey !== state.pendingInputKey) {
        return state;
      }
      return {
        ...state,
        phase: "preview_error",
        preview: null,
        previewError: action.error,
        loadedInputKey: null,
      };
    case "submit_started":
      return {
        ...state,
        phase: "submitting",
      };
    case "submit_finished":
      return {
        ...state,
        phase:
          state.preview !== null && state.loadedInputKey !== null
            ? "preview_ready"
            : "preview_error",
      };
    default:
      return state;
  }
}

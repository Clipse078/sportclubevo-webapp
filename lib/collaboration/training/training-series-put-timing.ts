/**
 * Optional stage timings for PUT /api/training-series/[seriesId] (diagnostics).
 */

export type TrainingSeriesPutTiming = {
  authMs: number;
  loadSeriesMs: number;
  preSnapshotMs: number;
  seriesMutationMs: number;
  sessionGenerationMs: number;
  postReloadMs: number;
  impactBuildMs: number;
  totalMs: number;
  comm03PreviewCalls: number;
};

const timings = new Map<string, TrainingSeriesPutTiming>();

export function isTrainingSeriesPutTimingEnabled(): boolean {
  return process.env.TRAINING_SERIES_PUT_TIMING === "1";
}

export function startTrainingSeriesPutTiming(requestId: string): void {
  if (!isTrainingSeriesPutTimingEnabled()) return;
  timings.set(requestId, {
    authMs: 0,
    loadSeriesMs: 0,
    preSnapshotMs: 0,
    seriesMutationMs: 0,
    sessionGenerationMs: 0,
    postReloadMs: 0,
    impactBuildMs: 0,
    totalMs: 0,
    comm03PreviewCalls: 0,
  });
}

export function recordTrainingSeriesPutTimingSlice(
  requestId: string,
  slice: Partial<Omit<TrainingSeriesPutTiming, "totalMs" | "comm03PreviewCalls">>,
): void {
  if (!isTrainingSeriesPutTimingEnabled()) return;
  const row = timings.get(requestId);
  if (!row) return;
  Object.assign(row, slice);
}

export function finishTrainingSeriesPutTiming(
  requestId: string,
  input: { totalMs: number; comm03PreviewCalls: number },
): TrainingSeriesPutTiming | null {
  if (!isTrainingSeriesPutTimingEnabled()) return null;
  const row = timings.get(requestId);
  if (!row) return null;
  row.totalMs = input.totalMs;
  row.comm03PreviewCalls = input.comm03PreviewCalls;
  return { ...row };
}

export function peekTrainingSeriesPutTiming(requestId: string): TrainingSeriesPutTiming | null {
  const row = timings.get(requestId);
  return row ? { ...row } : null;
}

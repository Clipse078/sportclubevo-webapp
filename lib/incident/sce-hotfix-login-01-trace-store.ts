/**
 * Request-scoped trace store (AsyncLocalStorage) for SCE-HOTFIX-LOGIN-01.
 * Avoids module-level bleed across concurrent serverless invocations / requests.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export type SceHotfixLogin01WallClockSpan = {
  step: string;
  startOffsetMs: number;
  endOffsetMs: number;
  durationMs: number;
  metrics?: Record<string, number | string | boolean>;
};

export type SceHotfixLogin01DbQueryRecord = {
  model: string;
  operation: string;
  durationMs: number;
  caller: string;
  rowCount?: number;
  signature: string;
};

export type SceHotfixLogin01TraceStore = {
  correlationId: string;
  originMs: number;
  stepStartedAtMs: Map<string, number>;
  stepDurationMs: Map<string, number>;
  wallClockSpans: SceHotfixLogin01WallClockSpan[];
  duplicateProbeCounts: Map<string, number>;
  milestones: { id: string; elapsedMs: number }[];
  dbClientReadyMs?: number;
  firstPrismaCallWaitMs?: number;
  dbQueries: SceHotfixLogin01DbQueryRecord[];
  requestMetaLogged: boolean;
};

export const sceHotfixLogin01TraceStorage = new AsyncLocalStorage<SceHotfixLogin01TraceStore>();

export function createSceHotfixLogin01TraceStore(correlationId: string): SceHotfixLogin01TraceStore {
  return {
    correlationId,
    originMs: Date.now(),
    stepStartedAtMs: new Map(),
    stepDurationMs: new Map(),
    duplicateProbeCounts: new Map(),
    milestones: [],
    wallClockSpans: [],
    dbQueries: [],
    requestMetaLogged: false,
  };
}

export function getSceHotfixLogin01TraceStore(): SceHotfixLogin01TraceStore | null {
  return sceHotfixLogin01TraceStorage.getStore() ?? null;
}

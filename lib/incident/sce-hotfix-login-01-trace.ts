/**
 * SCE-HOTFIX-LOGIN-01 — temporary dashboard SSR timing instrumentation (no PII).
 * R7: milestones, duplicate probes, duration ledger, critical-path summary.
 */

import { headers } from "next/headers";
import { randomUUID } from "node:crypto";

const PREFIX = "[SCE-HOTFIX-LOGIN-01]";
const TRACE_ENABLED =
  process.env.SCE_HOTFIX_LOGIN_01_TRACE !== "0" &&
  (process.env.SCE_HOTFIX_LOGIN_01_TRACE === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development");

type TraceStep = { name: string; atMs: number };

let correlationId: string | null = null;
const steps: TraceStep[] = [];
let originMs: number | null = null;

const stepStartedAtMs = new Map<string, number>();
const stepDurationMs = new Map<string, number>();
const duplicateProbeCounts = new Map<string, number>();
const milestones: { id: string; elapsedMs: number }[] = [];

export function sceHotfixLogin01TraceEnabled(): boolean {
  return TRACE_ENABLED;
}

export async function initSceHotfixLogin01DashboardTrace(): Promise<string> {
  if (!TRACE_ENABLED) return "disabled";
  if (correlationId) return correlationId;

  const headerStore = await headers();
  correlationId =
    headerStore.get("x-vercel-id") ??
    headerStore.get("x-request-id") ??
    randomUUID().slice(0, 12);
  originMs = Date.now();
  logSceHotfixLogin01Step("dashboard");
  logSceHotfixLogin01Milestone("T0_REQUEST");
  return correlationId;
}

/** Count repeated resolver entry points within one request (no cross-request cache). */
export function recordSceHotfixLogin01DuplicateProbe(probe: string): void {
  if (!TRACE_ENABLED) return;
  duplicateProbeCounts.set(probe, (duplicateProbeCounts.get(probe) ?? 0) + 1);
}

export function logSceHotfixLogin01Milestone(milestone: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const elapsedMs = Date.now() - originMs;
  milestones.push({ id: milestone, elapsedMs });
  console.info(
    `${PREFIX} cid=${correlationId ?? "?"} milestone=${milestone} elapsedMs=${elapsedMs}`,
  );
}

export function logSceHotfixLogin01Step(step: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const atMs = Date.now() - originMs;
  steps.push({ name: step, atMs });
  stepStartedAtMs.set(step, Date.now());
  console.info(`${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${atMs} phase=start`);
}

export function logSceHotfixLogin01StepDone(step: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const startedAt = stepStartedAtMs.get(step);
  if (startedAt != null) {
    stepDurationMs.set(step, Date.now() - startedAt);
    stepStartedAtMs.delete(step);
  }
  const elapsedMs = Date.now() - originMs;
  steps.push({ name: `${step}:done`, atMs: elapsedMs });
  console.info(`${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${elapsedMs} phase=done`);
}

/** Per-step wall duration (step start → done), plus optional non-PII metrics. */
export function logSceHotfixLogin01StepFinished(
  step: string,
  metrics?: Record<string, number | string | boolean>,
): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const startedAt = stepStartedAtMs.get(step);
  const durationMs = startedAt != null ? Date.now() - startedAt : 0;
  if (startedAt != null) {
    stepDurationMs.set(step, durationMs);
    stepStartedAtMs.delete(step);
  }
  const elapsedMs = Date.now() - originMs;
  steps.push({ name: `${step}:done`, atMs: elapsedMs });
  const metricParts =
    metrics == null
      ? ""
      : ` ${Object.entries(metrics)
          .map(([key, value]) => `${key}=${value}`)
          .join(" ")}`;
  console.info(
    `${PREFIX} cid=${correlationId ?? "?"} step=${step}:done durationMs=${durationMs} elapsedMs=${elapsedMs}${metricParts}`,
  );
}

export function markSceHotfixLogin01StepStart(step: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  stepStartedAtMs.set(step, Date.now());
  logSceHotfixLogin01Step(step);
}

export function logSceHotfixLogin01StepFailed(step: string, error: unknown): void {
  if (!TRACE_ENABLED || originMs == null) return;
  stepStartedAtMs.delete(step);
  const elapsedMs = Date.now() - originMs;
  const message = error instanceof Error ? error.message : "unknown";
  console.error(
    `${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${elapsedMs} phase=failure message=${message}`,
  );
}

export function getSceHotfixLogin01StepDurationMs(step: string): number | undefined {
  return stepDurationMs.get(step);
}

function readDuration(...candidates: string[]): number {
  for (const step of candidates) {
    const value = stepDurationMs.get(step);
    if (value != null && value > 0) return value;
  }
  return 0;
}

function maxDuration(...candidates: string[]): number {
  let max = 0;
  for (const step of candidates) {
    const value = stepDurationMs.get(step);
    if (value != null && value > max) max = value;
  }
  return max;
}

function sumDuration(...candidates: string[]): number {
  let sum = 0;
  for (const step of candidates) {
    const value = stepDurationMs.get(step);
    if (value != null) sum += value;
  }
  return sum;
}

/** Emit hierarchical wall-clock ledger (critical path uses max of parallel legs). */
function emitCriticalPathLedger(requestTotalMs: number): void {
  const authSessionMs = readDuration("layout-auth", "auth");
  const tenantMs = readDuration("layout-tenant", "tenant");
  const actorSecurityMs = readDuration("actor-context");
  const shellMs = sumDuration("person-first-name", "hero-state");
  const programmeMs = readDuration("programme");
  const calendarMs = readDuration("programme-merge");
  const personalActionsMs = readDuration("personal-actions");
  const operationalAttentionMs = readDuration("operational-attention");
  const quickAccessMs = readDuration("quick-access");
  const secondaryMs = readDuration("secondary-snapshot");
  const commandCenterPrepMs = readDuration("command-center-prep");
  const commandCenterDataMs = readDuration("command-center-data");

  const personalWorkMs = maxDuration("personal-actions", "operational-attention");
  const commandCenterInnerParallelMs = maxDuration("programme", "personal-work", "secondary-snapshot");
  const commandCenterOuterMs = maxDuration("command-center-data", "quick-access");

  const parallelWorkSumMs =
    programmeMs +
    personalActionsMs +
    operationalAttentionMs +
    secondaryMs +
    quickAccessMs;

  const layoutParticipationNavMs = readDuration("layout-participation-nav");
  const pageAuthMs = readDuration("auth");

  const criticalPathMs =
    authSessionMs +
    tenantMs +
    layoutParticipationNavMs +
    pageAuthMs +
    actorSecurityMs +
    shellMs +
    commandCenterPrepMs +
    commandCenterOuterMs +
    readDuration("command-center-i18n");

  const accountedMs =
    authSessionMs +
    tenantMs +
    layoutParticipationNavMs +
    pageAuthMs +
    actorSecurityMs +
    shellMs +
    commandCenterPrepMs +
    commandCenterOuterMs +
    readDuration("command-center-i18n");
  const unexplainedMs = Math.max(0, requestTotalMs - accountedMs);
  const reconciliationPercent =
    requestTotalMs > 0
      ? Math.min(100, Math.round((accountedMs / requestTotalMs) * 100))
      : 100;

  const duplicateSummary = [...duplicateProbeCounts.entries()]
    .map(([probe, count]) => `${probe}=${count}`)
    .join(" ");

  console.info(
    `${PREFIX} cid=${correlationId ?? "?"} ledger=wall-clock requestTotalMs=${requestTotalMs} criticalPathMs=${criticalPathMs} parallelWorkSumMs=${parallelWorkSumMs} reconciliationPercent=${reconciliationPercent} unexplainedMs=${unexplainedMs}`,
  );
  console.info(
    `${PREFIX} cid=${correlationId ?? "?"} ledger=breakdown authSessionMs=${authSessionMs} tenantMs=${tenantMs} layoutParticipationNavMs=${layoutParticipationNavMs} pageAuthMs=${pageAuthMs} actorSecurityMs=${actorSecurityMs} shellMs=${shellMs} programmeMs=${programmeMs} calendarMergeMs=${calendarMs} personalActionsMs=${personalActionsMs} operationalAttentionMs=${operationalAttentionMs} personalWorkMaxMs=${personalWorkMs} secondaryMs=${secondaryMs} quickAccessMs=${quickAccessMs} commandCenterDataMs=${commandCenterDataMs} commandCenterInnerParallelMaxMs=${commandCenterInnerParallelMs} commandCenterOuterMaxMs=${commandCenterOuterMs}`,
  );
  if (duplicateSummary) {
    console.info(`${PREFIX} cid=${correlationId ?? "?"} ledger=duplicateProbes ${duplicateSummary}`);
  }
  if (milestones.length > 0) {
    console.info(
      `${PREFIX} cid=${correlationId ?? "?"} ledger=milestones ${milestones
        .map((m) => `${m.id}@${m.elapsedMs}`)
        .join(" ")}`,
    );
  }
}

export function finishSceHotfixLogin01DashboardTrace(): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const requestTotalMs = Date.now() - originMs;
  logSceHotfixLogin01Milestone("T11_STREAM_COMPLETE");
  logSceHotfixLogin01StepDone("dashboard");
  emitCriticalPathLedger(requestTotalMs);
}

/** Trace start → await fn() → trace done|failure (no-op when tracing disabled). */
export async function runWithSceHotfixLogin01Trace<T>(
  step: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!TRACE_ENABLED || originMs == null) {
    return operation();
  }
  logSceHotfixLogin01Step(step);
  try {
    const result = await operation();
    logSceHotfixLogin01StepDone(step);
    return result;
  } catch (error) {
    logSceHotfixLogin01StepFailed(step, error);
    throw error;
  }
}

/** @internal test helpers */
export function resetSceHotfixLogin01TraceForTests(): void {
  correlationId = null;
  originMs = null;
  steps.length = 0;
  stepStartedAtMs.clear();
  stepDurationMs.clear();
  duplicateProbeCounts.clear();
  milestones.length = 0;
}

export function getSceHotfixLogin01TraceStateForTests(): {
  duplicateProbeCounts: Record<string, number>;
  milestones: string[];
} {
  return {
    duplicateProbeCounts: Object.fromEntries(duplicateProbeCounts),
    milestones: milestones.map((m) => m.id),
  };
}

/**
 * SCE-HOTFIX-LOGIN-01 — temporary dashboard SSR timing instrumentation (no PII).
 * R7: milestones, duplicate probes, duration ledger, critical-path summary.
 * R8: AsyncLocalStorage request scope, request-class metadata, DB wait ledger.
 */

import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import {
  createSceHotfixLogin01TraceStore,
  getSceHotfixLogin01TraceStore,
  sceHotfixLogin01TraceStorage,
  type SceHotfixLogin01TraceStore,
} from "@/lib/incident/sce-hotfix-login-01-trace-store";

const PREFIX = "[SCE-HOTFIX-LOGIN-01]";
const TRACE_ENABLED =
  process.env.SCE_HOTFIX_LOGIN_01_TRACE !== "0" &&
  (process.env.SCE_HOTFIX_LOGIN_01_TRACE === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development");

export function sceHotfixLogin01TraceEnabled(): boolean {
  return TRACE_ENABLED;
}

function requireStore(): SceHotfixLogin01TraceStore | null {
  if (!TRACE_ENABLED) return null;
  return getSceHotfixLogin01TraceStore();
}

function classifyRequest(headersList: Headers): string {
  const rsc = headersList.get("rsc") ?? headersList.get("RSC");
  const routerState = headersList.get("next-router-state-tree");
  const routerPrefetch = headersList.get("next-router-prefetch");
  const purpose = headersList.get("purpose");
  const secFetchDest = headersList.get("sec-fetch-dest");
  const secFetchMode = headersList.get("sec-fetch-mode");
  const accept = headersList.get("accept") ?? "";

  if (routerPrefetch === "1" || purpose === "prefetch") {
    return "router-prefetch";
  }
  if (rsc === "1" || accept.includes("text/x-component")) {
    return "rsc-flight";
  }
  if (routerState) {
    return "rsc-navigation";
  }
  if (secFetchDest === "document" && secFetchMode === "navigate") {
    return "document-navigation";
  }
  if (secFetchDest === "empty" && secFetchMode === "cors") {
    return "fetch";
  }
  return "unknown";
}

async function emitRequestMeta(store: SceHotfixLogin01TraceStore): Promise<void> {
  if (store.requestMetaLogged) return;
  store.requestMetaLogged = true;

  const headerStore = await headers();
  const requestClass = classifyRequest(headerStore);
  const vercelRegion = process.env.VERCEL_REGION ?? "unknown";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? "unknown";
  const secFetchDest = headerStore.get("sec-fetch-dest") ?? "-";
  const secFetchMode = headerStore.get("sec-fetch-mode") ?? "-";
  const accept = headerStore.get("accept")?.split(",")[0] ?? "-";

  console.info(
    `${PREFIX} cid=${store.correlationId} meta=request requestClass=${requestClass} vercelRegion=${vercelRegion} deploymentId=${deploymentId} secFetchDest=${secFetchDest} secFetchMode=${secFetchMode} accept=${accept}`,
  );
}

export async function initSceHotfixLogin01DashboardTrace(): Promise<string> {
  if (!TRACE_ENABLED) return "disabled";

  const existing = getSceHotfixLogin01TraceStore();
  if (existing) {
    await emitRequestMeta(existing);
    return existing.correlationId;
  }

  const headerStore = await headers();
  const correlationId =
    headerStore.get("x-vercel-id") ??
    headerStore.get("x-request-id") ??
    randomUUID().slice(0, 12);

  const store = createSceHotfixLogin01TraceStore(correlationId);
  sceHotfixLogin01TraceStorage.enterWith(store);

  logSceHotfixLogin01Step("dashboard");
  logSceHotfixLogin01Milestone("T0_REQUEST");
  await emitRequestMeta(store);
  return correlationId;
}

/** Count repeated resolver entry points within one request (no cross-request cache). */
export function recordSceHotfixLogin01DuplicateProbe(probe: string): void {
  const store = requireStore();
  if (!store) return;
  store.duplicateProbeCounts.set(probe, (store.duplicateProbeCounts.get(probe) ?? 0) + 1);
}

export function logSceHotfixLogin01Milestone(milestone: string): void {
  const store = requireStore();
  if (!store) return;
  const elapsedMs = Date.now() - store.originMs;
  store.milestones.push({ id: milestone, elapsedMs });
  console.info(
    `${PREFIX} cid=${store.correlationId} milestone=${milestone} elapsedMs=${elapsedMs}`,
  );
}

export function logSceHotfixLogin01Step(step: string): void {
  const store = requireStore();
  if (!store) return;
  const atMs = Date.now() - store.originMs;
  store.stepStartedAtMs.set(step, Date.now());
  console.info(`${PREFIX} cid=${store.correlationId} step=${step} elapsedMs=${atMs} phase=start`);
}

export function logSceHotfixLogin01StepDone(step: string): void {
  const store = requireStore();
  if (!store) return;
  const startedAt = store.stepStartedAtMs.get(step);
  if (startedAt != null) {
    store.stepDurationMs.set(step, Date.now() - startedAt);
    store.stepStartedAtMs.delete(step);
  }
  const elapsedMs = Date.now() - store.originMs;
  console.info(`${PREFIX} cid=${store.correlationId} step=${step} elapsedMs=${elapsedMs} phase=done`);
}

/** Per-step wall duration (step start → done), plus optional non-PII metrics. */
export function logSceHotfixLogin01StepFinished(
  step: string,
  metrics?: Record<string, number | string | boolean>,
): void {
  const store = requireStore();
  if (!store) return;
  const startedAt = store.stepStartedAtMs.get(step);
  const durationMs = startedAt != null ? Date.now() - startedAt : 0;
  if (startedAt != null) {
    store.stepDurationMs.set(step, durationMs);
    store.stepStartedAtMs.delete(step);
  }
  const elapsedMs = Date.now() - store.originMs;
  const metricParts =
    metrics == null
      ? ""
      : ` ${Object.entries(metrics)
          .map(([key, value]) => `${key}=${value}`)
          .join(" ")}`;
  console.info(
    `${PREFIX} cid=${store.correlationId} step=${step}:done durationMs=${durationMs} elapsedMs=${elapsedMs}${metricParts}`,
  );
}

export function markSceHotfixLogin01StepStart(step: string): void {
  const store = requireStore();
  if (!store) return;
  store.stepStartedAtMs.set(step, Date.now());
  logSceHotfixLogin01Step(step);
}

export function logSceHotfixLogin01StepFailed(step: string, error: unknown): void {
  const store = requireStore();
  if (!store) return;
  store.stepStartedAtMs.delete(step);
  const elapsedMs = Date.now() - store.originMs;
  const message = error instanceof Error ? error.message : "unknown";
  console.error(
    `${PREFIX} cid=${store.correlationId} step=${step} elapsedMs=${elapsedMs} phase=failure message=${message}`,
  );
}

export function getSceHotfixLogin01StepDurationMs(step: string): number | undefined {
  const store = getSceHotfixLogin01TraceStore();
  return store?.stepDurationMs.get(step);
}

export function recordSceHotfixLogin01DbClientReadyMs(ms: number): void {
  const store = requireStore();
  if (!store || store.dbClientReadyMs != null) return;
  store.dbClientReadyMs = ms;
  console.info(
    `${PREFIX} cid=${store.correlationId} db=client-ready durationMs=${ms}`,
  );
}

export function recordSceHotfixLogin01FirstPrismaWaitMs(ms: number): void {
  const store = requireStore();
  if (!store || store.firstPrismaCallWaitMs != null) return;
  store.firstPrismaCallWaitMs = ms;
  console.info(
    `${PREFIX} cid=${store.correlationId} db=first-prisma-call-wait durationMs=${ms}`,
  );
}

function readDuration(store: SceHotfixLogin01TraceStore, ...candidates: string[]): number {
  for (const step of candidates) {
    const value = store.stepDurationMs.get(step);
    if (value != null && value > 0) return value;
  }
  return 0;
}

function maxDuration(store: SceHotfixLogin01TraceStore, ...candidates: string[]): number {
  let max = 0;
  for (const step of candidates) {
    const value = store.stepDurationMs.get(step);
    if (value != null && value > max) max = value;
  }
  return max;
}

function sumDuration(store: SceHotfixLogin01TraceStore, ...candidates: string[]): number {
  let sum = 0;
  for (const step of candidates) {
    const value = store.stepDurationMs.get(step);
    if (value != null) sum += value;
  }
  return sum;
}

/** Emit hierarchical wall-clock ledger (critical path uses max of parallel legs). */
function emitCriticalPathLedger(store: SceHotfixLogin01TraceStore, requestTotalMs: number): void {
  const authSessionMs = readDuration(store, "layout-auth", "auth");
  const tenantMs = readDuration(store, "layout-tenant", "tenant");
  const actorSecurityMs = readDuration(store, "actor-context");
  const dashboardContextMs = readDuration(store, "dashboard-context");
  const shellMs = sumDuration(store, "person-first-name", "hero-state");
  const programmeMs = readDuration(store, "programme");
  const calendarMs = readDuration(store, "programme-merge");
  const personalActionsMs = readDuration(store, "personal-actions");
  const operationalAttentionMs = readDuration(store, "operational-attention");
  const quickAccessMs = readDuration(store, "quick-access");
  const secondaryMs = readDuration(store, "secondary-snapshot");
  const commandCenterPrepMs = readDuration(store, "command-center-prep");
  const commandCenterDataMs = readDuration(store, "command-center-data");

  const personalWorkMs = maxDuration(store, "personal-actions", "operational-attention");
  const commandCenterInnerParallelMs = maxDuration(
    store,
    "programme",
    "personal-work",
    "secondary-snapshot",
  );
  const commandCenterOuterMs = maxDuration(store, "command-center-data", "quick-access");

  const parallelWorkSumMs =
    programmeMs +
    personalActionsMs +
    operationalAttentionMs +
    secondaryMs +
    quickAccessMs;

  const layoutParticipationNavMs = readDuration(store, "layout-participation-nav");
  const pageAuthMs = readDuration(store, "auth");

  const criticalPathMs =
    authSessionMs +
    tenantMs +
    layoutParticipationNavMs +
    pageAuthMs +
    actorSecurityMs +
    shellMs +
    commandCenterPrepMs +
    commandCenterOuterMs +
    readDuration(store, "command-center-i18n");

  const accountedMs = criticalPathMs;
  const unexplainedMs = Math.max(0, requestTotalMs - accountedMs);
  const reconciliationPercent =
    requestTotalMs > 0
      ? Math.min(100, Math.round((accountedMs / requestTotalMs) * 100))
      : 100;

  const duplicateSummary = [...store.duplicateProbeCounts.entries()]
    .map(([probe, count]) => `${probe}=${count}`)
    .join(" ");

  const dbClientReadyMs = store.dbClientReadyMs ?? 0;
  const firstPrismaWaitMs = store.firstPrismaCallWaitMs ?? 0;

  console.info(
    `${PREFIX} cid=${store.correlationId} ledger=wall-clock requestTotalMs=${requestTotalMs} criticalPathMs=${criticalPathMs} parallelWorkSumMs=${parallelWorkSumMs} reconciliationPercent=${reconciliationPercent} unexplainedMs=${unexplainedMs} dbClientReadyMs=${dbClientReadyMs} firstPrismaWaitMs=${firstPrismaWaitMs}`,
  );
  console.info(
    `${PREFIX} cid=${store.correlationId} ledger=breakdown authSessionMs=${authSessionMs} tenantMs=${tenantMs} layoutParticipationNavMs=${layoutParticipationNavMs} pageAuthMs=${pageAuthMs} actorSecurityMs=${actorSecurityMs} dashboardContextMs=${dashboardContextMs} shellMs=${shellMs} programmeMs=${programmeMs} calendarMergeMs=${calendarMs} personalActionsMs=${personalActionsMs} operationalAttentionMs=${operationalAttentionMs} personalWorkMaxMs=${personalWorkMs} secondaryMs=${secondaryMs} quickAccessMs=${quickAccessMs} commandCenterDataMs=${commandCenterDataMs} commandCenterInnerParallelMaxMs=${commandCenterInnerParallelMs} commandCenterOuterMaxMs=${commandCenterOuterMs}`,
  );
  if (duplicateSummary) {
    console.info(`${PREFIX} cid=${store.correlationId} ledger=duplicateProbes ${duplicateSummary}`);
  }
  if (store.milestones.length > 0) {
    console.info(
      `${PREFIX} cid=${store.correlationId} ledger=milestones ${store.milestones
        .map((m) => `${m.id}@${m.elapsedMs}`)
        .join(" ")}`,
    );
  }
}

export function finishSceHotfixLogin01DashboardTrace(): void {
  const store = requireStore();
  if (!store) return;
  const requestTotalMs = Date.now() - store.originMs;
  logSceHotfixLogin01Milestone("T11_STREAM_COMPLETE");
  logSceHotfixLogin01StepDone("dashboard");
  emitCriticalPathLedger(store, requestTotalMs);
}

/** Trace start → await fn() → trace done|failure (no-op when tracing disabled). */
export async function runWithSceHotfixLogin01Trace<T>(
  step: string,
  operation: () => Promise<T>,
): Promise<T> {
  const store = requireStore();
  if (!store) {
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
  sceHotfixLogin01TraceStorage.enterWith(createSceHotfixLogin01TraceStore("test-cid"));
  const store = getSceHotfixLogin01TraceStore();
  if (!store) return;
  store.originMs = Date.now();
  store.stepStartedAtMs.clear();
  store.stepDurationMs.clear();
  store.duplicateProbeCounts.clear();
  store.milestones.length = 0;
  store.dbClientReadyMs = undefined;
  store.firstPrismaCallWaitMs = undefined;
  store.requestMetaLogged = false;
}

export function getSceHotfixLogin01TraceStateForTests(): {
  duplicateProbeCounts: Record<string, number>;
  milestones: string[];
} {
  const store = getSceHotfixLogin01TraceStore();
  if (!store) {
    return { duplicateProbeCounts: {}, milestones: [] };
  }
  return {
    duplicateProbeCounts: Object.fromEntries(store.duplicateProbeCounts),
    milestones: store.milestones.map((m) => m.id),
  };
}

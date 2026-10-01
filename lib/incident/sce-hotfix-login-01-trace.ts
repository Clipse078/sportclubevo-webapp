/**
 * SCE-HOTFIX-LOGIN-01 — temporary dashboard SSR timing instrumentation (no PII).
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
  return correlationId;
}

export function logSceHotfixLogin01Step(step: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  steps.push({ name: step, atMs: Date.now() - originMs });
  console.info(`${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${steps.at(-1)?.atMs ?? 0} phase=start`);
}

export function logSceHotfixLogin01StepDone(step: string): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const elapsedMs = Date.now() - originMs;
  steps.push({ name: `${step}:done`, atMs: elapsedMs });
  console.info(`${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${elapsedMs} phase=done`);
}

export function logSceHotfixLogin01StepFailed(step: string, error: unknown): void {
  if (!TRACE_ENABLED || originMs == null) return;
  const elapsedMs = Date.now() - originMs;
  const message = error instanceof Error ? error.message : "unknown";
  console.error(
    `${PREFIX} cid=${correlationId ?? "?"} step=${step} elapsedMs=${elapsedMs} phase=failure message=${message}`,
  );
}

export function finishSceHotfixLogin01DashboardTrace(): void {
  if (!TRACE_ENABLED || originMs == null) return;
  logSceHotfixLogin01StepDone("dashboard");
}

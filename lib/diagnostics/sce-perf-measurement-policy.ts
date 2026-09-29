/**
 * SCE-PERF-02A — guardrails for low-rate performance measurement scripts.
 * No secrets; host allowlists only.
 */

export const SCE_PERF_MEASUREMENT_CONFIRM = "RUN_SCE_PERF_MEASUREMENT" as const;

/** Canonical STAGE customer domain (APP_ENV=STAGE on Vercel production target). */
export const SCE_PERF_STAGE_MEASUREMENT_HOSTS = new Set([
  "fcallschwil.sportclubevo.com",
]);

export type ScePerfMeasurementHostDecision =
  | { ok: true; hostname: string }
  | { ok: false; reason: string };

export function assertScePerfMeasurementConfirm(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.SCE_PERF_MEASUREMENT_CONFIRM !== SCE_PERF_MEASUREMENT_CONFIRM) {
    throw new Error(
      `Set SCE_PERF_MEASUREMENT_CONFIRM=${SCE_PERF_MEASUREMENT_CONFIRM} before live measurement.`,
    );
  }
}

export function resolveScePerfMeasurementBaseUrl(
  raw: string | undefined,
): ScePerfMeasurementHostDecision {
  const candidate = raw?.trim();
  if (!candidate) {
    return { ok: false, reason: "SCE_PERF_BASE_URL is required." };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "SCE_PERF_BASE_URL must be a valid absolute URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "SCE_PERF_BASE_URL must use https." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!SCE_PERF_STAGE_MEASUREMENT_HOSTS.has(hostname)) {
    return {
      ok: false,
      reason: `Host not allowlisted for SCE-PERF measurement: ${hostname}.`,
    };
  }

  return { ok: true, hostname };
}

/** Paths safe for read-only benchmarking on shared STAGE (Standardplan, no materialization). */
export const SCE_PERF_READONLY_PLANNER_PATH =
  "/dashboard/planner/week" as const;

export const SCE_PERF_READONLY_TRAINING_PATH = "/dashboard/training" as const;

/**
 * Query params that must be avoided on STAGE benchmarks because they trigger writes
 * (`materializeLinkedWeekplannerPlan` on GET when plan is a non-default Wochenplan).
 */
export const SCE_PERF_MUTATING_PLANNER_QUERY_KEYS = ["plan"] as const;

export function buildReadonlyPlannerWeekUrl(
  baseUrl: string,
  weekParam?: string,
): string {
  const url = new URL(SCE_PERF_READONLY_PLANNER_PATH, baseUrl);
  if (weekParam?.trim()) {
    url.searchParams.set("week", weekParam.trim());
  }
  return url.toString();
}

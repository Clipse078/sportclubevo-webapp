/**
 * SCE-PERF-02A — authenticated HTTP probe for STAGE (no Playwright).
 * Requires operator-supplied credentials; never logs cookies or tokens.
 */
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import {
  assertScePerfMeasurementConfirm,
  buildReadonlyPlannerWeekUrl,
  resolveScePerfMeasurementBaseUrl,
  SCE_PERF_READONLY_TRAINING_PATH,
} from "@/lib/diagnostics/sce-perf-measurement-policy";
import { summarizeLatency } from "@/lib/diagnostics/sce-perf-stats";
import { createSmokeHttpClient } from "@/lib/acceptance/security-smoke/http-client";

async function timedGet(
  client: ReturnType<typeof createSmokeHttpClient>,
  path: string,
): Promise<{ status: number; ttfbMs: number; totalMs: number; bytes: number }> {
  const started = performance.now();
  const response = await client.get(path);
  const ttfbMs = performance.now() - started;
  return {
    status: response.status,
    ttfbMs: Number(ttfbMs.toFixed(1)),
    totalMs: Number((performance.now() - started).toFixed(1)),
    bytes: response.bodyText.length,
  };
}

async function main() {
  assertScePerfMeasurementConfirm();
  const baseDecision = resolveScePerfMeasurementBaseUrl(
    process.env.SCE_PERF_BASE_URL,
  );
  if (!baseDecision.ok) {
    throw new Error(baseDecision.reason);
  }
  const baseUrl = process.env.SCE_PERF_BASE_URL!.trim().replace(/\/$/, "");

  const email = process.env.SCE_PERF_AUTH_EMAIL?.trim();
  const password = process.env.SCE_PERF_AUTH_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "SCE_PERF_AUTH_EMAIL and SCE_PERF_AUTH_PASSWORD are required for authenticated HTTP probe.",
    );
  }

  const client = createSmokeHttpClient(baseUrl);
  try {
    await client.loginWithCredentials(email, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    console.log(JSON.stringify({ probe: "auth", ok: false, message }));
    process.exitCode = 2;
    return;
  }

  const session = await client.getSession();
  const sessionEmail =
    session?.user && typeof session.user === "object"
      ? (session.user as { email?: string }).email ?? null
      : null;

  const plannerPath = new URL(buildReadonlyPlannerWeekUrl(baseUrl)).pathname;
  const paths = [plannerPath, SCE_PERF_READONLY_TRAINING_PATH];

  const artifactPath =
    process.env.SCE_PERF_PROBE_ARTIFACT?.trim() ||
    "/opt/cursor/artifacts/sce-perf-02a-stage-http-probe.jsonl";
  const lines: string[] = [];
  const log = (payload: unknown) => {
    const line = JSON.stringify(payload);
    console.log(line);
    lines.push(line);
  };

  log({
    probe: "auth",
    ok: true,
    sessionEmailPresent: Boolean(sessionEmail),
    emailDomain: email.split("@")[1] ?? null,
  });

  for (const path of paths) {
    const warmTtfb: number[] = [];
    const warmTotal: number[] = [];
    let cold: Awaited<ReturnType<typeof timedGet>> | null = null;

    for (let i = 0; i < 30; i++) {
      const sample = await timedGet(client, path);
      if (i === 0) cold = sample;
      warmTtfb.push(sample.ttfbMs);
      warmTotal.push(sample.totalMs);
    }

    log({
      path,
      cold,
      warmTtfb: summarizeLatency(`${path}:ttfb`, warmTtfb),
      warmTotal: summarizeLatency(`${path}:total`, warmTotal),
      note: "HTTP subset only — not click-to-usable; RSC/hydration not captured.",
    });
  }

  writeFileSync(artifactPath, `${lines.join("\n")}\n`);
  log({ artifactPath });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

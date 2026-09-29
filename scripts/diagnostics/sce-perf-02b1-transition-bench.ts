/**
 * SCE-PERF-02B1 — prev/next week navigation latency (Standardplan, read-only).
 */
import "dotenv/config";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { prisma } from "@/lib/db/prisma";
import { getWeekplannerWeek } from "@/lib/weekplanner/queries";
import { resolveTrainingWeekWindow } from "@/lib/training/date-range";
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function summarizeLatency(label: string, samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const round = (n: number) => Number(n.toFixed(1));
  return {
    label,
    n: samples.length,
    minMs: round(sorted[0]!),
    p50Ms: round(percentile(sorted, 50)),
    p75Ms: round(percentile(sorted, 75)),
    p95Ms: round(percentile(sorted, 95)),
    maxMs: round(sorted[sorted.length - 1]!),
  };
}

async function main() {
  const impl = process.env.SCE_PERF_IMPL?.trim() || "feature";
  const anchor = process.env.SCE_PERF_WEEK_PARAM?.trim() || "2026-09-28";
  const samples = Number(process.env.SCE_PERF_SAMPLES ?? "30");
  const artifactPath =
    process.env.SCE_PERF_BENCH_ARTIFACT?.trim() ||
    `/opt/cursor/artifacts/sce-perf-02b1-transition-${impl}.jsonl`;

  const tenant = (
    await prisma.tenant.findFirst({ where: { key: "fc-allschwil" }, select: { id: true } })
  )!.id;

  const anchorWindow = resolveTrainingWeekWindow({
    weekParam: anchor,
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });
  const prevWeek = resolveTrainingWeekWindow({
    weekParam: anchorWindow.previousParam,
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });
  const nextWeek = resolveTrainingWeekWindow({
    weekParam: anchorWindow.nextParam,
    timeZone: "Europe/Zurich",
    now: new Date("2026-09-29T12:00:00.000Z"),
  });

  const toShape = (w: ReturnType<typeof resolveTrainingWeekWindow>) => ({
    from: w.from,
    to: w.to,
    days: w.days,
    param: w.param,
    previousParam: w.previousParam,
    nextParam: w.nextParam,
  });

  const lines: string[] = [];
  const log = (row: unknown) => {
    const line = JSON.stringify(row);
    console.log(line);
    lines.push(line);
  };

  log({ benchmark: "SCE-PERF-02B1-transition", impl, anchor, samples });

  const prevDurations: number[] = [];
  const nextDurations: number[] = [];

  for (let i = 0; i < samples; i++) {
    const prevStart = performance.now();
    const prev = await getWeekplannerWeek(tenant, toShape(prevWeek), undefined);
    prevDurations.push(performance.now() - prevStart);
    log({
      leg: "prev",
      weekParam: prevWeek.param,
      durationMs: Number(prevDurations.at(-1)!.toFixed(1)),
      itemCount: prev.days.reduce((n, d) => n + d.items.length, 0),
    });

    const nextStart = performance.now();
    const next = await getWeekplannerWeek(tenant, toShape(nextWeek), undefined);
    nextDurations.push(performance.now() - nextStart);
    log({
      leg: "next",
      weekParam: nextWeek.param,
      durationMs: Number(nextDurations.at(-1)!.toFixed(1)),
      itemCount: next.days.reduce((n, d) => n + d.items.length, 0),
    });
  }

  log(summarizeLatency(`transition_prev_${prevWeek.param}`, prevDurations));
  log(summarizeLatency(`transition_next_${nextWeek.param}`, nextDurations));
  writeFileSync(artifactPath, `${lines.join("\n")}\n`);
  log({ artifactPath });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

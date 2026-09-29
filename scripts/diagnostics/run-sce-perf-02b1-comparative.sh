#!/usr/bin/env bash
# SCE-PERF-02B1 — alternate baseline/feature warm samples per week (read-only).
set -euo pipefail

BASELINE_ROOT="${SCE_PERF_BASELINE_ROOT:-/tmp/sce-perf-02b1-baseline}"
FEATURE_ROOT="${SCE_PERF_FEATURE_ROOT:-/workspace}"
ARTIFACT_DIR="${SCE_PERF_ARTIFACT_DIR:-/opt/cursor/artifacts}"
SAMPLES="${SCE_PERF_SAMPLES:-30}"
PAUSE_MS="${SCE_PERF_PAUSE_MS:-400}"
WEEKS="${SCE_PERF_WEEKS:-2026-09-28,2026-09-21,2026-10-05,2026-01-05}"

mkdir -p "$ARTIFACT_DIR"

copy_scripts_to_baseline() {
  for f in sce-perf-02b1-single-week-bench.ts sce-perf-02b1-phase-timing-week.ts; do
    mkdir -p "$BASELINE_ROOT/scripts/diagnostics"
    cp "$FEATURE_ROOT/scripts/diagnostics/$f" "$BASELINE_ROOT/scripts/diagnostics/$f"
  done
}

run_one() {
  local root="$1"
  local impl="$2"
  local week="$3"
  (
    cd "$root"
    export SCE_PERF_IMPL="$impl"
    export SCE_PERF_WEEK_PARAM="$week"
    npx tsx scripts/diagnostics/sce-perf-02b1-single-week-bench.ts
  )
}

copy_scripts_to_baseline

IFS=',' read -ra WEEK_ARR <<< "$WEEKS"
for week in "${WEEK_ARR[@]}"; do
  week="$(echo "$week" | xargs)"
  raw="$ARTIFACT_DIR/sce-perf-02b1-comparative-${week}.jsonl"
  : > "$raw"
  echo "{\"event\":\"week_start\",\"weekParam\":\"$week\",\"samplesPerImpl\":$SAMPLES}" >> "$raw"
  for ((i = 1; i <= SAMPLES; i++)); do
    run_one "$BASELINE_ROOT" baseline "$week" >> "$raw"
    sleep "$(awk "BEGIN {print $PAUSE_MS/1000}")"
    run_one "$FEATURE_ROOT" feature "$week" >> "$raw"
    sleep "$(awk "BEGIN {print $PAUSE_MS/1000}")"
  done
  npx tsx "$FEATURE_ROOT/scripts/diagnostics/sce-perf-02b1-summarize-comparative.ts" "$raw"
done

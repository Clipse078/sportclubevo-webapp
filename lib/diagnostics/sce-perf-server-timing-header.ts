/**
 * SCE-PERF-02A — map admin server timing reports to a Server-Timing header value.
 * Disabled unless SCE_PERF_TIMING=1 (same gate as admin-server-timing).
 */

import type { AdminServerTimingReport } from "@/lib/planning-hub/admin-server-timing";
import { isScePerfTimingEnabled } from "@/lib/planning-hub/admin-server-timing";

function sanitizeToken(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
}

export function buildServerTimingHeaderValue(
  report: AdminServerTimingReport,
): string | null {
  if (!isScePerfTimingEnabled()) return null;
  const parts = report.entries.map(
    (entry) => `${sanitizeToken(entry.label)};dur=${entry.durationMs.toFixed(1)}`,
  );
  parts.push(`total;dur=${report.totalMs.toFixed(1)}`);
  return parts.join(", ");
}

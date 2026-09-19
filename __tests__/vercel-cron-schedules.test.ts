/**
 * CRON-PRO-01 — regression guard for Vercel Cron schedules in vercel.json.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type VercelCronConfig = {
  crons: Array<{ path: string; schedule: string }>;
};

const EXPECTED_SCHEDULES: Record<string, string> = {
  "/api/cron/billing-inbound-sync": "*/5 * * * *",
  "/api/cron/sfv-sync": "*/30 * * * *",
  "/api/cron/sfv-club-master-import": "0 4 * * *",
  "/api/cron/recurring-billing": "30 2 * * *",
};

describe("vercel.json cron schedules", () => {
  it("defines exactly the four operational cron routes with expected cadences", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const config = JSON.parse(raw) as VercelCronConfig;

    expect(config.crons).toHaveLength(Object.keys(EXPECTED_SCHEDULES).length);

    const byPath = Object.fromEntries(config.crons.map((c) => [c.path, c.schedule]));

    for (const [path, schedule] of Object.entries(EXPECTED_SCHEDULES)) {
      expect(byPath[path], `schedule for ${path}`).toBe(schedule);
    }
  });
});

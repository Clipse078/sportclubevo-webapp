/**
 * CRON-PRO-01 / SCE-COMM-20 — regression guard for Vercel Cron schedules in vercel.json.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type VercelCronConfig = {
  crons: Array<{ path: string; schedule: string }>;
};

/** Every production cron route must appear exactly once in vercel.json. */
const EXPECTED_SCHEDULES: Record<string, string> = {
  "/api/cron/sfv-sync": "*/30 * * * *",
  "/api/cron/sfv-club-master-import": "0 4 * * *",
  "/api/cron/recurring-billing": "30 2 * * *",
  "/api/cron/billing-inbound-sync": "*/5 * * * *",
  "/api/cron/communication-inbox-sync": "*/5 * * * *",
  "/api/cron/platform-communication-email": "*/5 * * * *",
  "/api/cron/communication-reminders": "*/1 * * * *",
  "/api/cron/communication-scheduler": "*/1 * * * *",
  "/api/cron/task-series-occurrences": "15 3 * * *",
  "/api/cron/task-notifications": "0 * * * *",
  "/api/cron/participation-notifications": "30 * * * *",
  "/api/cron/requirement-notifications": "45 * * * *",
  "/api/cron/workspace-trash-purge": "20 4 * * *",
  "/api/cron/workspace-background-jobs": "*/2 * * * *",
};

describe("vercel.json cron schedules", () => {
  it("registers every cron route exactly once with expected cadence", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const config = JSON.parse(raw) as VercelCronConfig;

    const cronDir = join(process.cwd(), "app/api/cron");
    const routePaths = readdirSync(cronDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/api/cron/${entry.name}`)
      .sort();

    expect(routePaths).toEqual(Object.keys(EXPECTED_SCHEDULES).sort());

    expect(config.crons).toHaveLength(Object.keys(EXPECTED_SCHEDULES).length);

    const byPath = Object.fromEntries(config.crons.map((c) => [c.path, c.schedule]));
    const paths = config.crons.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);

    for (const [path, schedule] of Object.entries(EXPECTED_SCHEDULES)) {
      expect(byPath[path], `schedule for ${path}`).toBe(schedule);
    }
  });
});

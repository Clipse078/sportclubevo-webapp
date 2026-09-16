/**
 * @vitest-environment jsdom
 *
 * TRAINING-CENTER-UX-01 — no legacy light-surface classes in key TrainingCenter UI.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "components/admin/training");

const FILES = [
  "TrainingSessionRow.tsx",
  "TrainingSessionEditForm.tsx",
  "TrainingCenterOverview.tsx",
  "TrainingMonthCalendar.tsx",
  "training-center-ui.tsx",
];

const FORBIDDEN = ["bg-white", "bg-emerald-50", "bg-amber-50", "border-gray-200", "text-gray-900"];

describe("TrainingCenter dark-surface audit (touched components)", () => {
  for (const file of FILES) {
    it(`${file} avoids legacy light utility classes`, () => {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const token of FORBIDDEN) {
        expect(source.includes(token)).toBe(false);
      }
    });
  }
});

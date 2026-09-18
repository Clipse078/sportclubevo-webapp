/**
 * SPIELE-UX-01B — RSC boundary regression for Spiele management overview.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectMatchDayKeys,
  matchDayKeyInTimezone,
} from "@/lib/matchcenter/management-view";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("SPIELE-UX-01B — management-view calendar helpers (server-safe)", () => {
  it("management-view.ts is not a Client Component module", () => {
    const source = readSource("lib/matchcenter/management-view.ts");
    expect(source).not.toMatch(/^"use client"/m);
    expect(source).not.toContain("useState(");
    expect(source).not.toContain("useEffect(");
  });

  it("collectMatchDayKeys is exported from server-neutral management-view", () => {
    const dates = [
      new Date("2026-09-18T16:00:00.000Z"),
      new Date("2026-09-18T20:00:00.000Z"),
      new Date("2026-09-19T16:00:00.000Z"),
    ];
    const keys = collectMatchDayKeys(dates, "Europe/Zurich");
    expect(keys).toContain("2026-09-18");
    expect(keys).toContain("2026-09-19");
    expect(keys).toHaveLength(2);
  });

  it("matchDayKeyInTimezone matches en-CA day keys used by grouping", () => {
    const date = new Date("2026-09-18T16:00:00.000Z");
    expect(matchDayKeyInTimezone(date, "Europe/Zurich")).toBe("2026-09-18");
  });
});

describe("SPIELE-UX-01B — Spiele workspace RSC props", () => {
  it("SpieleManagementWorkspace uses server-safe management derivation", () => {
    const source = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    expect(source).toContain("deriveSpieleManagementPresentation");
    expect(source).not.toContain("const matchDayKeys = collectMatchDayKeys(");
    expect(source).toContain("@/lib/matchcenter/management-view");
  });

  it("SpieleManagementMonthCalendar does not export server helpers", () => {
    const source = readSource("components/admin/matchcenter/SpieleManagementMonthCalendar.tsx");
    expect(source).toMatch(/^"use client"/m);
    expect(source).not.toContain("export function collectMatchDayKeys");
  });

  it("workspace does not pass function props into client rail components", () => {
    const source = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    const calendarBlock = source.slice(source.indexOf("<SpieleManagementMonthCalendar"));
    const schnellBlock = source.slice(source.indexOf("<SpieleManagementSchnellfilter"));

    expect(calendarBlock).not.toMatch(/dayHref=\{/);
    expect(schnellBlock).not.toContain("toggleStatusHref=");
    expect(schnellBlock).toContain("statusToggleHrefs=");
    expect(schnellBlock).toContain("teamFilterLinks=");
    expect(schnellBlock).toContain("zeitraumLinks=");
    expect(schnellBlock).not.toMatch(/toggleStatusHref=\{/);
  });

  it("matchcenter page remains a Server Component entry", () => {
    const source = readSource("app/(admin)/dashboard/matchcenter/page.tsx");
    expect(source).not.toMatch(/^"use client"/m);
    expect(source).toContain("SpieleManagementWorkspace");
  });
});

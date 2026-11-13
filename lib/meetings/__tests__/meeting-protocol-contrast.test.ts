import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-03R4 — protocol document contrast (scoped surface)", () => {
  it("print view pins readable slate text on white document surface", () => {
    const printView = readSrc("components/admin/meetings/workspace/MeetingProtocolPrintView.tsx");
    expect(printView).toContain("sce-protocol-document");
    expect(printView).toContain("bg-white");
    expect(printView).toContain("text-slate-900");
    expect(printView).not.toContain("text-[var(--foreground)]");
    expect(printView).toMatch(/print:bg-white/);
    expect(printView).toMatch(/print:text-slate-900/);
  });

  it("print route layout keeps neutral document canvas", () => {
    const layout = readSrc("app/(print)/layout.tsx");
    expect(layout).toContain("bg-white");
    expect(layout).toContain("text-neutral-900");
  });
});

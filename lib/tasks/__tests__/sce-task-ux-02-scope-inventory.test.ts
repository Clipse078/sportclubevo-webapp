import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsFiles(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      acc.push(full.replace(`${process.cwd()}/`, ""));
    }
  }
  return acc;
}

describe("SCE-TASK-UX-02 scope inventory — no modal task create at runtime", () => {
  it("ContextualTaskCreateDialog is not mounted anywhere", () => {
    const sources = walkTsFiles(join(process.cwd(), "components")).concat(
      walkTsFiles(join(process.cwd(), "app")),
    );
    const offenders = sources.filter((rel) => {
      if (rel.includes("ContextualTaskCreateDialog.tsx")) return false;
      const src = read(rel);
      return /<ContextualTaskCreateDialog[\s/>]/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it("record surfaces with Aufgaben panel use inlinePanel activation", () => {
    for (const rel of [
      "components/admin/matchcenter/MatchcenterDetail.tsx",
      "app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx",
      "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
      "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
      "app/(admin)/dashboard/persons/[id]/page.tsx",
    ]) {
      expect(read(rel)).toContain('activation="inlinePanel"');
    }
  });

  it("/dashboard/aufgaben/neu hosts collapsible contextual or full create cards", () => {
    const neuPage = read("app/(admin)/dashboard/aufgaben/neu/page.tsx");
    expect(neuPage).toContain("AufgabenNeuClient");
    const neuClient = read("components/admin/aufgaben/AufgabenNeuClient.tsx");
    expect(neuClient).toContain("ContextualTaskInlineCreateCard");
    expect(neuClient).toContain("AufgabenFullCreateCollapsibleCard");
    expect(neuClient).not.toContain("ContextualTaskCreateDialog");
    expect(neuClient).not.toContain("AufgabenFullCreateClient");
  });

  it("toolbar/inspector triggers navigate to neu with context query params", () => {
    const nav = read("lib/tasks/task-create-navigation.ts");
    expect(nav).toContain("/dashboard/aufgaben/neu");
    const workspaceInspector = read("components/admin/workspace/inspector/WorkspaceDocumentInspectorView.tsx");
    expect(workspaceInspector).toContain("ContextualTaskCreateTrigger");
  });
});

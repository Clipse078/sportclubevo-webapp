/**
 * Shared SCE writing engine — Dokumentation + Aufgabe wave-one adoption sentinels.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SCE_WRITING_ENGINE_WAVE_ONE } from "@/lib/sce-writing/sce-writing-rollout";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE shared writing engine — wave one", () => {
  it("Dokumentation and Aufgabe mount the same SceWritingEngine implementation", () => {
    const task = read("components/admin/aufgaben/TaskDescriptionEditor.tsx");
    const doc = read("components/admin/tenant-documentation/TenantDocumentationCollabEditor.tsx");
    expect(task).toContain('profile="task"');
    expect(task).toContain("SceWritingEngine");
    expect(doc).toContain('profile="documentation"');
    expect(doc).toContain("SceWritingEngine");
    expect(SCE_WRITING_ENGINE_WAVE_ONE).toEqual(["dokumentation", "aufgabe"]);
  });

  it("shared extensions, paste, and link validation live under lib/sce-writing", () => {
    const extensions = read("lib/sce-writing/sce-writing-extensions.ts");
    const paste = read("lib/sce-writing/sce-writing-paste.ts");
    const engine = read("components/sce-writing/SceWritingEngine.tsx");
    expect(extensions).toContain("buildSceWritingExtensions");
    expect(extensions).toContain("SceInlineMentionMark");
    expect(paste).toContain("transformSceWritingPastedHtml");
    expect(engine).toContain("buildSceWritingEditorProps");
    expect(engine).toContain("data-sce-writing-engine");
  });

  it("collab editor keeps stable mount shell (no layout jump on Bearbeiten)", () => {
    const engine = read("components/sce-writing/SceWritingEngine.tsx");
    const doc = read("components/admin/tenant-documentation/TenantDocumentationCollabEditor.tsx");
    expect(engine).toContain("-mount-shell");
    expect(doc).toContain("immediatelyRender={false}");
    expect(doc).toContain("min-h-[320px]");
  });

  it("shared insert menu is mounted on both profiles", () => {
    const engine = read("components/sce-writing/SceWritingEngine.tsx");
    const items = read("lib/sce-writing/sce-writing-insert-menu-items.ts");
    expect(engine).toContain("SceWritingInsertMenu");
    expect(items).toContain("listSceWritingInsertMenuItems");
    expect(items).toContain('"documentation"');
    expect(items).toContain('"task"');
  });
});
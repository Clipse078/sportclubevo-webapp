/**
 * AUFGABEN-06F2-UX1 — contextual task creation UX acceptance (U1–U30).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DIALOG_STANDARD_MAX_PX,
  SCE_DIALOG_VARIANT_STANDARD,
} from "@/lib/shell/responsive-layout";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("AUFGABEN-06F2-UX1 acceptance", () => {
  it("U1/U2 shared panel has single header create CTA", () => {
    const src = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    const triggerCount = (src.match(/<ContextualTaskCreateTrigger/g) ?? []).length;
    expect(triggerCount).toBe(1);
    expect(src).toContain("Noch keine offenen Aufgaben");
  });

  it("U3 shared dialog uses expanded canonical sizing (~720px)", () => {
    expect(SCE_DIALOG_STANDARD_MAX_PX).toBe(720);
    const dialogSrc = read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx");
    expect(dialogSrc).toContain('size="standard"');
    expect(SCE_DIALOG_VARIANT_STANDARD).toContain("45rem");
    const uiDialog = read("components/ui/Dialog.tsx");
    expect(uiDialog).toContain("standard: SCE_DIALOG_VARIANT_STANDARD");
  });

  it("U4–U13 single reusable TaskDescriptionEditor", () => {
    const editorSrc = read("components/admin/aufgaben/TaskDescriptionEditor.tsx");
    expect(editorSrc).toContain("TaskDescriptionEditor");
    expect(editorSrc).toContain("toggleBold");
    expect(editorSrc).toContain("toggleItalic");
    expect(editorSrc).toContain("toggleUnderline");
    expect(editorSrc).toContain("toggleStrike");
    expect(editorSrc).toContain("toggleBulletList");
    expect(editorSrc).toContain("toggleOrderedList");
    expect(editorSrc).toContain("toggleTaskList");
    expect(editorSrc).toContain("toggleCode");
    expect(editorSrc).toContain("setLink");
  });

  it("U25 no duplicate module-specific editor/dialog implementations", () => {
    const names = [
      "MatchTaskCreateDialog",
      "TrainingTaskCreateDialog",
      "TournamentTaskCreateDialog",
    ];
    for (const name of names) {
      expect(read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx")).not.toContain(
        name,
      );
    }
    expect(read("package.json")).not.toMatch(/quill|lexical|ckeditor/i);
  });

  it("U26/U27 generic create and workspace use shared description foundation", () => {
    expect(read("components/admin/aufgaben/AufgabenFullCreateClient.tsx")).toContain(
      "TaskDescriptionFormField",
    );
    expect(read("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("TaskDescriptionEditor");
    expect(read("components/admin/aufgaben/TaskWorkspace.tsx")).toContain("TaskDescriptionContent");
  });

  it("U19–U24 contextual security architecture unchanged", () => {
    const createSrc = read("lib/tasks/contextual-task-create.ts");
    expect(createSrc).toContain("assertNoClientContextOverride");
    expect(createSrc).toContain("validateTaskContext");
    const orgFields = read("components/admin/aufgaben/TaskOrgVisibilityFields.tsx");
    expect(orgFields).toContain("ORG_UNIT");
    expect(orgFields).toContain("ASSIGNEES_ONLY");
    expect(orgFields).toContain("CLUB");
    const dialogSrc = read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx");
    expect(dialogSrc).toContain("createContextualAufgabeAction");
    expect(dialogSrc).not.toContain("parentTaskId");
  });

  it("U20/U28 contextual create root-only — no subtask CTA in contextual dialog", () => {
    const dialogSrc = read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx");
    expect(dialogSrc).not.toMatch(/Unteraufgabe/i);
    expect(read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx")).not.toMatch(
      /Unteraufgabe/i,
    );
  });

  it("U30 schema unchanged — description remains String on Task", () => {
    const schema = read("prisma/schema.prisma");
    const taskBlock = schema.slice(schema.indexOf("model Task {"), schema.indexOf("model TaskComment"));
    expect(taskBlock).toMatch(/description\s+String\?/);
    expect(taskBlock).not.toContain("descriptionJson");
  });

  it("storage preflight — JSON-in-string without migration", () => {
    const storage = read("lib/tasks/task-description.ts");
    expect(storage).toContain("serializeTaskDescriptionForStorage");
    expect(storage).not.toContain("prisma");
  });
});

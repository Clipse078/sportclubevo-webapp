/**
 * AUFGABEN-06F2-UX1 — Task description storage & rendering.
 */

import { describe, expect, it } from "vitest";
import {
  documentFromStoredTaskDescription,
  normalizeTaskDescriptionInput,
  parseStoredTaskDescription,
  serializeTaskDescriptionForStorage,
  taskDescriptionToSafeHtml,
} from "../task-description";

describe("task-description storage", () => {
  it("U14 empty description accepted", () => {
    expect(serializeTaskDescriptionForStorage(documentFromStoredTaskDescription(null))).toBeNull();
    expect(normalizeTaskDescriptionInput("")).toBeNull();
    expect(normalizeTaskDescriptionInput("   ")).toBeNull();
  });

  it("U17 plain text compatibility", () => {
    const parsed = parseStoredTaskDescription("Legacy plain\nline");
    expect(parsed.kind).toBe("plain");
    expect(taskDescriptionToSafeHtml("Legacy plain\nline")).toContain("Legacy plain");
  });

  it("U15 formatted description survives create serialization", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph" as const,
          content: [{ type: "text" as const, text: "Hello", marks: [{ type: "bold" as const }] }],
        },
      ],
    };
    const stored = serializeTaskDescriptionForStorage(doc);
    expect(stored).toContain('"type":"doc"');
    expect(normalizeTaskDescriptionInput(stored)).toBe(stored);
  });

  it("U18 unsafe HTML/script cannot execute unsanitized", () => {
    const evil = '<script>alert(1)</script><img onerror="x" src=y>';
    const html = taskDescriptionToSafeHtml(evil);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
  });

  it("R2 rendered HTML uses ul/ol and checklist semantics", () => {
    const bullet = serializeTaskDescriptionForStorage({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }],
            },
          ],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(bullet!)).toMatch(/<ul[\s>]/);

    const ordered = serializeTaskDescriptionForStorage({
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }],
            },
          ],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(ordered!)).toMatch(/<ol[\s>]/);

    const checklist = serializeTaskDescriptionForStorage({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Todo" }] }],
            },
          ],
        },
      ],
    });
    const checklistHtml = taskDescriptionToSafeHtml(checklist!);
    expect(checklistHtml).toContain("task-description-checklist");
    expect(checklistHtml).toContain('type="checkbox"');
  });

  it("U16 rich description renders bold in workspace HTML", () => {
    const stored = serializeTaskDescriptionForStorage({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(stored)).toContain("<strong>Bold</strong>");
  });
});

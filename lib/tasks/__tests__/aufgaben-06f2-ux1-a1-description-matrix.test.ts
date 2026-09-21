/**
 * AUFGABEN-06F2-UX1-A1 — Task description round-trip, legacy, malformed, XSS matrix (A1–A42).
 */

import { describe, expect, it } from "vitest";
import type { TaskDescriptionDocument } from "../task-description";
import {
  documentFromStoredTaskDescription,
  normalizeTaskDescriptionInput,
  parseStoredTaskDescription,
  serializeTaskDescriptionForStorage,
  taskDescriptionToSafeHtml,
} from "../task-description";

function p(text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): TaskDescriptionDocument {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] }],
  };
}

function roundTripRich(doc: TaskDescriptionDocument) {
  const stored = serializeTaskDescriptionForStorage(doc);
  expect(stored).not.toBeNull();
  expect(stored!.startsWith('{"type":"doc"')).toBe(true);
  const parsed = parseStoredTaskDescription(stored);
  expect(parsed.kind).toBe("document");
  const html = taskDescriptionToSafeHtml(stored);
  const reloaded = documentFromStoredTaskDescription(stored);
  const storedAgain = serializeTaskDescriptionForStorage(reloaded);
  expect(storedAgain).toBe(stored);
  return { stored: stored!, html, reloaded };
}

describe("AUFGABEN-06F2-UX1-A1 description matrix A1–A20", () => {
  it("A1 plain text stores as plain string", () => {
    const stored = serializeTaskDescriptionForStorage(p("Hello world"));
    expect(stored).toBe("Hello world");
    expect(parseStoredTaskDescription(stored).kind).toBe("plain");
    expect(taskDescriptionToSafeHtml(stored)).toContain("Hello world");
  });

  it("A2 multiline plain text (legacy newlines)", () => {
    const legacy = "Line one\nLine two";
    expect(parseStoredTaskDescription(legacy).kind).toBe("plain");
    const html = taskDescriptionToSafeHtml(legacy);
    expect(html).toContain("Line one");
    expect(html).toContain("<br />");
  });

  it("A3 empty string", () => {
    expect(parseStoredTaskDescription("").kind).toBe("empty");
    expect(normalizeTaskDescriptionInput("")).toBeNull();
  });

  it("A4 null", () => {
    expect(parseStoredTaskDescription(null).kind).toBe("empty");
    expect(serializeTaskDescriptionForStorage(documentFromStoredTaskDescription(null))).toBeNull();
  });

  it("A5 plain paragraph round-trip (no marks → plain storage)", () => {
    const stored = serializeTaskDescriptionForStorage(p("Paragraph"));
    expect(stored).toBe("Paragraph");
    expect(taskDescriptionToSafeHtml(stored)).toContain("Paragraph");
    expect(documentFromStoredTaskDescription(stored).type).toBe("doc");
  });

  it("A6 bold", () => {
    const { html } = roundTripRich(p("Bold", [{ type: "bold" }]));
    expect(html).toContain("<strong>Bold</strong>");
  });

  it("A7 italic", () => {
    const { html } = roundTripRich(p("Italic", [{ type: "italic" }]));
    expect(html).toContain("<em>Italic</em>");
  });

  it("A8 underline", () => {
    const { html } = roundTripRich(p("Under", [{ type: "underline" }]));
    expect(html).toContain("<u>Under</u>");
  });

  it("A9 strike", () => {
    const { html } = roundTripRich(p("Strike", [{ type: "strike" }]));
    expect(html).toContain("<s>Strike</s>");
  });

  it("A10 bullet list", () => {
    const doc: TaskDescriptionDocument = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }],
            },
          ],
        },
      ],
    };
    const { html } = roundTripRich(doc);
    expect(html).toContain("<ul>");
    expect(html).toContain("One");
  });

  it("A11 ordered list", () => {
    const doc: TaskDescriptionDocument = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }],
            },
          ],
        },
      ],
    };
    const { html } = roundTripRich(doc);
    expect(html).toContain("<ol>");
    expect(html).toContain("First");
  });

  it("A12 task/check list preserves taskList nodes", () => {
    const doc: TaskDescriptionDocument = {
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
    };
    const { stored, html } = roundTripRich(doc);
    expect(stored).toContain('"taskList"');
    expect(stored).toContain('"taskItem"');
    expect(html).toContain("task-description-checklist");
    expect(html).toContain("Todo");
  });

  it("A13 hyperlink (https)", () => {
    const doc = p("Site", [{ type: "link", attrs: { href: "https://example.com" } }]);
    const { html } = roundTripRich(doc);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("A14 inline code", () => {
    const { html } = roundTripRich(p("x", [{ type: "code" }]));
    expect(html).toContain("<code>x</code>");
  });

  it("A15 combined marks", () => {
    const doc = p("Mix", [{ type: "bold" }, { type: "italic" }]);
    const { html } = roundTripRich(doc);
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
  });

  it("A16 nested list content in list item", () => {
    const doc: TaskDescriptionDocument = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Outer" }] },
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [{ type: "paragraph", content: [{ type: "text", text: "Inner" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const { html } = roundTripRich(doc);
    expect(html).toContain("Outer");
    expect(html).toContain("Inner");
  });

  it("A17 Unicode text", () => {
    const text = "日本語 — 中文 — العربية";
    const stored = serializeTaskDescriptionForStorage(p(text));
    expect(stored).toBe(text);
    expect(taskDescriptionToSafeHtml(stored)).toContain("日本語");
  });

  it("A18 German umlauts", () => {
    const text = "Größe über Äpfel";
    expect(taskDescriptionToSafeHtml(text)).toContain("Größe");
  });

  it("A19 emoji", () => {
    const text = "Done ✅ 🎉";
    const stored = serializeTaskDescriptionForStorage(p(text));
    expect(stored).toBe(text);
    expect(taskDescriptionToSafeHtml(stored)).toContain("✅");
  });

  it("A20 long description", () => {
    const long = "W".repeat(8000);
    const stored = serializeTaskDescriptionForStorage(p(long));
    expect(stored).toBe(long);
    expect(taskDescriptionToSafeHtml(stored!).length).toBeGreaterThan(7000);
  });
});

describe("AUFGABEN-06F2-UX1-A1 malformed & legacy A21–A30", () => {
  it("A21 text beginning with { stays plain", () => {
    const raw = "{not json at all";
    expect(parseStoredTaskDescription(raw).kind).toBe("plain");
    expect(normalizeTaskDescriptionInput(raw)).toBe(raw);
    expect(() => taskDescriptionToSafeHtml(raw)).not.toThrow();
  });

  it("A22 valid JSON that is not a TipTap doc", () => {
    const raw = '{"type":"paragraph","content":[]}';
    expect(parseStoredTaskDescription(raw).kind).toBe("plain");
    expect(taskDescriptionToSafeHtml(raw)).toContain("{");
  });

  it("A23 malformed JSON with doc prefix falls back to plain", () => {
    const raw = '{"type":"doc","content":[';
    expect(parseStoredTaskDescription(raw).kind).toBe("plain");
    expect(taskDescriptionToSafeHtml(raw)).toContain("{");
  });

  it("A24 truncated TipTap JSON treated as plain", () => {
    const raw = '{"type":"doc","content":[{"type":"paragraph"';
    expect(parseStoredTaskDescription(raw).kind).toBe("plain");
  });

  it("A25 unknown node type ignored in renderer without throw", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [{ type: "unknownWidget", content: [{ type: "text", text: "X" }] }],
    });
    expect(parseStoredTaskDescription(raw).kind).toBe("document");
    expect(() => taskDescriptionToSafeHtml(raw)).not.toThrow();
    expect(taskDescriptionToSafeHtml(raw)).toBe("");
  });

  it("A26 unknown mark ignored safely", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "T", marks: [{ type: "sparkle" }] }],
        },
      ],
    });
    const html = taskDescriptionToSafeHtml(raw);
    expect(html).toContain("T");
    expect(html).not.toContain("sparkle");
  });

  it("A27 missing doc content fails doc validation → plain (no crash)", () => {
    const raw = '{"type":"doc"}';
    expect(parseStoredTaskDescription(raw).kind).toBe("plain");
    expect(() => taskDescriptionToSafeHtml(raw)).not.toThrow();
  });

  it("A28 invalid link attrs omit href", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "L", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ],
    });
    const html = taskDescriptionToSafeHtml(raw);
    expect(html).not.toContain("javascript:");
    expect(html).toContain("L");
  });

  it("A29 legacy HTML stored as plain escapes tags", () => {
    const legacy = "<b>Legacy</b> & more";
    const html = taskDescriptionToSafeHtml(legacy);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("Legacy");
  });

  it("A30 script-looking legacy plain text escaped", () => {
    const legacy = '<script>alert("x")</script>';
    const html = taskDescriptionToSafeHtml(legacy);
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script");
  });
});

describe("AUFGABEN-06F2-UX1-A1 XSS & URL security A31–A42", () => {
  it("A31 script tag in plain legacy", () => {
    const html = taskDescriptionToSafeHtml("<script>alert(1)</script>");
    expect(html).not.toMatch(/<script/i);
  });

  it("A32 onerror attribute stripped via plain escape", () => {
    const html = taskDescriptionToSafeHtml('<img onerror="x" src=y>');
    expect(html).not.toContain("<img");
  });

  it("A33 onclick in plain", () => {
    const html = taskDescriptionToSafeHtml('<div onclick="evil()">x</div>');
    expect(html).not.toMatch(/<div[\s>]/i);
    expect(html).toContain("&lt;div");
  });

  it("A34 javascript: URL in rich link", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).not.toContain("javascript:");
  });

  it("A35 data: URL blocked", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "d", marks: [{ type: "link", attrs: { href: "data:text/html,<script>1</script>" } }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).not.toContain("data:");
  });

  it("A36 malformed href empty", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "m", marks: [{ type: "link", attrs: { href: "" } }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).not.toContain("<a ");
  });

  it("A37 encoded javascript scheme", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "e",
              marks: [{ type: "link", attrs: { href: "java%73cript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).not.toContain("<a ");
  });

  it("A38 mixed-case javascript scheme", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "j",
              marks: [{ type: "link", attrs: { href: "JaVaScRiPt:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).not.toContain("<a ");
  });

  it("A39 normal https URL allowed", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "s", marks: [{ type: "link", attrs: { href: "https://sportclubevo.ch" } }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).toContain('href="https://sportclubevo.ch"');
  });

  it("A40 normal http URL allowed", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "h", marks: [{ type: "link", attrs: { href: "http://example.org" } }] }],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).toContain('href="http://example.org"');
  });

  it("A41 mailto supported", () => {
    const raw = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "mail",
              marks: [{ type: "link", attrs: { href: "mailto:team@example.com" } }],
            },
          ],
        },
      ],
    });
    expect(taskDescriptionToSafeHtml(raw)).toContain('href="mailto:team@example.com"');
  });

  it("A42 quotes and angle brackets in plain text escaped", () => {
    const html = taskDescriptionToSafeHtml('Say "hello" <world>');
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;world&gt;");
  });
});

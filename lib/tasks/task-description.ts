/**
 * AUFGABEN-06F2-UX1 — Task description storage, serialization, and safe rendering.
 *
 * Persistence: existing `Task.description` String? column (no schema change).
 * - Legacy plain text remains plain text.
 * - Rich content is stored as compact TipTap/ProseMirror JSON (`{ type: "doc", ... }`).
 * - Plain-text-only documents from the editor are stored as plain strings when possible.
 */

import { isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";

export type TaskDescriptionDocument = RichTextValue;

const DOC_PREFIX = '{"type":"doc"';

export function emptyTaskDescriptionDocument(): TaskDescriptionDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function documentFromStoredTaskDescription(
  stored: string | null | undefined,
): TaskDescriptionDocument {
  const parsed = parseStoredTaskDescription(stored);
  if (parsed.kind === "document") return parsed.document;
  if (parsed.kind === "plain") {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: parsed.text }] }],
    };
  }
  return emptyTaskDescriptionDocument();
}

export function isTaskDescriptionDocument(value: unknown): value is TaskDescriptionDocument {
  return isRichTextValue(value);
}

/** Parse stored Task.description into a document or plain text mode. */
export function parseStoredTaskDescription(
  stored: string | null | undefined,
): { kind: "empty" } | { kind: "document"; document: TaskDescriptionDocument } | { kind: "plain"; text: string } {
  if (stored == null || stored.trim() === "") return { kind: "empty" };
  const trimmed = stored.trim();
  if (trimmed.startsWith(DOC_PREFIX)) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTaskDescriptionDocument(parsed)) {
        return { kind: "document", document: parsed };
      }
    } catch {
      /* fall through — treat as plain text */
    }
  }
  return { kind: "plain", text: stored };
}

function documentHasRichStructure(doc: TaskDescriptionDocument): boolean {
  for (const block of doc.content) {
    const type = (block as { type: string }).type;
    if (
      type === "bulletList" ||
      type === "orderedList" ||
      type === "blockquote" ||
      type === "taskList"
    ) {
      return true;
    }
    if (block.type === "heading") return true;
    if (block.type === "paragraph" && block.content) {
      for (const inline of block.content) {
        if (inline.type === "hardBreak") return true;
        if (inline.type === "text" && inline.marks && inline.marks.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function documentPlainText(doc: TaskDescriptionDocument): string {
  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === "paragraph" && block.content) {
      for (const inline of block.content) {
        if (inline.type === "text") parts.push(inline.text);
      }
    }
  }
  return parts.join("").trim();
}

export function taskDescriptionDocumentHasContent(doc: TaskDescriptionDocument | null | undefined): boolean {
  if (!doc) return false;
  return documentPlainText(doc).length > 0 || documentHasRichStructure(doc);
}

/** Serialize editor document for Task.description column. */
export function serializeTaskDescriptionForStorage(
  doc: TaskDescriptionDocument | null | undefined,
): string | null {
  if (!doc || !taskDescriptionDocumentHasContent(doc)) return null;
  if (!documentHasRichStructure(doc)) {
    const plain = documentPlainText(doc);
    return plain || null;
  }
  return JSON.stringify(doc);
}

/** Normalize inbound description from forms/API before persistence. */
export function normalizeTaskDescriptionInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(DOC_PREFIX)) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTaskDescriptionDocument(parsed)) {
        return serializeTaskDescriptionForStorage(parsed);
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitiseHref(href: string): string {
  if (!href) return "";
  const trimmed = href.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("mailto:")
  ) {
    return escapeHtml(trimmed);
  }
  return "";
}

type InlineNode = { type: string; text?: string; marks?: MarkNode[] };
type MarkNode = { type: string; attrs?: Record<string, unknown> };
type BlockNode = { type: string; attrs?: Record<string, unknown>; content?: BlockNode[] | InlineNode[] };

function applyMarks(text: string, marks: MarkNode[] | undefined): string {
  if (!marks?.length) return text;
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong>${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "underline":
        result = `<u>${result}</u>`;
        break;
      case "strike":
        result = `<s>${result}</s>`;
        break;
      case "code":
        result = `<code>${result}</code>`;
        break;
      case "link": {
        const href = sanitiseHref(String(mark.attrs?.href ?? ""));
        if (href) {
          result = `<a href="${href}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        }
        break;
      }
    }
  }
  return result;
}

function inlineToHtml(node: InlineNode): string {
  if (node.type === "hardBreak") return "<br />";
  if (node.type !== "text") return "";
  const text = escapeHtml(node.text ?? "");
  return applyMarks(text, node.marks);
}

function inlinesToHtml(nodes: InlineNode[] | undefined): string {
  return (nodes ?? []).map(inlineToHtml).join("");
}

function blockToHtml(node: BlockNode): string {
  switch (node.type) {
    case "paragraph": {
      const inner = inlinesToHtml(node.content as InlineNode[] | undefined);
      return inner ? `<p>${inner}</p>` : "<p></p>";
    }
    case "bulletList": {
      const items = ((node.content ?? []) as BlockNode[]).map(listItemToHtml).join("");
      return `<ul>${items}</ul>`;
    }
    case "orderedList": {
      const items = ((node.content ?? []) as BlockNode[]).map(listItemToHtml).join("");
      return `<ol>${items}</ol>`;
    }
    case "taskList": {
      const items = ((node.content ?? []) as BlockNode[]).map(taskItemToHtml).join("");
      return `<ul class="task-description-checklist">${items}</ul>`;
    }
    case "listItem": {
      const inner = ((node.content ?? []) as BlockNode[]).map(blockToHtml).join("");
      return `<li>${inner}</li>`;
    }
    case "taskItem": {
      return taskItemToHtml(node);
    }
    case "blockquote": {
      const inner = ((node.content ?? []) as BlockNode[]).map(blockToHtml).join("");
      return `<blockquote>${inner}</blockquote>`;
    }
    default:
      return "";
  }
}

function listItemToHtml(node: BlockNode): string {
  const inner = ((node.content ?? []) as BlockNode[]).map(blockToHtml).join("");
  return `<li>${inner}</li>`;
}

function taskItemToHtml(node: BlockNode): string {
  const checked = node.attrs?.checked === true;
  const inner = ((node.content ?? []) as BlockNode[]).map(blockToHtml).join("");
  const checkedAttr = checked ? ' checked=""' : "";
  return `<li class="task-description-task-item" data-checked="${checked ? "true" : "false"}"><label class="task-description-task-item-label"><input type="checkbox" disabled${checkedAttr} /><span class="task-description-task-item-text">${inner}</span></label></li>`;
}

/**
 * Safe HTML for admin Task description rendering (no script, sanitized links).
 */
export function taskDescriptionToSafeHtml(stored: string | null | undefined): string {
  const parsed = parseStoredTaskDescription(stored);
  if (parsed.kind === "empty") return "";
  if (parsed.kind === "plain") return escapeHtml(parsed.text).replace(/\n/g, "<br />");
  return parsed.document.content.map((n) => blockToHtml(n as BlockNode)).join("");
}

export function storedTaskDescriptionIsEmpty(stored: string | null | undefined): boolean {
  return parseStoredTaskDescription(stored).kind === "empty";
}

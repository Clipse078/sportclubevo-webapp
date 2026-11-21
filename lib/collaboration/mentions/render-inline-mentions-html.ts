import { SCE_INLINE_MENTION_MARK_NAME } from "@/lib/collaboration/mentions/inline-mention-mark";
import {
  richTextToHtml,
  isRichTextValue,
  type RichTextValue,
  type RichTextInlineNode,
} from "@/lib/cms/rich-text";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders rich text including @mention marks for published reading view. */
export function richTextDocumentToHtmlWithMentions(
  document: unknown,
): string {
  if (!isRichTextValue(document)) {
    return "";
  }

  const enriched = normalizeMentionsForRender(document);
  return renderDoc(enriched);
}

function normalizeMentionsForRender(value: RichTextValue): RichTextValue {
  const walkInline = (nodes: unknown[]): RichTextInlineNode[] =>
    nodes.map((node) => {
      if (!node || typeof node !== "object") return node;
      const record = node as Record<string, unknown>;
      if (record.type !== "text") return node as RichTextInlineNode;
      const marks = record.marks;
      if (!Array.isArray(marks)) return node;

      const mention = marks.find(
        (m) =>
          m &&
          typeof m === "object" &&
          (m as Record<string, unknown>).type === SCE_INLINE_MENTION_MARK_NAME,
      ) as { attrs?: { label?: string; userId?: string } } | undefined;

      if (!mention?.attrs) return node as RichTextInlineNode;

      const label = String(mention.attrs.label ?? "").trim() || "Unbekannt";
      return {
        type: "text",
        text: `@${label}`,
        marks: [
          {
            type: "link",
            attrs: {
              href: `#mention-${mention.attrs.userId ?? ""}`,
              rel: "nofollow",
            },
          },
        ],
      } satisfies RichTextInlineNode;
    }) as RichTextInlineNode[];

  const walkBlocks = (blocks: RichTextValue["content"]): RichTextValue["content"] =>
    blocks.map((block) => {
      if (block.type === "paragraph" || block.type === "heading") {
        return {
          ...block,
          content: walkInline((block.content ?? []) as unknown[]),
        };
      }
      return block;
    });

  return { ...value, content: walkBlocks(value.content) };
}

function renderDoc(value: RichTextValue): string {
  return richTextToHtml(value);
}

export function mentionReadingSpanHtml(userId: string, label: string): string {
  return `<span class="sce-inline-mention" data-mention-user-id="${escapeHtml(userId)}">@${escapeHtml(label)}</span>`;
}
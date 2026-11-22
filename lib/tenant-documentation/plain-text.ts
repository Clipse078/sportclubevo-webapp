import { isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";

/** Extracts searchable plain text from a rich-text document (published content only). */
export function richTextToPlainText(value: RichTextValue | unknown): string {
  if (!isRichTextValue(value)) return "";
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") {
      parts.push(record.text);
    }
    if (Array.isArray(record.content)) {
      for (const child of record.content) walk(child);
    }
  };
  for (const block of value.content) walk(block);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
import { isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";

export function parseDraftContentJson(value: unknown): RichTextValue | null {
  if (!value || typeof value !== "object") return null;
  if (!isRichTextValue(value)) return null;
  return value;
}
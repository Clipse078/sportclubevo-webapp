import * as Y from "yjs";
import { isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";

export const TENANT_DOC_YJS_FRAGMENT = "default";

export function emptyYjsState(): Uint8Array {
  const doc = new Y.Doc();
  return Y.encodeStateAsUpdate(doc);
}

export function seedFragmentFromRichText(doc: Y.Doc, content: RichTextValue): void {
  const fragment = doc.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
  fragment.delete(0, fragment.length);
  const paragraph = new Y.XmlElement("paragraph");
  const text = richTextToPlainText(content) || " ";
  const textNode = new Y.XmlText();
  textNode.insert(0, text);
  paragraph.insert(0, [textNode]);
  fragment.insert(0, [paragraph]);
}

export function mergeYjsUpdate(
  existingState: Uint8Array | null | undefined,
  incomingUpdate: Uint8Array,
): Uint8Array {
  const doc = new Y.Doc();
  if (existingState && existingState.length > 0) {
    Y.applyUpdate(doc, existingState);
  }
  Y.applyUpdate(doc, incomingUpdate);
  return Y.encodeStateAsUpdate(doc);
}

export function diffYjsState(
  storedState: Uint8Array,
  clientStateVector: Uint8Array | null | undefined,
): Uint8Array {
  if (!clientStateVector || clientStateVector.length === 0) {
    return storedState;
  }
  const doc = new Y.Doc();
  Y.applyUpdate(doc, storedState);
  return Y.encodeStateAsUpdate(doc, clientStateVector);
}

export function richTextToPlainText(value: RichTextValue): string {
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

export function applyYjsUpdateToDoc(doc: Y.Doc, updateBase64: string) {
  const update =
    typeof atob === "function"
      ? Uint8Array.from(atob(updateBase64), (c) => c.charCodeAt(0))
      : Buffer.from(updateBase64, "base64");
  if (update.length > 0) {
    Y.applyUpdate(doc, update);
  }
}

export function yjsStateToRichTextSnapshot(state: Uint8Array): RichTextValue {
  const doc = new Y.Doc();
  if (state.length > 0) {
    Y.applyUpdate(doc, state);
  }
  const fragment = doc.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
  const lines: string[] = [];
  fragment.forEach((node) => {
    if (node instanceof Y.XmlText) {
      lines.push(node.toString());
    } else if (node instanceof Y.XmlElement) {
      const inner: string[] = [];
      node.forEach((child) => {
        if (child instanceof Y.XmlText) inner.push(child.toString());
      });
      lines.push(inner.join(""));
    }
  });
  const body = lines.join("\n").trim() || " ";
  return {
    type: "doc",
    content: body.split("\n").map((line) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: line }],
    })),
  };
}
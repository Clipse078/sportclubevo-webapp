/**
 * SCE-COMM-EVO-07 — validate, sanitise, and render structured personal signatures.
 */

import {
  MAX_PERSONAL_SIGNATURE_IMAGES,
  MAX_PERSONAL_SIGNATURE_LINKS,
  MAX_PERSONAL_SIGNATURE_NODES,
  MAX_PERSONAL_SIGNATURE_PLAIN_LENGTH,
} from "@/lib/communication/personal-signature/personal-signature-constants";
import {
  isAllowedSignatureLinkHref,
  normalizeSignatureLinkHref,
} from "@/lib/communication/personal-signature/signature-link-validation";
import type {
  PersonalSignatureAssetRef,
  PersonalSignatureContent,
  SignatureBlockNode,
  SignatureInlineNode,
  SignatureTextMark,
} from "@/lib/communication/personal-signature/signature-content-types";
import { PERSONAL_SIGNATURE_CONTENT_VERSION } from "@/lib/communication/personal-signature/signature-content-types";
import { emptyRichText, isRichTextValue, type RichTextValue } from "@/lib/cms/rich-text";

export class PersonalSignatureContentError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PersonalSignatureContentError";
  }
}

export function emptyPersonalSignatureContent(): PersonalSignatureContent {
  return {
    type: "doc",
    version: PERSONAL_SIGNATURE_CONTENT_VERSION,
    content: [{ type: "paragraph" }],
  };
}

export function isPersonalSignatureContent(value: unknown): value is PersonalSignatureContent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as PersonalSignatureContent).type === "doc" &&
    Array.isArray((value as PersonalSignatureContent).content)
  );
}

/** Legacy plain-only signatures → minimal structured doc. */
export function plainTextToSignatureContent(plain: string): PersonalSignatureContent {
  const normalized = plain.replace(/\r\n/g, "\n").trim();
  if (!normalized) return emptyPersonalSignatureContent();
  const lines = normalized.split("\n");
  const blocks: SignatureBlockNode[] = lines.map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  }));
  return {
    type: "doc",
    version: PERSONAL_SIGNATURE_CONTENT_VERSION,
    content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
  };
}

/** Accept TipTap doc without version (editor output) or full PersonalSignatureContent. */
export function coerceEditorDocToSignatureContent(raw: unknown): PersonalSignatureContent {
  if (isPersonalSignatureContent(raw)) {
    return sanitizePersonalSignatureContent(raw);
  }
  if (isRichTextValue(raw)) {
    return sanitizePersonalSignatureContent(convertRichTextToSignature(raw));
  }
  throw new PersonalSignatureContentError("MALFORMED_JSON", "Signaturformat ungültig.");
}

function convertRichTextToSignature(doc: RichTextValue): PersonalSignatureContent {
  const content: SignatureBlockNode[] = [];
  for (const node of doc.content) {
    if (node.type === "hardBreak") {
      content.push({ type: "hardBreak" });
      continue;
    }
    if (node.type === "paragraph") {
      content.push({
        type: "paragraph",
        content: (node.content ?? []) as SignatureInlineNode[],
      });
      continue;
    }
    if (node.type === "heading") {
      content.push({
        type: "paragraph",
        content: (node.content ?? []) as SignatureInlineNode[],
      });
    }
  }
  return {
    type: "doc",
    version: PERSONAL_SIGNATURE_CONTENT_VERSION,
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

function sanitiseTextMarks(marks: unknown, linkBudget: { count: number }): SignatureTextMark[] | undefined {
  if (!Array.isArray(marks) || marks.length === 0) return undefined;
  const out: SignatureTextMark[] = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    const type = (mark as { type?: string }).type;
    if (type === "bold" || type === "italic") {
      out.push({ type });
      continue;
    }
    if (type === "link") {
      const href = (mark as { attrs?: { href?: string } }).attrs?.href;
      if (!isAllowedSignatureLinkHref(href)) {
        throw new PersonalSignatureContentError(
          "UNSAFE_LINK",
          "Der Link verwendet ein nicht erlaubtes Protokoll.",
        );
      }
      linkBudget.count += 1;
      if (linkBudget.count > MAX_PERSONAL_SIGNATURE_LINKS) {
        throw new PersonalSignatureContentError(
          "TOO_MANY_LINKS",
          `Maximal ${MAX_PERSONAL_SIGNATURE_LINKS} Links erlaubt.`,
        );
      }
      out.push({
        type: "link",
        attrs: {
          href: normalizeSignatureLinkHref(href),
          target: "_blank",
          rel: "noopener noreferrer",
        },
      });
    }
  }
  return out.length > 0 ? out : undefined;
}

function sanitiseInline(node: unknown, linkBudget: { count: number }): SignatureInlineNode | null {
  if (!node || typeof node !== "object") return null;
  const type = (node as { type?: string }).type;
  if (type === "hardBreak") return { type: "hardBreak" };
  if (type !== "text") return null;
  const text = String((node as { text?: string }).text ?? "").replace(/\0/g, "");
  if (!text) return null;
  const marks = sanitiseTextMarks((node as { marks?: unknown }).marks, linkBudget);
  return marks ? { type: "text", text, marks } : { type: "text", text };
}

function sanitiseBlock(node: unknown, stats: { nodes: number; images: number }, linkBudget: { count: number }): SignatureBlockNode | null {
  if (!node || typeof node !== "object") return null;
  const type = (node as { type?: string }).type;
  stats.nodes += 1;
  if (stats.nodes > MAX_PERSONAL_SIGNATURE_NODES) {
    throw new PersonalSignatureContentError(
      "TOO_COMPLEX",
      "Die Signatur ist strukturell zu umfangreich.",
    );
  }
  if (type === "horizontalRule") {
    return { type: "horizontalRule" };
  }
  if (type === "hardBreak") {
    return { type: "hardBreak" };
  }
  if (type === "signatureImage") {
    stats.images += 1;
    if (stats.images > MAX_PERSONAL_SIGNATURE_IMAGES) {
      throw new PersonalSignatureContentError(
        "TOO_MANY_IMAGES",
        `Maximal ${MAX_PERSONAL_SIGNATURE_IMAGES} Logos erlaubt.`,
      );
    }
    const attrs = (node as { attrs?: Record<string, unknown> }).attrs ?? {};
    const attachmentId = String(attrs.attachmentId ?? "").trim();
    const altText = String(attrs.altText ?? "").trim().slice(0, 200);
    const cidKey = String(attrs.cidKey ?? attachmentId).trim().slice(0, 120);
    if (!attachmentId || !altText) {
      throw new PersonalSignatureContentError(
        "INVALID_IMAGE",
        "Logo benötigt Alt-Text und eine gültige Referenz.",
      );
    }
    return {
      type: "signatureImage",
      attrs: { attachmentId, altText, cidKey },
    };
  }
  if (type === "paragraph" || type === "heading") {
    const rawInlines = (node as { content?: unknown[] }).content ?? [];
    const content: SignatureInlineNode[] = [];
    for (const inline of rawInlines) {
      const sanitised = sanitiseInline(inline, linkBudget);
      if (sanitised) content.push(sanitised);
    }
    return { type: "paragraph", content };
  }
  return null;
}

export function sanitizePersonalSignatureContent(raw: PersonalSignatureContent): PersonalSignatureContent {
  const stats = { nodes: 0, images: 0 };
  const linkBudget = { count: 0 };
  const content: SignatureBlockNode[] = [];
  for (const block of raw.content ?? []) {
    const sanitised = sanitiseBlock(block, stats, linkBudget);
    if (sanitised) content.push(sanitised);
  }
  const doc: PersonalSignatureContent = {
    type: "doc",
    version: PERSONAL_SIGNATURE_CONTENT_VERSION,
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
  const plain = signatureContentToPlainText(doc);
  if (plain.length > MAX_PERSONAL_SIGNATURE_PLAIN_LENGTH) {
    throw new PersonalSignatureContentError(
      "SIGNATURE_TOO_LONG",
      `Signatur darf maximal ${MAX_PERSONAL_SIGNATURE_PLAIN_LENGTH} Zeichen haben.`,
    );
  }
  return doc;
}

export function signatureContentToPlainText(doc: PersonalSignatureContent | null | undefined): string {
  if (!doc?.content?.length) return "";
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    lines.push(current);
    current = "";
  };
  for (const block of doc.content) {
    if (block.type === "horizontalRule") {
      flush();
      lines.push("—");
      continue;
    }
    if (block.type === "hardBreak") {
      flush();
      continue;
    }
    if (block.type === "signatureImage") {
      flush();
      continue;
    }
    if (block.type === "paragraph") {
      for (const inline of block.content ?? []) {
        if (inline.type === "hardBreak") {
          flush();
          continue;
        }
        if (inline.type === "text") {
          let text = inline.text;
          for (const mark of inline.marks ?? []) {
            if (mark.type === "link") {
              text = `${text} (${mark.attrs.href})`;
            }
          }
          current += text;
        }
      }
      flush();
    }
  }
  return lines.join("\n").replace(/\n+$/, "").trim();
}

export function extractSignatureAssetRefs(doc: PersonalSignatureContent): PersonalSignatureAssetRef[] {
  const refs: PersonalSignatureAssetRef[] = [];
  let sortOrder = 0;
  for (const block of doc.content) {
    if (block.type === "signatureImage") {
      refs.push({
        attachmentId: block.attrs.attachmentId,
        altText: block.attrs.altText,
        cidKey: block.attrs.cidKey,
        sortOrder,
      });
      sortOrder += 1;
    }
  }
  return refs;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineToHtml(node: SignatureInlineNode): string {
  if (node.type === "hardBreak") return "<br />";
  let result = escapeHtml(node.text);
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") result = `<strong>${result}</strong>`;
    if (mark.type === "italic") result = `<em>${result}</em>`;
    if (mark.type === "link" && isAllowedSignatureLinkHref(mark.attrs.href)) {
      const href = escapeHtml(normalizeSignatureLinkHref(mark.attrs.href));
      result = `<a href="${href}" target="_blank" rel="noopener noreferrer">${result}</a>`;
    }
  }
  return result;
}

export type SignatureEmailRenderContext = {
  cidForAttachment: (attachmentId: string, cidKey: string) => string;
};

export function signatureContentToEmailHtml(
  doc: PersonalSignatureContent | null | undefined,
  ctx: SignatureEmailRenderContext,
): string {
  if (!doc?.content?.length) return "";
  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === "horizontalRule") {
      parts.push('<hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />');
      continue;
    }
    if (block.type === "hardBreak") {
      parts.push("<br />");
      continue;
    }
    if (block.type === "signatureImage") {
      const cid = ctx.cidForAttachment(block.attrs.attachmentId, block.attrs.cidKey);
      const alt = escapeHtml(block.attrs.altText);
      parts.push(
        `<p style="margin:8px 0 0;"><img src="cid:${escapeHtml(cid)}" alt="${alt}" style="max-width:240px;max-height:80px;height:auto;width:auto;" /></p>`,
      );
      continue;
    }
    if (block.type === "paragraph") {
      const inner = (block.content ?? []).map(inlineToHtml).join("");
      parts.push(
        inner
          ? `<p style="margin:0 0 4px;font-family:sans-serif;font-size:14px;line-height:1.4;">${inner}</p>`
          : `<p style="margin:0 0 4px;font-family:sans-serif;font-size:14px;">&nbsp;</p>`,
      );
    }
  }
  return parts.join("");
}

export type SignatureInAppRenderContext = {
  previewUrlForAttachment: (attachmentId: string) => string;
};

export function signatureContentToInAppHtml(
  doc: PersonalSignatureContent | null | undefined,
  ctx: SignatureInAppRenderContext,
): string {
  if (!doc?.content?.length) return "";
  const parts: string[] = [];
  for (const block of doc.content) {
    if (block.type === "horizontalRule") {
      parts.push('<hr class="my-2 border-[var(--border)]" />');
      continue;
    }
    if (block.type === "hardBreak") {
      parts.push("<br />");
      continue;
    }
    if (block.type === "signatureImage") {
      const src = escapeHtml(ctx.previewUrlForAttachment(block.attrs.attachmentId));
      const alt = escapeHtml(block.attrs.altText);
      parts.push(
        `<p class="mt-2"><img src="${src}" alt="${alt}" class="max-h-20 max-w-[240px] object-contain" loading="lazy" /></p>`,
      );
      continue;
    }
    if (block.type === "paragraph") {
      const inner = (block.content ?? []).map(inlineToHtml).join("");
      parts.push(inner ? `<p class="mb-1 text-sm">${inner}</p>` : `<p class="mb-1 text-sm">&nbsp;</p>`);
    }
  }
  return parts.join("");
}

/** Editor seed when no stored JSON exists. */
export function signatureContentForEditor(stored: unknown, legacyPlain: string | null): RichTextValue {
  if (isPersonalSignatureContent(stored)) {
    return stored as unknown as RichTextValue;
  }
  if (isRichTextValue(stored)) return stored;
  if (legacyPlain?.trim()) {
    return plainTextToSignatureContent(legacyPlain) as unknown as RichTextValue;
  }
  return emptyRichText();
}

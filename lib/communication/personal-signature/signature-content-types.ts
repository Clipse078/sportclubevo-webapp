/**
 * SCE-COMM-EVO-07 — structured personal signature document (TipTap-compatible subset).
 */

export const PERSONAL_SIGNATURE_CONTENT_VERSION = 1;

export type SignatureTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | {
      type: "link";
      attrs: { href: string; target?: string | null; rel?: string | null };
    };

export type SignatureTextNode = {
  type: "text";
  text: string;
  marks?: SignatureTextMark[];
};

export type SignatureInlineNode = SignatureTextNode | { type: "hardBreak" };

export type SignatureImageNode = {
  type: "signatureImage";
  attrs: {
    attachmentId: string;
    altText: string;
    cidKey: string;
  };
};

export type SignatureBlockNode =
  | { type: "paragraph"; content?: SignatureInlineNode[] }
  | { type: "horizontalRule" }
  | SignatureImageNode
  | { type: "hardBreak" };

export type PersonalSignatureContent = {
  type: "doc";
  version: number;
  content: SignatureBlockNode[];
};

export type PersonalSignatureAssetRef = {
  attachmentId: string;
  altText: string;
  cidKey: string;
  sortOrder: number;
};

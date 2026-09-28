/**
 * TipTap block node for signature logos (attachment reference only).
 */

import { Node, mergeAttributes } from "@tiptap/core";

export type SignatureImageAttrs = {
  attachmentId: string;
  altText: string;
  cidKey: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    signatureImage: {
      insertSignatureImage: (attrs: SignatureImageAttrs) => ReturnType;
    };
  }
}

export const SignatureImageExtension = Node.create({
  name: "signatureImage",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      attachmentId: { default: null },
      altText: { default: "" },
      cidKey: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-signature-image="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-signature-image": "true",
        class: "signature-image-block my-2 text-sm text-[var(--text-2)]",
      }),
      HTMLAttributes.altText ?? "Logo",
    ];
  },

  addCommands() {
    return {
      insertSignatureImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});

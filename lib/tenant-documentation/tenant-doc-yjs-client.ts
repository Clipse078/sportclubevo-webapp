"use client";

/**
 * Client-only Yjs entry point — all browser bundles must import Yjs through this module
 * so TipTap Collaboration and the collaboration hook share one module instance.
 */
import * as Y from "yjs";

import {
  TENANT_DOC_YJS_FRAGMENT,
  TENANT_DOC_YJS_REMOTE_ORIGIN,
} from "@/lib/tenant-documentation/tenant-doc-yjs-fragment";

export { Y };
export type { Doc as YDoc } from "yjs";

export { TENANT_DOC_YJS_FRAGMENT, TENANT_DOC_YJS_REMOTE_ORIGIN };

export function applyYjsUpdateToDoc(doc: Y.Doc, updateBase64: string): void {
  const update =
    typeof atob === "function"
      ? Uint8Array.from(atob(updateBase64), (c) => c.charCodeAt(0))
      : Buffer.from(updateBase64, "base64");
  if (update.length > 0) {
    Y.applyUpdate(doc, update, TENANT_DOC_YJS_REMOTE_ORIGIN);
  }
}

function fragmentPlainText(doc: Y.Doc): string {
  const fragment = doc.getXmlFragment(TENANT_DOC_YJS_FRAGMENT);
  const parts: string[] = [];
  fragment.forEach((node) => {
    if (node instanceof Y.XmlText) {
      parts.push(node.toString());
    } else if (node instanceof Y.XmlElement) {
      const inner: string[] = [];
      node.forEach((child) => {
        if (child instanceof Y.XmlText) inner.push(child.toString());
      });
      parts.push(inner.join(""));
    }
  });
  return parts.join("\n");
}

export function yjsFragmentPlainText(doc: Y.Doc): string {
  return fragmentPlainText(doc);
}
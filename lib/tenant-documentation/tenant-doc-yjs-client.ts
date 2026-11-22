"use client";

/**
 * Client-only Yjs entry point — all browser bundles must import Yjs through this module
 * so TipTap Collaboration and the collaboration hook share one module instance.
 */
import * as Y from "yjs";

export { Y };
export type { Doc as YDoc } from "yjs";

export { TENANT_DOC_YJS_FRAGMENT } from "@/lib/tenant-documentation/tenant-doc-yjs-fragment";

export function applyYjsUpdateToDoc(doc: Y.Doc, updateBase64: string): void {
  const update =
    typeof atob === "function"
      ? Uint8Array.from(atob(updateBase64), (c) => c.charCodeAt(0))
      : Buffer.from(updateBase64, "base64");
  if (update.length > 0) {
    Y.applyUpdate(doc, update);
  }
}